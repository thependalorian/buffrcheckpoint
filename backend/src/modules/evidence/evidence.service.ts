import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  auditEvents,
  evidencePack,
  evidencePackStatusLog,
  organisationMemberships,
  retentionPolicies,
  roleDefinitions,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

// v0.4 correction (Section 4a.7 / hardening-pass point 2): evidence packs
// can contain sensitive tenant data (RBAC assignments, audit-log extracts).
// The required target architecture is:
//   evidence pack -> encrypted object storage -> tenant-specific path ->
//   short-lived signed download link -> audit event -> retention/deletion
//   lifecycle.
// This scaffolding pass has no cloud storage credentials configured, so it
// cannot honestly claim that architecture is built — writing to local disk
// below is the disclosed interim state, not a stand-in presented as done.
// This directory is gitignored and must never hold real production PII;
// only synthetic/dev-org content until object storage replaces it.
// TODO(object-storage): replace writeFile below with an upload to an
// S3-compatible encrypted bucket, replace fileReference with a short-lived
// signed URL issued per request (not a stored permanent path), and emit an
// audit_event on every signed-link issuance — not just on generation.
const OUTPUT_DIR = join(process.cwd(), "generated-evidence-packs");

@Injectable()
export class EvidenceService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  // Section 20.2's client assurance pack, in miniature: RBAC matrix,
  // retention-policy report, and access-log extract, actually queried from
  // the live database — not a template with fields left blank.
  async generate(user: AuthenticatedUser) {
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
        scope: { generatedFor: "org-wide" },
        statusCode: pendingStatus,
      })
      .returning();

    await this.logStatus(pack.id, generatingStatus, user.userId, "generation started");

    const [rbacMatrix, retentionReport, accessLogExtract, roles] = await Promise.all([
      this.db.query.organisationMemberships.findMany({
        where: eq(organisationMemberships.organisationId, user.organisationId),
      }),
      this.db.query.retentionPolicies.findMany({ where: eq(retentionPolicies.organisationId, user.organisationId) }),
      this.db.query.auditEvents.findMany({
        where: eq(auditEvents.organisationId, user.organisationId),
        limit: 500,
      }),
      this.db.query.roleDefinitions.findMany({ where: eq(roleDefinitions.organisationId, user.organisationId) }),
    ]);

    const content = {
      generatedAt: new Date().toISOString(),
      organisationId: user.organisationId,
      rbacMatrix: { roles, organisationMemberships: rbacMatrix },
      retentionPolicyReport: retentionReport,
      accessLogExtract, // Section 9.2 rule 3's audit_event rows, verbatim
    };

    // Tenant-scoped path even in this interim local-disk implementation —
    // the eventual object-storage path structure (tenant-specific path per
    // the architecture above) should not be a bigger change than swapping
    // the write target.
    const tenantDir = join(OUTPUT_DIR, user.organisationId);
    await mkdir(tenantDir, { recursive: true });
    const fileName = `${pack.id}.json`;
    const filePath = join(tenantDir, fileName);
    await writeFile(filePath, JSON.stringify(content, null, 2), "utf-8");

    const [updated] = await this.db
      .update(evidencePack)
      .set({ statusCode: readyStatus, generatedAt: new Date(), fileReference: filePath })
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
