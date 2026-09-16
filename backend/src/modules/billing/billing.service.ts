import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { createArtifactStore } from "../../common/artifacts/artifact-store";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  invoice,
  invoiceLineItem,
  organisationSubscription,
  organisationSubscriptionStatusEvents,
  paymentReconciliationLog,
  paymentTransaction,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { KybService } from "../kyb/kyb.service";
import { randomUUID } from "node:crypto";

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

const artifactStore = createArtifactStore();

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
  ) {}

  async createSubscription(organisationId: string, planCode: string, mrrAmount: string, user: AuthenticatedUser) {
    const plan = await this.typeDefs.id("subscription_plan", planCode);
    const statusCode = await this.typeDefs.id("subscription_status", "trial");

    const [sub] = await this.db
      .insert(organisationSubscription)
      .values({ id: randomUUID(), organisationId, planCode: plan, mrrAmount, statusCode })
      .returning();

    await this.db.insert(organisationSubscriptionStatusEvents).values({
      id: randomUUID(),
      subscriptionId: sub.id,
      fromStatusCode: null,
      toStatusCode: statusCode,
      actorId: user.userId,
    });

    return sub;
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

    const row = await this.db.query.organisationSubscription.findFirst({
      where: eq(organisationSubscription.id, subscriptionId),
    });
    return row ?? null;
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

    return created;
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
    return row ?? null;
  }

  async listInvoicesForOrganisation(organisationId: string) {
    return this.db.query.invoice.findMany({
      where: and(eq(invoice.organisationId, organisationId), isNull(invoice.deletedAt)),
      orderBy: desc(invoice.issuedAt),
    });
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

  async portfolioRollup() {
    const subs = await this.db.query.organisationSubscription.findMany({
      where: isNull(organisationSubscription.deletedAt),
    });
    const activeStatus = await this.typeDefs.id("subscription_status", "active");
    const activeSubs = subs.filter((s) => s.statusCode === activeStatus);
    const mrr = activeSubs.reduce((sum, s) => sum + Number(s.mrrAmount), 0);
    return { activeSubscriptionCount: activeSubs.length, mrr, arr: mrr * 12 };
  }
}
