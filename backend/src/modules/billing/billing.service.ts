import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, count, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm";

import { createArtifactStore } from "../../common/artifacts/artifact-store";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { TabularExport } from "../../common/export/tabular";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  applicationUsers,
  invoice,
  invoiceCreditNote,
  invoiceLineItem,
  organisationMemberships,
  organisationSubscription,
  organisationSubscriptionAddon,
  organisationSubscriptionAddonStatusLog,
  organisationSubscriptionSiteQuantityLog,
  organisationSubscriptionStatusEvents,
  organisations,
  paymentReconciliationLog,
  paymentTransaction,
  roleDefinitions,
  sites,
  subscriptionCatalogItem,
  typeDefinition,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { DocumentRendererService } from "../documents/document-renderer.service";
import { KybService } from "../kyb/kyb.service";
import { TemplatedEmailService } from "../notifications/templated-email.service";
import { AdumoService, adumoAmount } from "./adumo.service";
import { randomUUID } from "node:crypto";

// reviewed_by on a card payment's reconciliation row: the nil UUID marks an
// automated reconciliation (Adumo's signed response token verified server-side),
// as opposed to a platform_support reviewer confirming a proof of payment.
export const AUTOMATED_REVIEWER_ID = "00000000-0000-0000-0000-000000000000";

export interface CreateInvoiceInput {
  organisationId: string;
  amount: string;
  currencyCode?: string;
  dueAt?: string;
  lineItems: Array<{ description: string; amount: string; quantity?: number }>;
}

export interface SubmitPopInput {
  invoiceId: string;
  amount: string;
  popDocumentBase64: string;
  popDocumentName: string;
}

export interface CreateSubscriptionInput {
  organisationId: string;
  planCode: string;
  billingPeriod?: "monthly" | "annual";
  /** Codes from the single add-on catalog (`subscription_addon` domain). */
  addonCodes?: string[];
  /** Licensed sites. Defaults to the larger of the plan's included sites and the org's active sites. */
  siteQuantity?: number;
}

export type CatalogKind = "plan" | "addon";

export interface PublicCatalogItem {
  id: string;
  kind: CatalogKind;
  code: string;
  label: string;
  tagline: string;
  monthlyAmount: string;
  currencyCode: string;
  annualMonthsCharged: number;
  annualTotal: string;
  effectiveMonthlyAnnual: string;
  includedSites: number;
  /** Monthly price per site above includedSites; null when the plan cannot license extra sites. */
  extraSiteMonthlyAmount: string | null;
  features: string[];
  isFeatured: boolean;
  sortOrder: number;
}

const artifactStore = createArtifactStore();

function money(n: number): string {
  return n.toFixed(2);
}

function annualTotal(monthly: number, monthsCharged: number): number {
  return monthly * monthsCharged;
}

function effectiveMonthly(monthly: number, monthsCharged: number): number {
  return Math.round((annualTotal(monthly, monthsCharged) / 12) * 100) / 100;
}

type PlanPricing = { monthlyAmount: string; includedSites: number; extraSiteMonthlyAmount: string | null };

/** Plan line for a licensed site count: base price plus each site above the included allowance. */
export function planMonthlyForSites(plan: PlanPricing, siteQuantity: number): number {
  const extraSites = Math.max(0, siteQuantity - plan.includedSites);
  const extraPrice = plan.extraSiteMonthlyAmount === null ? 0 : Number(plan.extraSiteMonthlyAmount);
  return Number(plan.monthlyAmount) + extraSites * extraPrice;
}

