import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { PersonalDataProtectionService } from "../../common/data-protection/personal-data-protection.service";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { crmActivityLog, crmContact, crmDeal, crmDealStatusEvents, organisations, typeDefinition } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";

export interface CreateContactInput {
  organisationId: string;
  name: string;
  email?: string;
  phone?: string;
  roleTitle?: string;
  isPrimary?: boolean;
}

export interface UpdateContactInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  roleTitle?: string | null;
  isPrimary?: boolean;
}

export interface CreateDealInput {
  organisationId?: string;
  prospectName?: string;
  stageCode: string;
  expectedMrr?: string;
  expectedCloseDate?: string;
}

@Injectable()
export class CrmService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly dataProtection: PersonalDataProtectionService,
  ) {}

  async createContact(dto: CreateContactInput) {
    const [row] = await this.db
      .insert(crmContact)
      .values({
        id: randomUUID(),
        organisationId: dto.organisationId,
        contactNameProtected: this.dataProtection.encrypt(dto.name),
        contactEmailProtected: dto.email ? this.dataProtection.encrypt(dto.email) : null,
        contactPhoneProtected: dto.phone ? this.dataProtection.encrypt(dto.phone) : null,
        roleTitle: dto.roleTitle,
        isPrimary: dto.isPrimary ?? false,
      })
      .returning();
    return row;
  }

  async listContacts(organisationId: string) {
    const rows = await this.db.query.crmContact.findMany({
      where: and(eq(crmContact.organisationId, organisationId), isNull(crmContact.deletedAt)),
    });
    return rows.map((row) => this.revealContact(row));
  }

  async getContact(contactId: string) {
    const row = await this.db.query.crmContact.findFirst({
      where: and(eq(crmContact.id, contactId), isNull(crmContact.deletedAt)),
    });
    if (!row) throw new NotFoundException("Contact not found");
    return this.revealContact(row);
  }

  async updateContact(contactId: string, dto: UpdateContactInput, user: AuthenticatedUser) {
    const existing = await this.db.query.crmContact.findFirst({
      where: and(eq(crmContact.id, contactId), isNull(crmContact.deletedAt)),
    });
    if (!existing) throw new NotFoundException("Contact not found");

    const patch: Partial<typeof crmContact.$inferInsert> = {};
    if (dto.name !== undefined) patch.contactNameProtected = this.dataProtection.encrypt(dto.name);
    if (dto.email !== undefined) {
      patch.contactEmailProtected = dto.email ? this.dataProtection.encrypt(dto.email) : null;
    }
    if (dto.phone !== undefined) {
      patch.contactPhoneProtected = dto.phone ? this.dataProtection.encrypt(dto.phone) : null;
    }
    if (dto.roleTitle !== undefined) patch.roleTitle = dto.roleTitle;
    if (dto.isPrimary !== undefined) patch.isPrimary = dto.isPrimary;

    await this.db.update(crmContact).set(patch).where(eq(crmContact.id, contactId));

    const activityTypeCode = await this.typeDefs.id("crm_activity_type", "note");
    await this.db.insert(crmActivityLog).values({
      id: randomUUID(),
      organisationId: existing.organisationId,
      actorId: user.userId,
      activityTypeCode,
      note: `Updated contact ${contactId}`,
    });

    return this.getContact(contactId);
  }

  private revealContact(row: typeof crmContact.$inferSelect) {
    return {
      ...row,
      name: this.dataProtection.decrypt(row.contactNameProtected as never),
      email: row.contactEmailProtected ? this.dataProtection.decrypt(row.contactEmailProtected as never) : null,
      phone: row.contactPhoneProtected ? this.dataProtection.decrypt(row.contactPhoneProtected as never) : null,
    };
  }

  async createDeal(dto: CreateDealInput, user: AuthenticatedUser) {
    const stageCode = await this.typeDefs.id("crm_deal_stage", dto.stageCode);
    const [deal] = await this.db
      .insert(crmDeal)
      .values({
        id: randomUUID(),
        organisationId: dto.organisationId,
        prospectName: dto.prospectName,
        stageCode,
        expectedMrr: dto.expectedMrr,
        expectedCloseDate: dto.expectedCloseDate,
        ownerId: user.userId,
      })
      .returning();

    await this.db.insert(crmDealStatusEvents).values({
      id: randomUUID(),
      dealId: deal.id,
      fromStageCode: null,
      toStageCode: stageCode,
      actorId: user.userId,
    });

    return deal;
  }

  async listDeals() {
    return this.db.query.crmDeal.findMany({ where: isNull(crmDeal.deletedAt), orderBy: desc(crmDeal.id) });
  }

  async listDealsForOrganisation(organisationId: string) {
    return this.db.query.crmDeal.findMany({
      where: and(eq(crmDeal.organisationId, organisationId), isNull(crmDeal.deletedAt)),
      orderBy: desc(crmDeal.id),
    });
  }

  async getDealById(dealId: string) {
    const deal = await this.db.query.crmDeal.findFirst({ where: eq(crmDeal.id, dealId) });
    if (!deal) throw new NotFoundException("Deal not found");
    return deal;
  }

  /** Stage-transition timeline for one deal — captured on every transitionDealStage() call, never surfaced per-deal before this. */
  async dealStageHistory(dealId: string) {
    return this.db.query.crmDealStatusEvents.findMany({
      where: eq(crmDealStatusEvents.dealId, dealId),
      orderBy: desc(crmDealStatusEvents.occurredAt),
    });
  }

  /**
   * Expected MRR summed per pipeline stage, computed in SQL rather than by
   * pulling every deal into the page and reducing there (which is what
   * crm/page.tsx did, and which quietly breaks the moment the deal list is
   * paginated). Stage rows with no deals are included at zero so the funnel
   * shows its gaps.
   */
  async pipelineValueByStage() {
    const [stages, rows] = await Promise.all([
      this.db.query.typeDefinition.findMany({
        where: and(eq(typeDefinition.domain, "crm_deal_stage"), isNull(typeDefinition.deletedAt)),
        orderBy: typeDefinition.sortOrder,
      }),
      this.db
        .select({
          stageCode: crmDeal.stageCode,
          dealCount: count(),
          expectedMrr: sql<string>`coalesce(sum(${crmDeal.expectedMrr}), 0)`.as("expected_mrr"),
        })
        .from(crmDeal)
        .where(isNull(crmDeal.deletedAt))
        .groupBy(crmDeal.stageCode),
    ]);

    const byStage = new Map(rows.map((r) => [r.stageCode, r]));
    return stages.map((stage) => {
      const row = byStage.get(stage.id);
      return {
        stageId: stage.id,
        stageCode: stage.code,
        stageLabel: stage.label,
        dealCount: row?.dealCount ?? 0,
        expectedMrr: Number(row?.expectedMrr ?? 0),
        currencyCode: "NAD",
      };
    });
  }

  /**
   * Activity timeline for one deal. crm_activity_log is organisation-scoped
   * with no deal_id column, so this is the deal's organisation's activity, not
   * activity filed against the deal itself — the caller surfaces that
   * distinction rather than implying a precision the schema doesn't have. A
   * prospect deal with no organisation has no activity to show, so its
   * timeline is the stage history alone.
   */
  async dealActivityTimeline(dealId: string) {
    const deal = await this.getDealById(dealId);
    if (!deal.organisationId) {
      return { scope: "deal_has_no_organisation" as const, organisationId: null, activity: [] };
    }
    const rows = await this.db
      .select({
        id: crmActivityLog.id,
        activityType: typeDefinition.code,
        activityLabel: typeDefinition.label,
        note: crmActivityLog.note,
        actorId: crmActivityLog.actorId,
        occurredAt: crmActivityLog.occurredAt,
      })
      .from(crmActivityLog)
      .leftJoin(typeDefinition, eq(crmActivityLog.activityTypeCode, typeDefinition.id))
      .where(eq(crmActivityLog.organisationId, deal.organisationId))
      .orderBy(desc(crmActivityLog.occurredAt))
      .limit(50);

    return { scope: "organisation" as const, organisationId: deal.organisationId, activity: rows };
  }

  async transitionDealStage(dealId: string, stageCode: string, user: AuthenticatedUser, note?: string) {
    const deal = await this.db.query.crmDeal.findFirst({ where: eq(crmDeal.id, dealId) });
    if (!deal) throw new NotFoundException("Deal not found");

    const toStageCode = await this.typeDefs.id("crm_deal_stage", stageCode);
    await this.db.update(crmDeal).set({ stageCode: toStageCode }).where(eq(crmDeal.id, dealId));
    await this.db.insert(crmDealStatusEvents).values({
      id: randomUUID(),
      dealId,
      fromStageCode: deal.stageCode,
      toStageCode,
      actorId: user.userId,
      note,
    });

    const row = await this.db.query.crmDeal.findFirst({ where: eq(crmDeal.id, dealId) });
    return row ?? null;
  }

  async logActivity(organisationId: string, activityType: string, note: string, user: AuthenticatedUser) {
    const activityTypeCode = await this.typeDefs.id("crm_activity_type", activityType);
    const [row] = await this.db
      .insert(crmActivityLog)
      .values({ id: randomUUID(), organisationId, actorId: user.userId, activityTypeCode, note })
      .returning();
    return row;
  }

  async listActivity(organisationId: string) {
    return this.db.query.crmActivityLog.findMany({
      where: eq(crmActivityLog.organisationId, organisationId),
      orderBy: desc(crmActivityLog.occurredAt),
    });
  }

  async setLifecycleStage(organisationId: string, stageCode: string) {
    const org = await this.db.query.organisations.findFirst({ where: eq(organisations.id, organisationId) });
    if (!org) throw new NotFoundException("Organisation not found");
    const lifecycleStageCode = await this.typeDefs.id("crm_lifecycle_stage", stageCode);
    await this.db.update(organisations).set({ lifecycleStageCode }).where(eq(organisations.id, organisationId));
    const row = await this.db.query.organisations.findFirst({ where: eq(organisations.id, organisationId) });
    return row ?? null;
  }
}
