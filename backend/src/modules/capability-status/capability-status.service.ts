import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { organisationCapabilityEnablement, platformCapabilityApprovals, typeDefinition } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";

// Public vocabulary is deliberately narrower than the internal
// capability_status_value domain — see Section 4a.7 (v0.4 correction).
export type PublicCapabilityStatusValue = "not_available" | "targeted" | "live";

export interface PublicCapabilityStatusEntry {
  capabilityCode: string;
  status: PublicCapabilityStatusValue;
  updatedAt: string;
}

// The exact minimal shape the public API and website badge consume —
// evidenceReference, confirmedBy, and internal status history never appear
// here (Section 4a.7).
export interface PublicCapabilityStatusResponse {
  diginamVerification: PublicCapabilityStatusValue;
  nationalEidNfc: PublicCapabilityStatusValue;
  nfcBadgeCheckIn: PublicCapabilityStatusValue;
  ussd: PublicCapabilityStatusValue;
  qrInvitationCheckIn: PublicCapabilityStatusValue;
  smsContactConfirmation: PublicCapabilityStatusValue;
}

/** Capabilities that inherit platform status when no org row exists. */
const ORG_OPT_OUT_DEFAULT_LIVE = new Set(["nfc_badge_checkin", "qr_invitation_checkin"]);

const PUBLIC_RESPONSE_KEYS: Record<string, keyof PublicCapabilityStatusResponse> = {
  diginam_verification: "diginamVerification",
  national_eid_nfc: "nationalEidNfc",
  nfc_badge_checkin: "nfcBadgeCheckIn",
  ussd: "ussd",
  qr_invitation_checkin: "qrInvitationCheckIn",
  sms_contact_confirmation: "smsContactConfirmation",
};

export interface OrganisationCapabilityEnablementEntry {
  capabilityCode: string;
  statusCode: string;
  enabledAt: string | null;
  configurationReference: string | null;
  updatedAt: string;
}

export interface UpdateOrganisationCapabilityEnablementInput {
  capabilityCode: string;
  enabled: boolean;
  configurationReference?: string;
}

export interface UpdatePlatformCapabilityStatusInput {
  capabilityCode: string; // 'diginam_verification' | 'national_eid_nfc' | 'nfc_badge_checkin' | 'ussd'
  status: string; // internal capability_status_value code, capability-specific vocabulary
  publicStatus: PublicCapabilityStatusValue;
  evidenceReference: string;
}