// Manual EFT + Proof of Payment (POP) reconciliation — no PSP partnership
// exists yet (confirmed with George). Invoice shows Buffr Financial
// Services CC's bank details; customer pays off-platform and uploads a POP;
// platform_support manually reviews. No card data touched anywhere.
@Injectable()
export class BillingService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly kyb: KybService,
    private readonly documents: DocumentRendererService,
    private readonly templatedEmail: TemplatedEmailService,
    private readonly adumo: AdumoService,
  ) {}

  /** Public / ops catalog — one list; filter by kind when needed. */
  async listCatalog(opts?: { kind?: CatalogKind; publicOnly?: boolean }): Promise<PublicCatalogItem[]> {
    const conditions = [isNull(subscriptionCatalogItem.deletedAt)];
    if (opts?.kind) {
      conditions.push(
        eq(subscriptionCatalogItem.kindCode, await this.typeDefs.id("subscription_catalog_kind", opts.kind)),
      );
    }
    if (opts?.publicOnly) {
      conditions.push(eq(subscriptionCatalogItem.isPublic, true));
    }

    const rows = await this.db
      .select({
        id: subscriptionCatalogItem.id,
        kindCode: subscriptionCatalogItem.kindCode,
        itemCode: subscriptionCatalogItem.itemCode,
        tagline: subscriptionCatalogItem.tagline,
        monthlyAmount: subscriptionCatalogItem.monthlyAmount,
        currencyCode: subscriptionCatalogItem.currencyCode,
        annualMonthsCharged: subscriptionCatalogItem.annualMonthsCharged,
        includedSites: subscriptionCatalogItem.includedSites,
        extraSiteMonthlyAmount: subscriptionCatalogItem.extraSiteMonthlyAmount,
        featuresJson: subscriptionCatalogItem.featuresJson,
        isFeatured: subscriptionCatalogItem.isFeatured,
        isPublic: subscriptionCatalogItem.isPublic,
        sortOrder: subscriptionCatalogItem.sortOrder,
        itemLabel: typeDefinition.label,
        itemCodeStr: typeDefinition.code,
      })
      .from(subscriptionCatalogItem)
      .innerJoin(typeDefinition, eq(subscriptionCatalogItem.itemCode, typeDefinition.id))
      .where(and(...conditions))
      .orderBy(asc(subscriptionCatalogItem.sortOrder));

    const planKind = await this.typeDefs.id("subscription_catalog_kind", "plan");

    return rows.map((row) => {
      const monthly = Number(row.monthlyAmount);
      const months = row.annualMonthsCharged;
      return {
        id: row.id,
        kind: row.kindCode === planKind ? ("plan" as const) : ("addon" as const),
        code: row.itemCodeStr,
        label: row.itemLabel,
        tagline: row.tagline,
        monthlyAmount: money(monthly),
        currencyCode: row.currencyCode,
        annualMonthsCharged: months,
        annualTotal: money(annualTotal(monthly, months)),
        effectiveMonthlyAnnual: money(effectiveMonthly(monthly, months)),
        includedSites: row.includedSites,
        extraSiteMonthlyAmount: row.extraSiteMonthlyAmount === null ? null : money(Number(row.extraSiteMonthlyAmount)),
        features: Array.isArray(row.featuresJson) ? row.featuresJson : [],
        isFeatured: row.isFeatured,
        sortOrder: row.sortOrder,
      };
    });
  }

  async listPublicPricing() {
    // Frankfurt may lag catalog migrations (0032+). Never 500 the marketing page —
    // empty plans lets the website FALLBACK_PRICING kick in.
    let plans: PublicCatalogItem[] = [];
    try {
      plans = await this.listCatalog({ kind: "plan", publicOnly: true });
    } catch {
      plans = [];
    }
    return {
      billingPeriods: [
        { code: "monthly", label: "Monthly" },
        { code: "annual", label: "Annual", note: "Two months free when billed yearly" },
      ] as const,
      plans,
      // Add-ons stay in the platform catalog for ops/sales; not published on marketing.
      addons: [] as PublicCatalogItem[],
    };
  }

  /**
   * Creates a subscription from catalog prices (never trusts client amounts).
   * Add-ons are chosen from the single add-on catalog; each carries its own cost.
   */
  async createSubscription(dto: CreateSubscriptionInput, user: AuthenticatedUser) {
    const planCode = dto.planCode.trim().toLowerCase();
    const billingPeriod = dto.billingPeriod ?? "monthly";
    const addonCodes = [...new Set((dto.addonCodes ?? []).map((c) => c.trim().toLowerCase()).filter(Boolean))];

    const planKind = await this.typeDefs.id("subscription_catalog_kind", "plan");
    const addonKind = await this.typeDefs.id("subscription_catalog_kind", "addon");
    const planItemCode = await this.typeDefs.id("subscription_plan", planCode);
    const billingPeriodCode = await this.typeDefs.id("billing_period", billingPeriod);
    const statusCode = await this.typeDefs.id("subscription_status", "trial");
    const addonActiveStatus = await this.typeDefs.id("subscription_addon_status", "active");

    const planItem = await this.db.query.subscriptionCatalogItem.findFirst({
      where: and(
        eq(subscriptionCatalogItem.kindCode, planKind),
        eq(subscriptionCatalogItem.itemCode, planItemCode),
        isNull(subscriptionCatalogItem.deletedAt),
      ),
    });
    if (!planItem) {
      throw new BadRequestException(`Unknown subscription plan '${planCode}' — not in catalog`);
    }

    const addonItems = [];
    for (const code of addonCodes) {
      const itemCode = await this.typeDefs.id("subscription_addon", code);
      const row = await this.db.query.subscriptionCatalogItem.findFirst({
        where: and(
          eq(subscriptionCatalogItem.kindCode, addonKind),
          eq(subscriptionCatalogItem.itemCode, itemCode),
          isNull(subscriptionCatalogItem.deletedAt),
        ),
      });
      if (!row) {
        throw new BadRequestException(`Unknown add-on '${code}' — not in catalog`);
      }
      addonItems.push(row);
    }

    const activeSites = await this.countActiveSites(dto.organisationId);
    const siteQuantity = dto.siteQuantity ?? Math.max(planItem.includedSites, activeSites);
    await this.assertSiteQuantity(planItem, planItemCode, siteQuantity, activeSites);

    const mrrAmount = this.computeMrr(
      planMonthlyForSites(planItem, siteQuantity),
      addonItems.map((a) => Number(a.monthlyAmount)),
      billingPeriod,
      planItem.annualMonthsCharged,
    );

    const [sub] = await this.db
      .insert(organisationSubscription)
      .values({
        id: randomUUID(),
        organisationId: dto.organisationId,
        planCode: planItemCode,
        billingPeriodCode,
        mrrAmount: money(mrrAmount),
        currencyCode: planItem.currencyCode,
        statusCode,
        siteQuantity,
      })
      .returning();

    await this.db.insert(organisationSubscriptionSiteQuantityLog).values({
      id: randomUUID(),
      organisationId: dto.organisationId,
      subscriptionId: sub.id,
      fromQuantity: null,
      toQuantity: siteQuantity,
      actorId: user.userId,
      note: "Set at subscription create",
    });

    await this.db.insert(organisationSubscriptionStatusEvents).values({
      id: randomUUID(),
      subscriptionId: sub.id,
      fromStatusCode: null,
      toStatusCode: statusCode,
      actorId: user.userId,
    });

    for (const addon of addonItems) {
      const addonId = randomUUID();
      await this.db.insert(organisationSubscriptionAddon).values({
        id: addonId,
        organisationId: dto.organisationId,
        subscriptionId: sub.id,
        catalogItemId: addon.id,
        monthlyAmount: addon.monthlyAmount,
        currencyCode: addon.currencyCode,
        statusCode: addonActiveStatus,
      });
      await this.db.insert(organisationSubscriptionAddonStatusLog).values({
        id: randomUUID(),
        subscriptionAddonId: addonId,
        fromStatusCode: null,
        toStatusCode: addonActiveStatus,
        actorId: user.userId,
        note: "Attached at subscription create",
      });
    }

    return this.getSubscriptionDetail(sub.id);
  }

  /** Attach one catalog add-on to an existing subscription; recomputes MRR. */
  async attachAddon(subscriptionId: string, addonCode: string, user: AuthenticatedUser) {
    const sub = await this.requireSubscription(subscriptionId);
    const addonKind = await this.typeDefs.id("subscription_catalog_kind", "addon");
    const itemCode = await this.typeDefs.id("subscription_addon", addonCode.trim().toLowerCase());
    const catalog = await this.db.query.subscriptionCatalogItem.findFirst({
      where: and(
        eq(subscriptionCatalogItem.kindCode, addonKind),
        eq(subscriptionCatalogItem.itemCode, itemCode),
        isNull(subscriptionCatalogItem.deletedAt),
      ),
    });
    if (!catalog) throw new BadRequestException(`Unknown add-on '${addonCode}'`);

    const existing = await this.db.query.organisationSubscriptionAddon.findFirst({
      where: and(
        eq(organisationSubscriptionAddon.subscriptionId, subscriptionId),
        eq(organisationSubscriptionAddon.catalogItemId, catalog.id),
        isNull(organisationSubscriptionAddon.deletedAt),
      ),
    });
    if (existing) throw new BadRequestException(`Add-on '${addonCode}' is already attached`);

    const activeStatus = await this.typeDefs.id("subscription_addon_status", "active");
    const addonId = randomUUID();
    await this.db.insert(organisationSubscriptionAddon).values({
      id: addonId,
      organisationId: sub.organisationId,
      subscriptionId,
      catalogItemId: catalog.id,
      monthlyAmount: catalog.monthlyAmount,
      currencyCode: catalog.currencyCode,
      statusCode: activeStatus,
    });
    await this.db.insert(organisationSubscriptionAddonStatusLog).values({
      id: randomUUID(),
      subscriptionAddonId: addonId,
      fromStatusCode: null,
      toStatusCode: activeStatus,
      actorId: user.userId,
    });

    await this.recomputeSubscriptionMrr(subscriptionId);
    return this.getSubscriptionDetail(subscriptionId);
  }

  /** Soft-cancel an attached add-on and recompute MRR. */
  async detachAddon(subscriptionId: string, addonCode: string, user: AuthenticatedUser) {
    await this.requireSubscription(subscriptionId);
    const addonKind = await this.typeDefs.id("subscription_catalog_kind", "addon");
    const itemCode = await this.typeDefs.id("subscription_addon", addonCode.trim().toLowerCase());
    const catalog = await this.db.query.subscriptionCatalogItem.findFirst({
      where: and(
        eq(subscriptionCatalogItem.kindCode, addonKind),
        eq(subscriptionCatalogItem.itemCode, itemCode),
        isNull(subscriptionCatalogItem.deletedAt),
      ),
    });
    if (!catalog) throw new BadRequestException(`Unknown add-on '${addonCode}'`);

    const row = await this.db.query.organisationSubscriptionAddon.findFirst({
      where: and(
        eq(organisationSubscriptionAddon.subscriptionId, subscriptionId),
        eq(organisationSubscriptionAddon.catalogItemId, catalog.id),
        isNull(organisationSubscriptionAddon.deletedAt),
      ),
    });
    if (!row) throw new NotFoundException(`Add-on '${addonCode}' is not attached`);

    const cancelled = await this.typeDefs.id("subscription_addon_status", "cancelled");
    await this.db
      .update(organisationSubscriptionAddon)
      .set({ statusCode: cancelled, deletedAt: new Date() })
      .where(eq(organisationSubscriptionAddon.id, row.id));

    await this.db.insert(organisationSubscriptionAddonStatusLog).values({
      id: randomUUID(),
      subscriptionAddonId: row.id,
      fromStatusCode: row.statusCode,
      toStatusCode: cancelled,
      actorId: user.userId,
    });

    await this.recomputeSubscriptionMrr(subscriptionId);
    return this.getSubscriptionDetail(subscriptionId);
  }

  /** Change the licensed site count; logs the change and recomputes MRR. */
  async setSiteQuantity(subscriptionId: string, siteQuantity: number, user: AuthenticatedUser, note?: string) {
    const sub = await this.requireSubscription(subscriptionId);
    const planItem = await this.requirePlanItem(sub.planCode);
    const activeSites = await this.countActiveSites(sub.organisationId);
    await this.assertSiteQuantity(planItem, sub.planCode, siteQuantity, activeSites);

    if (siteQuantity !== sub.siteQuantity) {
      await this.db
        .update(organisationSubscription)
        .set({ siteQuantity })
        .where(eq(organisationSubscription.id, subscriptionId));
      await this.db.insert(organisationSubscriptionSiteQuantityLog).values({
        id: randomUUID(),
        organisationId: sub.organisationId,
        subscriptionId,
        fromQuantity: sub.siteQuantity,
        toQuantity: siteQuantity,
        actorId: user.userId,
        note: note?.trim() || null,
      });
      await this.recomputeSubscriptionMrr(subscriptionId);
    }
    return this.getSubscriptionDetail(subscriptionId);
  }

  /** Refuses 'active' while the org's latest KYB status isn't 'verified' — application-code gate, no DB trigger. */
  async transitionSubscriptionStatus(subscriptionId: string, statusCode: string, user: AuthenticatedUser) {
    const sub = await this.db.query.organisationSubscription.findFirst({
      where: eq(organisationSubscription.id, subscriptionId),
    });
    if (!sub) throw new NotFoundException("Subscription not found");

    const toStatusCode = await this.typeDefs.id("subscription_status", statusCode);
    const activeStatus = await this.typeDefs.id("subscription_status", "active");

    if (toStatusCode === activeStatus) {
      const verified = await this.kyb.isVerified(sub.organisationId);
      if (!verified) {
        throw new BadRequestException("Cannot activate subscription — organisation KYB is not verified");
      }
    }

    await this.db
      .update(organisationSubscription)
      .set({ statusCode: toStatusCode, kybGatePassed: toStatusCode === activeStatus })
      .where(eq(organisationSubscription.id, subscriptionId));

    await this.db.insert(organisationSubscriptionStatusEvents).values({
      id: randomUUID(),
      subscriptionId,
      fromStatusCode: sub.statusCode,
      toStatusCode,
      actorId: user.userId,
    });

    if (statusCode === "active" || statusCode === "trial") {
      const org = await this.db.query.organisations.findFirst({ where: eq(organisations.id, sub.organisationId) });
      const adminUrl = (process.env.PUBLIC_ADMIN_BASE_URL ?? "https://admin.buffrcheckpoint.com").replace(/\/$/, "");
      const recipients = await this.organisationAdminEmails(sub.organisationId);
      await Promise.all(
        recipients.map((email) =>
          this.templatedEmail.send({
            templateCode: "subscription_activated",
            organisationId: sub.organisationId,
            to: email,
            variables: {
              organisationName: org?.legalName ?? "your organisation",
              statusCode,
              adminUrl,
            },
            fallback: {
              subject: "Your Buffr Checkpoint subscription is active",
              body: `Good news — the subscription for ${org?.legalName ?? "your organisation"} is now ${statusCode}.\n\nYou can complete go-live and start visitor check-in from the admin console:\n${adminUrl}`,
            },
          }),
        ),
      );
    }

    return this.getSubscriptionDetail(subscriptionId);
  }

  async createInvoice(dto: CreateInvoiceInput) {
    const statusCode = await this.typeDefs.id("invoice_status", "sent");
    const invoiceNumber = `BC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const [created] = await this.db
      .insert(invoice)
      .values({
        id: randomUUID(),
        organisationId: dto.organisationId,
        invoiceNumber,
        amount: dto.amount,
        currencyCode: dto.currencyCode ?? "NAD",
        statusCode,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      })
      .returning();

    if (dto.lineItems.length) {
      await this.db.insert(invoiceLineItem).values(
        dto.lineItems.map((item) => ({
          id: randomUUID(),
          invoiceId: created.id,
          description: item.description,
          amount: item.amount,
          quantity: item.quantity ?? 1,
        })),
      );
    }

    await this.notifyInvoiceIssued(created.id).catch(() => undefined);
    return created;
  }

  async sendInvoiceReminder(invoiceId: string) {
    const detail = await this.getInvoiceById(invoiceId);
    const org = await this.db.query.organisations.findFirst({ where: eq(organisations.id, detail.organisationId) });
    const adminBase = (process.env.PUBLIC_ADMIN_BASE_URL ?? "https://admin.buffrcheckpoint.com").replace(/\/$/, "");
    const invoiceUrl = `${adminBase}/dashboard/billing?invoice=${detail.id}`;
    const recipients = await this.organisationAdminEmails(detail.organisationId);
    await Promise.all(
      recipients.map((email) =>
        this.templatedEmail.send({
          templateCode: "invoice_reminder",
          organisationId: detail.organisationId,
          to: email,
          variables: {
            invoiceNumber: detail.invoiceNumber,
            organisationName: org?.legalName ?? "your organisation",
            amount: String(detail.amount),
            currencyCode: detail.currencyCode,
            dueAt: detail.dueAt ? new Date(detail.dueAt).toISOString().slice(0, 10) : "On receipt",
            invoiceUrl,
          },
          fallback: {
            subject: `Reminder: invoice ${detail.invoiceNumber} is unpaid`,
            body: `This is a reminder that invoice ${detail.invoiceNumber} remains unpaid.\n\nAmount due: ${detail.amount} ${detail.currencyCode}\nView invoice: ${invoiceUrl}`,
          },
        }),
      ),
    );
    return { ok: true, emailed: recipients.length };
  }

  async renderInvoiceDocument(invoiceId: string, organisationId?: string, format: "html" | "pdf" = "pdf") {
    const detail = await this.getInvoiceById(invoiceId, organisationId);
    const org = await this.db.query.organisations.findFirst({ where: eq(organisations.id, detail.organisationId) });
    const adminBase = (process.env.PUBLIC_ADMIN_BASE_URL ?? "https://admin.buffrcheckpoint.com").replace(/\/$/, "");
    const input = {
      invoiceNumber: detail.invoiceNumber,
      organisationName: org?.legalName ?? "Customer",
      issuedAt: detail.issuedAt ? new Date(detail.issuedAt) : new Date(),
      dueAt: detail.dueAt ? new Date(detail.dueAt) : null,
      currencyCode: detail.currencyCode,
      amount: String(detail.amount),
      lineItems: (detail.lineItems ?? []).map((li: { description: string; quantity: number; amount: string }) => ({
        description: li.description,
        quantity: Number(li.quantity) || 1,
        amount: String(li.amount),
      })),
      invoiceUrl: `${adminBase}/dashboard/billing?invoice=${detail.id}`,
    };
    if (format === "html") {
      return {
        contentType: "text/html; charset=utf-8",
        filename: `${detail.invoiceNumber}.html`,
        content: Buffer.from(this.documents.renderInvoiceHtml(input), "utf8"),
      };
    }
    return {
      contentType: "application/pdf",
      filename: `${detail.invoiceNumber}.pdf`,
      content: this.documents.renderInvoicePdf(input),
    };
  }

  async renderReceiptDocument(invoiceId: string, organisationId?: string, format: "html" | "pdf" = "pdf") {
    const detail = await this.getInvoiceById(invoiceId, organisationId);
    const org = await this.db.query.organisations.findFirst({ where: eq(organisations.id, detail.organisationId) });
    const adminBase = (process.env.PUBLIC_ADMIN_BASE_URL ?? "https://admin.buffrcheckpoint.com").replace(/\/$/, "");
    const receiptNumber = `R-${detail.invoiceNumber}`;
    const input = {
      receiptNumber,
      invoiceNumber: detail.invoiceNumber,
      organisationName: org?.legalName ?? "Customer",
      paidAt: new Date(),
      currencyCode: detail.currencyCode,
      amount: String(detail.amount),
      paymentMethodLabel: "Bank transfer (EFT)",
      receiptUrl: `${adminBase}/dashboard/billing?invoice=${detail.id}`,
    };
    if (format === "html") {
      return {
        contentType: "text/html; charset=utf-8",
        filename: `${receiptNumber}.html`,
        content: Buffer.from(this.documents.renderReceiptHtml(input), "utf8"),
      };
    }
    return {
      contentType: "application/pdf",
      filename: `${receiptNumber}.pdf`,
      content: this.documents.renderReceiptPdf(input),
    };
  }

  // Explicit `?? null` — see kyb.service.ts's getLatestForOrganisation for
  // why: Drizzle's findFirst() resolves undefined on no match, and an
  // undefined controller return sends an empty body, which breaks every
  // caller's `.json()` parse for any organisation with no subscription yet.
  async getSubscriptionForOrganisation(organisationId: string) {
    const row = await this.db.query.organisationSubscription.findFirst({
      where: and(
        eq(organisationSubscription.organisationId, organisationId),
        isNull(organisationSubscription.deletedAt),
      ),
      orderBy: desc(organisationSubscription.startedAt),
    });
    if (!row) return null;
    return this.getSubscriptionDetail(row.id);
  }

  async getSubscriptionDetail(subscriptionId: string) {
    const sub = await this.requireSubscription(subscriptionId);
    const planCode = (await this.typeDefs.codeById(sub.planCode)) ?? sub.planCode;
    const planLabelRow = await this.db.query.typeDefinition.findFirst({ where: eq(typeDefinition.id, sub.planCode) });
    const planItem = await this.db.query.subscriptionCatalogItem.findFirst({
      where: and(eq(subscriptionCatalogItem.itemCode, sub.planCode), isNull(subscriptionCatalogItem.deletedAt)),
    });
    const activeSiteCount = await this.countActiveSites(sub.organisationId);
    const billingPeriod = (await this.typeDefs.codeById(sub.billingPeriodCode)) ?? "monthly";
    const status = (await this.typeDefs.codeById(sub.statusCode)) ?? sub.statusCode;

    const addons = await this.db
      .select({
        id: organisationSubscriptionAddon.id,
        catalogItemId: organisationSubscriptionAddon.catalogItemId,
        monthlyAmount: organisationSubscriptionAddon.monthlyAmount,
        currencyCode: organisationSubscriptionAddon.currencyCode,
        statusCode: organisationSubscriptionAddon.statusCode,
        startedAt: organisationSubscriptionAddon.startedAt,
        itemCode: typeDefinition.code,
        itemLabel: typeDefinition.label,
      })
      .from(organisationSubscriptionAddon)
      .innerJoin(subscriptionCatalogItem, eq(organisationSubscriptionAddon.catalogItemId, subscriptionCatalogItem.id))
      .innerJoin(typeDefinition, eq(subscriptionCatalogItem.itemCode, typeDefinition.id))
      .where(
        and(
          eq(organisationSubscriptionAddon.subscriptionId, subscriptionId),
          isNull(organisationSubscriptionAddon.deletedAt),
        ),
      )
      .orderBy(asc(typeDefinition.sortOrder));

    return {
      id: sub.id,
      organisationId: sub.organisationId,
      planCode,
      planLabel: planLabelRow?.label ?? planCode,
      siteQuantity: sub.siteQuantity,
      activeSiteCount,
      includedSites: planItem?.includedSites ?? 1,
      extraSiteMonthlyAmount:
        planItem?.extraSiteMonthlyAmount == null ? null : money(Number(planItem.extraSiteMonthlyAmount)),
      billingPeriod,
      mrrAmount: sub.mrrAmount,
      currencyCode: sub.currencyCode,
      statusCode: status,
      kybGatePassed: sub.kybGatePassed,
      startedAt: sub.startedAt,
      currentPeriodEnd: sub.currentPeriodEnd,
      addons: addons.map((a) => ({
        id: a.id,
        code: a.itemCode,
        label: a.itemLabel,
        monthlyAmount: a.monthlyAmount,
        currencyCode: a.currencyCode,
        statusCode: a.statusCode,
        startedAt: a.startedAt,
      })),
    };
  }

  async listInvoicesForOrganisation(organisationId: string) {
    const rows = await this.db.query.invoice.findMany({
      where: and(eq(invoice.organisationId, organisationId), isNull(invoice.deletedAt)),
      orderBy: desc(invoice.issuedAt),
    });
    // statusKey (draft/sent/paid/overdue/void) lets the customer page decide
    // whether an invoice is still payable without resolving type ids itself.
    return Promise.all(rows.map(async (row) => ({ ...row, statusKey: await this.typeDefs.codeById(row.statusCode) })));
  }

  async getInvoiceById(invoiceId: string, organisationId?: string) {
    const row = await this.db.query.invoice.findFirst({
      where: organisationId
        ? and(eq(invoice.id, invoiceId), eq(invoice.organisationId, organisationId), isNull(invoice.deletedAt))
        : and(eq(invoice.id, invoiceId), isNull(invoice.deletedAt)),
    });
    if (!row) throw new NotFoundException("Invoice not found");

    const lineItems = await this.db.query.invoiceLineItem.findMany({
      where: eq(invoiceLineItem.invoiceId, invoiceId),
    });
    const payments = await this.db.query.paymentTransaction.findMany({
      where: eq(paymentTransaction.invoiceId, invoiceId),
      orderBy: desc(paymentTransaction.occurredAt),
    });
    const paymentIds = payments.map((p) => p.id);
    const reconciliationLog =
      paymentIds.length === 0
        ? []
        : await this.db.query.paymentReconciliationLog.findMany({
            where: inArray(paymentReconciliationLog.paymentTransactionId, paymentIds),
            orderBy: desc(paymentReconciliationLog.reconciledAt),
          });

    return {
      ...row,
      lineItems,
      payments,
      reconciliationLog,
    };
  }

  /** Customer- or ops-submitted POP — inserts a payment_transaction at pending_review. Never touches card data. */
  async submitProofOfPayment(dto: SubmitPopInput, user: AuthenticatedUser) {
    const invoiceRow = await this.db.query.invoice.findFirst({ where: eq(invoice.id, dto.invoiceId) });
    if (!invoiceRow) throw new NotFoundException("Invoice not found");
    // The invoice id arrives in the body, so TenantScopeGuard cannot check it:
    // a customer may only attach proof of payment to its own organisation's
    // invoice (a support-session token carries the target organisation).
    if (invoiceRow.organisationId !== user.organisationId) {
      throw new ForbiddenException("Invoice belongs to another organisation");
    }

    const stored = await artifactStore.writePackage(
      "payment-pop",
      [{ name: dto.popDocumentName, content: Buffer.from(dto.popDocumentBase64, "base64") }],
      { invoiceId: dto.invoiceId, submittedBy: user.userId },
    );

    const statusCode = await this.typeDefs.id("payment_status", "pending_review");
    const paymentMethodCode = await this.typeDefs.id("payment_method", "bank_transfer");

    const [txn] = await this.db
      .insert(paymentTransaction)
      .values({
        id: randomUUID(),
        organisationId: invoiceRow.organisationId,
        invoiceId: invoiceRow.id,
        amount: dto.amount,
        currencyCode: invoiceRow.currencyCode,
        statusCode,
        paymentMethodCode,
        popDocumentReference: stored.fileReference,
        submittedBy: user.userId,
      })
      .returning();

    await this.notifyPopReceived(invoiceRow, dto.amount, user).catch(() => undefined);
    return txn;
  }

  /** Streams the stored proof-of-payment document back for staff review, same pattern as KybService.getDocument. */
  async getPopDocument(paymentTransactionId: string) {
    const row = await this.db.query.paymentTransaction.findFirst({
      where: eq(paymentTransaction.id, paymentTransactionId),
    });
    if (!row?.popDocumentReference) {
      throw new NotFoundException("No proof-of-payment document on file");
    }

    const manifestBuffer = await artifactStore.readFile(row.popDocumentReference, "manifest.json");
    const manifest = JSON.parse(manifestBuffer.toString("utf8")) as { files: Array<{ name: string }> };
    const documentFile = manifest.files.find((f) => f.name !== "manifest.json");
    if (!documentFile) {
      throw new NotFoundException("No proof-of-payment document on file");
    }

    const content = await artifactStore.readFile(row.popDocumentReference, documentFile.name);
    return { name: documentFile.name, content };
  }

  async listPendingReview() {
    const statusCode = await this.typeDefs.id("payment_status", "pending_review");
    return this.db.query.paymentTransaction.findMany({
      where: eq(paymentTransaction.statusCode, statusCode),
      orderBy: desc(paymentTransaction.occurredAt),
    });
  }

  /** The required reconciliation artifact — every transaction leaves pending_review through here. */
  async reviewPayment(
    paymentTransactionId: string,
    decision: "confirmed" | "rejected",
    user: AuthenticatedUser,
    note?: string,
  ) {
    const txn = await this.db.query.paymentTransaction.findFirst({
      where: eq(paymentTransaction.id, paymentTransactionId),
    });
    if (!txn) throw new NotFoundException("Payment transaction not found");

    const statusCode = await this.typeDefs.id("payment_status", decision);
    await this.db.update(paymentTransaction).set({ statusCode }).where(eq(paymentTransaction.id, paymentTransactionId));

    await this.db.insert(paymentReconciliationLog).values({
      id: randomUUID(),
      paymentTransactionId,
      reviewedBy: user.userId,
      decision,
      note,
    });

    if (decision === "confirmed" && txn.invoiceId) {
      const paidStatus = await this.typeDefs.id("invoice_status", "paid");
      await this.db.update(invoice).set({ statusCode: paidStatus }).where(eq(invoice.id, txn.invoiceId));
      await this.notifyPaymentConfirmed(txn.invoiceId, String(txn.amount), txn.currencyCode).catch(() => undefined);
    }

    if (decision === "rejected" && txn.invoiceId) {
      await this.notifyPopRejected(txn.invoiceId, String(txn.amount), txn.currencyCode, note).catch(() => undefined);
    }

    const row = await this.db.query.paymentTransaction.findFirst({
      where: eq(paymentTransaction.id, paymentTransactionId),
    });
    return row ?? null;
  }

  async reviewPaymentBulk(
    paymentTransactionIds: string[],
    decision: "confirmed" | "rejected",
    user: AuthenticatedUser,
    note?: string,
  ) {
    const failed: Array<{ id: string; reason: string }> = [];
    let updated = 0;
    for (const id of paymentTransactionIds) {
      try {
        await this.reviewPayment(id, decision, user, note);
        updated += 1;
      } catch (err) {
        failed.push({ id, reason: err instanceof Error ? err.message : "Failed" });
      }
    }
    return { requested: paymentTransactionIds.length, updated, failed };
  }

  /** Whether card payments are configured on this deployment (Adumo credentials present). */
  cardPaymentsEnabled() {
    return { enabled: this.adumo.isConfigured() };
  }

  /**
   * Starts a card payment for an unpaid invoice of the caller's own
   * organisation. The amount always comes from the server-side invoice (never
   * the client): invoice amount less confirmed payments and credit notes.
   * Inserts a payment_transaction at 'initiated' and returns the signed form
   * post for Adumo's hosted page; its id is the merchant reference.
   */
  async startCardPayment(invoiceId: string, user: AuthenticatedUser) {
    const row = await this.db.query.invoice.findFirst({
      where: and(eq(invoice.id, invoiceId), isNull(invoice.deletedAt)),
    });
    if (!row) throw new NotFoundException("Invoice not found");
    if (row.organisationId !== user.organisationId)
      throw new ForbiddenException("Invoice belongs to another organisation");

    const [paidStatus, voidStatus, confirmedStatus] = await Promise.all([
      this.typeDefs.id("invoice_status", "paid"),
      this.typeDefs.id("invoice_status", "void"),
      this.typeDefs.id("payment_status", "confirmed"),
    ]);
    if (row.statusCode === paidStatus || row.statusCode === voidStatus) {
      throw new ConflictException("This invoice is not open for payment");
    }

    const [payments, credits] = await Promise.all([
      this.db.query.paymentTransaction.findMany({
        where: and(eq(paymentTransaction.invoiceId, invoiceId), eq(paymentTransaction.statusCode, confirmedStatus)),
      }),
      this.db.query.invoiceCreditNote.findMany({ where: eq(invoiceCreditNote.invoiceId, invoiceId) }),
    ]);
    const settled = [...payments, ...credits].reduce((sum, p) => sum + Number(p.amount), 0);
    const outstanding = Math.round((Number(row.amount) - settled) * 100) / 100;
    if (outstanding <= 0) throw new ConflictException("Nothing is outstanding on this invoice");

    const [initiatedStatus, cardMethod] = await Promise.all([
      this.typeDefs.id("payment_status", "initiated"),
      this.typeDefs.id("payment_method", "card"),
    ]);
    const paymentId = randomUUID();
    const amount = adumoAmount(outstanding);
    const checkout = this.adumo.buildCheckout(paymentId, amount, `Buffr Checkpoint invoice ${row.invoiceNumber}`);
    await this.db.insert(paymentTransaction).values({
      id: paymentId,
      organisationId: row.organisationId,
      invoiceId: row.id,
      amount,
      currencyCode: row.currencyCode,
      statusCode: initiatedStatus,
      paymentMethodCode: cardMethod,
      submittedBy: user.userId,
    });
    return { paymentTransactionId: paymentId, invoiceId: row.id, amount, currencyCode: row.currencyCode, ...checkout };
  }

  /**
   * Single entry point for Adumo results: the browser return (relayed by the
   * admin app) and the server-to-server notification both land here. Trusts
   * only the verified _RESPONSE_TOKEN: signature, merchant, reference (our
   * payment id) and amount must all match. The status change is a
   * conditional update from 'initiated', so a result is applied exactly once
   * even when the redirect and the webhook arrive together.
   */
  async handleAdumoResult(fields: Record<string, unknown>) {
    const token = typeof fields._RESPONSE_TOKEN === "string" ? fields._RESPONSE_TOKEN : undefined;
    const claims = this.adumo.verifyResponseToken(token);

    const txn = await this.db.query.paymentTransaction.findFirst({ where: eq(paymentTransaction.id, claims.mref) });
    if (!txn) throw new NotFoundException("Payment not found");
    if (adumoAmount(claims.amount) !== adumoAmount(String(txn.amount))) {
      throw new BadRequestException("Payment amount does not match the invoice payment");
    }

    const [initiatedStatus, confirmedStatus, failedStatus] = await Promise.all([
      this.typeDefs.id("payment_status", "initiated"),
      this.typeDefs.id("payment_status", "confirmed"),
      this.typeDefs.id("payment_status", "failed"),
    ]);
    const succeeded = claims.result === 0 || claims.result === 1;
    const posted = (key: string) => (typeof fields[key] === "string" ? (fields[key] as string).slice(0, 255) : null);
    const maskedPan = posted("_PANHASHED");

    const updated = await this.db
      .update(paymentTransaction)
      .set({
        statusCode: succeeded ? confirmedStatus : failedStatus,
        processorTransactionIndex: claims.transactionIndex,
        processorStatus: posted("_STATUS"),
        processorResultCode: String(claims.result),
        // Keep only first 6 and last 4 digits even if a longer value is posted.
        cardMaskedPan:
          maskedPan && /^\d{6}.*\d{4}$/.test(maskedPan) ? `${maskedPan.slice(0, 6)}******${maskedPan.slice(-4)}` : null,
      })
      .where(and(eq(paymentTransaction.id, txn.id), eq(paymentTransaction.statusCode, initiatedStatus)))
      .returning({ id: paymentTransaction.id });

    if (updated.length === 0) {
      // Already applied by the other channel (redirect or webhook).
      const current = await this.db.query.paymentTransaction.findFirst({ where: eq(paymentTransaction.id, txn.id) });
      return {
        status: current?.statusCode === confirmedStatus ? "succeeded" : "failed",
        invoiceId: txn.invoiceId,
        duplicate: true,
      };
    }

    await this.db.insert(paymentReconciliationLog).values({
      id: randomUUID(),
      paymentTransactionId: txn.id,
      reviewedBy: AUTOMATED_REVIEWER_ID,
      decision: succeeded ? "confirmed" : "rejected",
      note: `Adumo card payment ${succeeded ? "approved" : "not approved"} (result ${claims.result}, status ${posted("_STATUS") ?? "unknown"}); transaction index ${claims.transactionIndex}; response token verified`,
    });

    if (succeeded && txn.invoiceId) {
      const paidStatus = await this.typeDefs.id("invoice_status", "paid");
      await this.db.update(invoice).set({ statusCode: paidStatus }).where(eq(invoice.id, txn.invoiceId));
      await this.notifyPaymentConfirmed(txn.invoiceId, String(txn.amount), txn.currencyCode).catch(() => undefined);
    }

    return { status: succeeded ? "succeeded" : "failed", invoiceId: txn.invoiceId, duplicate: false };
  }

  /**
   * Payment register for ops (CSV/XLSX): every payment row with organisation,
   * invoice, method, status, processor result and its latest reconciliation
   * decision. Card rows carry only the masked PAN and Adumo's transaction index.
   */
  async paymentRegister(input: { from?: string; to?: string } = {}): Promise<TabularExport> {
    const conditions = [];
    if (input.from) conditions.push(gte(paymentTransaction.occurredAt, new Date(input.from)));
    if (input.to) conditions.push(lte(paymentTransaction.occurredAt, new Date(input.to)));
    const payments = await this.db.query.paymentTransaction.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: desc(paymentTransaction.occurredAt),
      limit: 20_000,
    });
    const invoiceIds = [...new Set(payments.map((p) => p.invoiceId).filter((id): id is string => Boolean(id)))];
    const orgIds = [...new Set(payments.map((p) => p.organisationId))];
    const paymentIds = payments.map((p) => p.id);
    const [invoices, orgs, recon] = await Promise.all([
      invoiceIds.length ? this.db.query.invoice.findMany({ where: inArray(invoice.id, invoiceIds) }) : [],
      orgIds.length ? this.db.query.organisations.findMany({ where: inArray(organisations.id, orgIds) }) : [],
      paymentIds.length
        ? this.db.query.paymentReconciliationLog.findMany({
            where: inArray(paymentReconciliationLog.paymentTransactionId, paymentIds),
            orderBy: desc(paymentReconciliationLog.reconciledAt),
          })
        : [],
    ]);
    const invoiceNumber = new Map(invoices.map((i) => [i.id, i.invoiceNumber]));
    const orgName = new Map(orgs.map((o) => [o.id, o.tradingName || o.legalName]));
    const latestRecon = new Map<string, (typeof recon)[number]>();
    for (const r of recon) if (!latestRecon.has(r.paymentTransactionId)) latestRecon.set(r.paymentTransactionId, r);
    const code = async (id: string) => (await this.typeDefs.codeById(id)) ?? id;
    const rows = await Promise.all(
      payments.map(async (p) => {
        const r = latestRecon.get(p.id);
        return [
          p.occurredAt.toISOString(),
          orgName.get(p.organisationId) ?? p.organisationId,
          p.invoiceId ? (invoiceNumber.get(p.invoiceId) ?? p.invoiceId) : null,
          Number(p.amount),
          p.currencyCode,
          await code(p.paymentMethodCode),
          await code(p.statusCode),
          p.processorStatus ?? null,
          p.cardMaskedPan ?? null,
          p.processorTransactionIndex ?? null,
          r ? r.decision : null,
          r ? r.reconciledAt.toISOString() : null,
        ] as (string | number | null)[];
      }),
    );
    return {
      headers: [
        "occurred_at",
        "organisation",
        "invoice_number",
        "amount",
        "currency",
        "method",
        "status",
        "processor_status",
        "card_masked_pan",
        "processor_transaction_index",
        "reconciliation_decision",
        "reconciled_at",
      ],
      rows,
    };
  }

  async portfolioRollup() {
    const subs = await this.db.query.organisationSubscription.findMany({
      where: isNull(organisationSubscription.deletedAt),
    });
    const activeStatus = await this.typeDefs.id("subscription_status", "active");
    const activeSubs = subs.filter((s) => s.statusCode === activeStatus);
    const mrr = activeSubs.reduce((sum, s) => sum + Number(s.mrrAmount), 0);
    return { activeSubscriptionCount: activeSubs.length, mrr, arr: mrr * 12 };
  }

  private computeMrr(
    planMonthly: number,
    addonMonthlies: number[],
    billingPeriod: "monthly" | "annual",
    annualMonthsCharged: number,
  ): number {
    const listMonthly = planMonthly + addonMonthlies.reduce((s, n) => s + n, 0);
    if (billingPeriod === "annual") {
      return effectiveMonthly(listMonthly, annualMonthsCharged);
    }
    return Math.round(listMonthly * 100) / 100;
  }

  private async requirePlanItem(planItemCode: string) {
    const planKind = await this.typeDefs.id("subscription_catalog_kind", "plan");
    const planItem = await this.db.query.subscriptionCatalogItem.findFirst({
      where: and(
        eq(subscriptionCatalogItem.kindCode, planKind),
        eq(subscriptionCatalogItem.itemCode, planItemCode),
        isNull(subscriptionCatalogItem.deletedAt),
      ),
    });
    if (!planItem) {
      throw new BadRequestException("Subscription plan is missing from catalog");
    }
    return planItem;
  }

  private async countActiveSites(organisationId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: count() })
      .from(sites)
      .where(and(eq(sites.organisationId, organisationId), isNull(sites.deletedAt)));
    return Number(row?.n ?? 0);
  }

  private async assertSiteQuantity(
    planItem: PlanPricing,
    planItemCode: string,
    siteQuantity: number,
    activeSites: number,
  ) {
    if (!Number.isInteger(siteQuantity) || siteQuantity < 1) {
      throw new BadRequestException("Site quantity must be a whole number of at least 1");
    }
    if (planItem.extraSiteMonthlyAmount === null && siteQuantity > planItem.includedSites) {
      const label = (await this.db.query.typeDefinition.findFirst({ where: eq(typeDefinition.id, planItemCode) }))
        ?.label;
      throw new BadRequestException(
        `The ${label ?? "selected"} plan covers ${planItem.includedSites} site${planItem.includedSites === 1 ? "" : "s"}. Choose Network or Assure to license more.`,
      );
    }
    if (siteQuantity < activeSites) {
      throw new BadRequestException(
        `This organisation has ${activeSites} active sites. Archive sites before licensing fewer than that.`,
      );
    }
  }

  private async recomputeSubscriptionMrr(subscriptionId: string) {
    const sub = await this.requireSubscription(subscriptionId);
    const planItem = await this.requirePlanItem(sub.planCode);

    const activeAddons = await this.db.query.organisationSubscriptionAddon.findMany({
      where: and(
        eq(organisationSubscriptionAddon.subscriptionId, subscriptionId),
        isNull(organisationSubscriptionAddon.deletedAt),
      ),
    });

    const period = ((await this.typeDefs.codeById(sub.billingPeriodCode)) ?? "monthly") as "monthly" | "annual";
    const mrr = this.computeMrr(
      planMonthlyForSites(planItem, sub.siteQuantity),
      activeAddons.map((a) => Number(a.monthlyAmount)),
      period,
      planItem.annualMonthsCharged,
    );

    await this.db
      .update(organisationSubscription)
      .set({ mrrAmount: money(mrr) })
      .where(eq(organisationSubscription.id, subscriptionId));
  }

  private async requireSubscription(subscriptionId: string) {
    const sub = await this.db.query.organisationSubscription.findFirst({
      where: and(eq(organisationSubscription.id, subscriptionId), isNull(organisationSubscription.deletedAt)),
    });
    if (!sub) throw new NotFoundException("Subscription not found");
    return sub;
  }

  private async organisationAdminEmails(organisationId: string): Promise<string[]> {
    const memberships = await this.db.query.organisationMemberships.findMany({
      where: and(eq(organisationMemberships.organisationId, organisationId), isNull(organisationMemberships.deletedAt)),
    });
    if (memberships.length === 0) return [];
    const roleRows = await this.db.query.roleDefinitions.findMany({
      where: inArray(
        roleDefinitions.id,
        memberships.map((m) => m.roleId),
      ),
    });
    const adminRoleIds = new Set<string>();
    for (const role of roleRows) {
      const code = await this.db.query.typeDefinition.findFirst({ where: eq(typeDefinition.id, role.roleCode) });
      if (code && (code.code === "owner_operator" || code.code === "system_administrator")) {
        adminRoleIds.add(role.id);
      }
    }
    const adminUserIds = memberships.filter((m) => adminRoleIds.has(m.roleId)).map((m) => m.userId);
    if (adminUserIds.length === 0) return [];
    const users = await this.db.query.applicationUsers.findMany({
      where: and(inArray(applicationUsers.id, adminUserIds), isNull(applicationUsers.deletedAt)),
    });
    return users.map((u) => u.email);
  }

  private async notifyInvoiceIssued(invoiceId: string) {
    const detail = await this.getInvoiceById(invoiceId);
    const org = await this.db.query.organisations.findFirst({ where: eq(organisations.id, detail.organisationId) });
    const adminBase = (process.env.PUBLIC_ADMIN_BASE_URL ?? "https://admin.buffrcheckpoint.com").replace(/\/$/, "");
    const invoiceUrl = `${adminBase}/dashboard/billing?invoice=${detail.id}`;
    const doc = await this.renderInvoiceDocument(invoiceId, undefined, "pdf");
    const recipients = await this.organisationAdminEmails(detail.organisationId);
    await Promise.all(
      recipients.map((email) =>
        this.templatedEmail.send({
          templateCode: "invoice_issued",
          organisationId: detail.organisationId,
          to: email,
          variables: {
            invoiceNumber: detail.invoiceNumber,
            organisationName: org?.legalName ?? "your organisation",
            amount: String(detail.amount),
            currencyCode: detail.currencyCode,
            dueAt: detail.dueAt ? new Date(detail.dueAt).toISOString().slice(0, 10) : "On receipt",
            invoiceUrl,
          },
          fallback: {
            subject: `Invoice ${detail.invoiceNumber} from Buffr Checkpoint`,
            body: `Invoice ${detail.invoiceNumber} is ready.\n\nAmount due: ${detail.amount} ${detail.currencyCode}\nDownload / view: ${invoiceUrl}\n\nPay by EFT and upload proof of payment in Admin → Billing.`,
          },
          attachments: [
            {
              filename: doc.filename,
              contentBase64: doc.content.toString("base64"),
              contentType: doc.contentType,
            },
          ],
        }),
      ),
    );
  }

  private async notifyPopReceived(invoiceRow: typeof invoice.$inferSelect, amount: string, user: AuthenticatedUser) {
    const org = await this.db.query.organisations.findFirst({ where: eq(organisations.id, invoiceRow.organisationId) });
    const opsInbox = TemplatedEmailService.resolveOpsInbox();
    const opsBase = (process.env.PUBLIC_OPS_BASE_URL ?? "https://ops.buffrcheckpoint.com").replace(/\/$/, "");
    const submitterEmail = (await this.lookupUserEmail(user.userId)) ?? "";
    if (submitterEmail) {
      await this.templatedEmail.send({
        templateCode: "pop_received_ack",
        organisationId: invoiceRow.organisationId,
        to: submitterEmail,
        variables: {
          invoiceNumber: invoiceRow.invoiceNumber,
          amount,
          currencyCode: invoiceRow.currencyCode,
        },
        fallback: {
          subject: "We received your proof of payment",
          body: `We received proof of payment for invoice ${invoiceRow.invoiceNumber} (${amount} ${invoiceRow.currencyCode}).\n\nOur finance team will reconcile it against the bank statement.`,
        },
      });
    }
    if (opsInbox) {
      await this.templatedEmail.send({
        templateCode: "pop_received_ops",
        organisationId: invoiceRow.organisationId,
        to: opsInbox,
        variables: {
          invoiceNumber: invoiceRow.invoiceNumber,
          organisationName: org?.legalName ?? invoiceRow.organisationId,
          amount,
          currencyCode: invoiceRow.currencyCode,
          submittedByEmail: submitterEmail || user.userId,
          opsBillingUrl: `${opsBase}/organisations/${invoiceRow.organisationId}`,
        },
        fallback: {
          subject: `POP uploaded: ${invoiceRow.invoiceNumber}`,
          body: `Proof of payment uploaded for ${org?.legalName ?? "org"} / ${invoiceRow.invoiceNumber} (${amount} ${invoiceRow.currencyCode}).`,
        },
      });
    }
  }

  private async notifyPopRejected(invoiceId: string, amount: string, currencyCode: string, note?: string) {
    const detail = await this.getInvoiceById(invoiceId);
    const adminBase = (process.env.PUBLIC_ADMIN_BASE_URL ?? "https://admin.buffrcheckpoint.com").replace(/\/$/, "");
    const invoiceUrl = `${adminBase}/dashboard/billing?invoice=${detail.id}`;
    const recipients = await this.organisationAdminEmails(detail.organisationId);
    const noteText = note?.trim() || "The proof of payment could not be matched. Please resubmit.";
    await Promise.all(
      recipients.map((email) =>
        this.templatedEmail.send({
          templateCode: "pop_rejected",
          organisationId: detail.organisationId,
          to: email,
          variables: {
            invoiceNumber: detail.invoiceNumber,
            note: noteText,
            invoiceUrl,
          },
          fallback: {
            subject: "Proof of payment could not be confirmed",
            body: `We could not confirm the proof of payment for invoice ${detail.invoiceNumber}.\n\n${noteText}\n\n${invoiceUrl}`,
          },
        }),
      ),
    );
  }

  private async notifyPaymentConfirmed(invoiceId: string, amount: string, currencyCode: string) {
    const detail = await this.getInvoiceById(invoiceId);
    const adminBase = (process.env.PUBLIC_ADMIN_BASE_URL ?? "https://admin.buffrcheckpoint.com").replace(/\/$/, "");
    const receiptUrl = `${adminBase}/dashboard/billing?invoice=${detail.id}`;
    const doc = await this.renderReceiptDocument(invoiceId, undefined, "pdf");
    const recipients = await this.organisationAdminEmails(detail.organisationId);
    await Promise.all(
      recipients.flatMap((email) => [
        this.templatedEmail.send({
          templateCode: "payment_confirmed",
          organisationId: detail.organisationId,
          to: email,
          variables: {
            invoiceNumber: detail.invoiceNumber,
            amount,
            currencyCode,
          },
          fallback: {
            subject: `Payment confirmed for invoice ${detail.invoiceNumber}`,
            body: `Payment for invoice ${detail.invoiceNumber} (${amount} ${currencyCode}) has been confirmed.`,
          },
        }),
        this.templatedEmail.send({
          templateCode: "receipt_issued",
          organisationId: detail.organisationId,
          to: email,
          variables: {
            invoiceNumber: detail.invoiceNumber,
            amount,
            currencyCode,
            receiptUrl,
          },
          fallback: {
            subject: `Receipt for invoice ${detail.invoiceNumber}`,
            body: `Please find your receipt for invoice ${detail.invoiceNumber} (${amount} ${currencyCode}).\n\nDownload: ${receiptUrl}`,
          },
          attachments: [
            {
              filename: doc.filename,
              contentBase64: doc.content.toString("base64"),
              contentType: doc.contentType,
            },
          ],
        }),
      ]),
    );
  }

  private async lookupUserEmail(userId: string): Promise<string | null> {
    const user = await this.db.query.applicationUsers.findFirst({ where: eq(applicationUsers.id, userId) });
    return user?.email ?? null;
  }
}
