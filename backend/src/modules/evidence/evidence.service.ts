import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, inArray } from "drizzle-orm";

import { createArtifactStore } from "../../common/artifacts/artifact-store";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  applicationUsers,
  auditEvents,
  evidencePack,
  evidencePackStatusLog,
  organisationMemberships,
  organisations,
  retentionPolicies,
  roleDefinitions,
  sites,
  typeDefinition,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { VisitsService } from "../visits/visits.service";
import { renderEvidenceReportHtml } from "./evidence-report";
import { createHash, randomUUID } from "node:crypto";

const ARTIFACT_NAMESPACE = "evidence-packs";

@Injectable()
export class EvidenceService {
  private readonly artifacts = createArtifactStore();

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly visits: VisitsService,
  ) {}

  // Section 20.2's client assurance pack: RBAC matrix, retention-policy
  // report, admin-action audit-log extract, and — when from/to is given —
  // a visitor-access extract, actually queried from the live database. An
  // optional date range turns this into "produce evidence of who accessed
  // the premises for this period," the capability neither this pack nor the
  // DSAR export answered before (an auditor/regulator ask, not a DSAR
  // subject-access request).
  async generate(user: AuthenticatedUser, range?: { from?: string; to?: string }) {
    const [pendingStatus, generatingStatus, readyStatus] = await Promise.all([
      this.typeDefs.id("evidence_pack_status", "pending"),
      this.typeDefs.id("evidence_pack_status", "generating"),
      this.typeDefs.id("evidence_pack_status", "ready"),
    ]);

    const [pack] = await this.db
      .insert(evidencePack)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        requestedBy: user.userId,
        scope:
          range?.from || range?.to
            ? { generatedFor: "org-wide", from: range.from, to: range.to }
            : { generatedFor: "org-wide" },
        statusCode: pendingStatus,
      })
      .returning();

    await this.logStatus(pack.id, generatingStatus, user.userId, "generation started");

    const [rbacMatrix, retentionReport, accessLogExtract, roles, visitorAccessExtract] = await Promise.all([
      this.db.query.organisationMemberships.findMany({
        where: eq(organisationMemberships.organisationId, user.organisationId),
      }),
      this.db.query.retentionPolicies.findMany({ where: eq(retentionPolicies.organisationId, user.organisationId) }),
      // Most recent 500 in time order, so the extract is one continuous
      // stretch of the hash chain an auditor can verify.
      this.db.query.auditEvents.findMany({
        where: eq(auditEvents.organisationId, user.organisationId),
        orderBy: [desc(auditEvents.occurredAt)],
        limit: 500,
      }),
      this.db.query.roleDefinitions.findMany({ where: eq(roleDefinitions.organisationId, user.organisationId) }),
      range?.from || range?.to
        ? this.visits.searchRoster(user, { from: range.from, to: range.to, limit: 1000 }).then((r) => r.rows)
        : Promise.resolve(null),
    ]);

    const content = {
      generatedAt: new Date().toISOString(),
      organisationId: user.organisationId,
      scope:
        range?.from || range?.to ? { from: range.from ?? null, to: range.to ?? null } : { generatedFor: "org-wide" },
      rbacMatrix: { roles, organisationMemberships: rbacMatrix },
      retentionPolicyReport: retentionReport,
      accessLogExtract, // Section 9.2 rule 3's audit_event rows, verbatim — admin actions, not visitor check-ins
      visitorAccessExtract, // who was actually on the premises in the requested period, or null when no range was given
    };

    const contentBody = JSON.stringify(content, null, 2);
    const stored = await this.artifacts.writePackage(
      ARTIFACT_NAMESPACE,
      [{ name: `${pack.id}.json`, content: contentBody, contentType: "application/json" }],
      { organisationId: user.organisationId, requestedBy: user.userId },
    );

    const [updated] = await this.db
      .update(evidencePack)
      .set({ statusCode: readyStatus, generatedAt: new Date(), fileReference: stored.fileReference })
      .where(eq(evidencePack.id, pack.id))
      .returning();

    await this.logStatus(pack.id, readyStatus, user.userId, "generation complete");

    return updated;
  }

  async list(user: AuthenticatedUser) {
    return this.db.query.evidencePack.findMany({
      where: eq(evidencePack.organisationId, user.organisationId),
    });
  }

  async getById(evidencePackId: string, user: AuthenticatedUser) {
    const found = await this.db.query.evidencePack.findFirst({
      where: and(eq(evidencePack.id, evidencePackId), eq(evidencePack.organisationId, user.organisationId)),
    });
    if (!found) throw new NotFoundException("Evidence pack not found");
    return found;
  }

  /** Streams the generated pack's JSON content back for download. */
  async getContent(evidencePackId: string, user: AuthenticatedUser): Promise<Buffer> {
    const pack = await this.getById(evidencePackId, user);
    if (!pack.fileReference) throw new NotFoundException("Evidence pack has not finished generating");
    return this.artifacts.readFile(pack.fileReference, `${pack.id}.json`);
  }

  /**
   * Auditor-readable HTML view of a pack: names and labels instead of IDs,
   * plus the SHA-256 of the exact JSON the download endpoint returns.
   */
  async renderReport(evidencePackId: string, user: AuthenticatedUser): Promise<string> {
    const raw = (await this.getContent(evidencePackId, user)).toString("utf8");
    const sha256 = createHash("sha256").update(raw, "utf8").digest("hex");
    const memberships = await this.db.query.organisationMemberships.findMany({
      where: eq(organisationMemberships.organisationId, user.organisationId),
      columns: { userId: true },
    });
    const userIds = [...new Set(memberships.map((m) => m.userId))];
    const [org, types, users, siteRows] = await Promise.all([
      this.db.query.organisations.findFirst({ where: eq(organisations.id, user.organisationId) }),
      this.db.select({ id: typeDefinition.id, label: typeDefinition.label }).from(typeDefinition),
      userIds.length
        ? this.db
            .select({ id: applicationUsers.id, email: applicationUsers.email })
            .from(applicationUsers)
            .where(inArray(applicationUsers.id, userIds))
        : Promise.resolve([]),
      this.db
        .select({ id: sites.id, name: sites.name })
        .from(sites)
        .where(eq(sites.organisationId, user.organisationId)),
    ]);
    return renderEvidenceReportHtml(evidencePackId, raw, sha256, {
      organisationName: org?.tradingName || org?.legalName || "Organisation",
      typeLabels: new Map(types.map((t) => [t.id, t.label])),
      userEmails: new Map(users.map((u) => [u.id, u.email])),
      siteNames: new Map(siteRows.map((r) => [r.id, r.name])),
      timeZone: org?.defaultTimezone || "Africa/Windhoek",
    });
  }

  private async logStatus(evidencePackId: string, statusCode: string, actorId: string, reason: string) {
    await this.db.insert(evidencePackStatusLog).values({
      id: randomUUID(),
      evidencePackId,
      statusCode,
      occurredAt: new Date(),
      actorId,
      reason,
    });
  }
}