@Injectable()
export class CapabilityStatusService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  // Section 11.6's GET /public/capability-status — the website's badge
  // reads this instead of any page hardcoding "live"/"targeted". Returns
  // ONLY public_display_status, never internal status, evidence
  // references, or approver identity (Section 4a.7).
  async listPublic(): Promise<PublicCapabilityStatusResponse> {
    const rows = await this.db.query.platformCapabilityApprovals.findMany();
    const response: PublicCapabilityStatusResponse = {
      diginamVerification: "not_available",
      nationalEidNfc: "not_available",
      nfcBadgeCheckIn: "not_available",
      ussd: "not_available",
      qrInvitationCheckIn: "not_available",
      smsContactConfirmation: "not_available",
    };
    await Promise.all(
      rows.map(async (row) => {
        const [capability, publicStatus] = await Promise.all([
          this.db.query.typeDefinition.findFirst({ where: eq(typeDefinition.id, row.capabilityCode) }),
          this.db.query.typeDefinition.findFirst({ where: eq(typeDefinition.id, row.publicDisplayStatus) }),
        ]);
        const key = capability?.code ? PUBLIC_RESPONSE_KEYS[capability.code] : undefined;
        if (key) {
          response[key] = (publicStatus?.code as PublicCapabilityStatusValue) ?? "not_available";
        }
      }),
    );
    return response;
  }

  /** Platform status intersected with tenant enablement — kiosk/admin honest gating. */
  async listEffectiveForOrganisation(user: AuthenticatedUser): Promise<PublicCapabilityStatusResponse> {
    const platform = await this.listPublic();
    const orgRows = await this.db.query.organisationCapabilityEnablement.findMany({
      where: eq(organisationCapabilityEnablement.organisationId, user.organisationId),
    });

    const orgByCapabilityId = new Map(orgRows.map((row) => [row.capabilityCode, row]));
    const capabilityRows = await this.db.query.typeDefinition.findMany({
      where: eq(typeDefinition.domain, "capability_code"),
    });
    const capabilityIdByCode = new Map(capabilityRows.map((row) => [row.code, row.id]));

    const effective: PublicCapabilityStatusResponse = { ...platform };

    for (const [capabilityCode, responseKey] of Object.entries(PUBLIC_RESPONSE_KEYS)) {
      if (platform[responseKey] !== "live") continue;

      const capabilityId = capabilityIdByCode.get(capabilityCode);
      const orgRow = capabilityId ? orgByCapabilityId.get(capabilityId) : undefined;

      if (orgRow) {
        const orgStatus = await this.typeDefs.codeById(orgRow.statusCode);
        if (orgStatus === "suspended" || orgStatus === "not_started") {
          effective[responseKey] = "not_available";
        }
        continue;
      }

      if (!ORG_OPT_OUT_DEFAULT_LIVE.has(capabilityCode)) {
        effective[responseKey] = "not_available";
      }
    }

    return effective;
  }

  async listOrganisationEnablement(user: AuthenticatedUser): Promise<OrganisationCapabilityEnablementEntry[]> {
    const rows = await this.db.query.organisationCapabilityEnablement.findMany({
      where: eq(organisationCapabilityEnablement.organisationId, user.organisationId),
    });

    return Promise.all(
      rows.map(async (row) => ({
        capabilityCode: (await this.typeDefs.codeById(row.capabilityCode)) ?? row.capabilityCode,
        statusCode: (await this.typeDefs.codeById(row.statusCode)) ?? row.statusCode,
        enabledAt: row.enabledAt?.toISOString() ?? null,
        configurationReference: row.configurationReference,
        updatedAt: row.updatedAt.toISOString(),
      })),
    );
  }

  async upsertOrganisationEnablement(input: UpdateOrganisationCapabilityEnablementInput, user: AuthenticatedUser) {
    const capabilityCode = await this.typeDefs.id("capability_code", input.capabilityCode);
    const statusCode = await this.typeDefs.id(
      "capability_status_value",
      input.enabled ? "approved" : "suspended",
    );
    const now = new Date();

    const existing = await this.db.query.organisationCapabilityEnablement.findFirst({
      where: and(
        eq(organisationCapabilityEnablement.organisationId, user.organisationId),
        eq(organisationCapabilityEnablement.capabilityCode, capabilityCode),
      ),
    });

    if (existing) {
      const [updated] = await this.db
        .update(organisationCapabilityEnablement)
        .set({
          statusCode,
          enabledAt: input.enabled ? now : null,
          enabledBy: input.enabled ? user.userId : null,
          configurationReference: input.configurationReference ?? existing.configurationReference,
          updatedAt: now,
        })
        .where(eq(organisationCapabilityEnablement.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(organisationCapabilityEnablement)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        capabilityCode,
        statusCode,
        enabledAt: input.enabled ? now : null,
        enabledBy: input.enabled ? user.userId : null,
        configurationReference: input.configurationReference ?? null,
        updatedAt: now,
      })
      .returning();

    return created;
  }

  // Section 4a.7: marking the public status 'live' requires evidenceReference
  // and a real platform_support actor — never a content-team copy edit and
  // never a tenant-role action. The permission check (CAPABILITY_STATUS_MANAGE,
  // platform_support only) happens at the controller/guard layer; this
  // method enforces the evidence requirement, since that's a business rule.
  async update(input: UpdatePlatformCapabilityStatusInput, user: AuthenticatedUser) {
    if (input.publicStatus === "live" && !input.evidenceReference.trim()) {
      throw new BadRequestException(
        "Marking a capability's public status 'live' requires evidenceReference (Section 4a.7) — a role check alone is not enough.",
      );
    }
    if (user.userId === undefined) {
      throw new ForbiddenException("No authenticated actor");
    }

    const [capabilityCode, statusCode, publicDisplayStatus] = await Promise.all([
      this.typeDefs.id("capability_code", input.capabilityCode),
      this.typeDefs.id("capability_status_value", input.status),
      this.typeDefs.id("public_capability_status_value", input.publicStatus),
    ]);

    const existing = await this.db.query.platformCapabilityApprovals.findFirst({
      where: eq(platformCapabilityApprovals.capabilityCode, capabilityCode),
    });
    if (!existing) {
      throw new NotFoundException(`No platform_capability_status row for '${input.capabilityCode}' — seed it first`);
    }

    const now = new Date();

    // Dual-approval (buffrcheckpoint.md §7901: "Only an internal Platform
    // Support/Compliance process with dual approval should be able to mark
    // an integration as live" — the schema previously had only one
    // approver column). Non-'live' transitions stay single-approval;
    // marking 'live' requires a second, distinct approver before
    // publicDisplayStatus actually flips.
    if (input.publicStatus !== "live") {
      const [updated] = await this.db
        .update(platformCapabilityApprovals)
        .set({
          statusCode,
          publicDisplayStatus,
          evidenceReference: input.evidenceReference,
          approvedBy: user.userId,
          approvedAt: now,
          secondaryApprovedBy: null,
          secondaryApprovedAt: null,
          updatedAt: now,
        })
        .where(eq(platformCapabilityApprovals.id, existing.id))
        .returning();
      return updated;
    }

    const isSecondDistinctApprover =
      existing.approvedBy &&
      existing.approvedBy !== user.userId &&
      existing.evidenceReference === input.evidenceReference &&
      existing.statusCode === statusCode;

    if (isSecondDistinctApprover) {
      const [updated] = await this.db
        .update(platformCapabilityApprovals)
        .set({
          statusCode,
          publicDisplayStatus, // only flips to 'live' once both approvals are in
          evidenceReference: input.evidenceReference,
          secondaryApprovedBy: user.userId,
          secondaryApprovedAt: now,
          updatedAt: now,
        })
        .where(eq(platformCapabilityApprovals.id, existing.id))
        .returning();
      return updated;
    }

    // First approval (or a different user/evidence restarting the request)
    // — record it, but do NOT flip publicDisplayStatus to 'live' yet.
    const [updated] = await this.db
      .update(platformCapabilityApprovals)
      .set({
        statusCode,
        evidenceReference: input.evidenceReference,
        approvedBy: user.userId,
        approvedAt: now,
        secondaryApprovedBy: null,
        secondaryApprovedAt: null,
        updatedAt: now,
      })
      .where(eq(platformCapabilityApprovals.id, existing.id))
      .returning();

    return updated;
  }
}
