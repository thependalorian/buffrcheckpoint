import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  hostNotificationEscalationPolicies,
  hostNotificationEscalationPolicyVersions,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import type { CreateEscalationPolicyDto, CreateEscalationPolicyVersionDto } from "./dto/host-notification-escalation.dto";

@Injectable()
export class HostNotificationEscalationService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  async createPolicy(dto: CreateEscalationPolicyDto, user: AuthenticatedUser) {
    const visitorCategoryCode = dto.visitorCategoryCode
      ? await this.typeDefs.id("visitor_type", dto.visitorCategoryCode)
      : null;

    const [created] = await this.db
      .insert(hostNotificationEscalationPolicies)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        siteId: dto.siteId ?? null,
        visitorCategoryCode,
        policyName: dto.policyName ?? null,
      })
      .returning();
    return created;
  }

  async listPolicies(user: AuthenticatedUser) {
    return this.db.query.hostNotificationEscalationPolicies.findMany({
      where: and(
        eq(hostNotificationEscalationPolicies.organisationId, user.organisationId),
        isNull(hostNotificationEscalationPolicies.deletedAt),
      ),
    });
  }

  async getPolicy(policyId: string, user: AuthenticatedUser) {
    const found = await this.db.query.hostNotificationEscalationPolicies.findFirst({
      where: and(
        eq(hostNotificationEscalationPolicies.id, policyId),
        eq(hostNotificationEscalationPolicies.organisationId, user.organisationId),
        isNull(hostNotificationEscalationPolicies.deletedAt),
      ),
    });
    if (!found) throw new NotFoundException("Escalation policy not found");
    return found;
  }

  async listVersions(policyId: string, user: AuthenticatedUser) {
    await this.getPolicy(policyId, user);
    return this.db.query.hostNotificationEscalationPolicyVersions.findMany({
      where: and(
        eq(hostNotificationEscalationPolicyVersions.escalationPolicyId, policyId),
        isNull(hostNotificationEscalationPolicyVersions.deletedAt),
      ),
      orderBy: [desc(hostNotificationEscalationPolicyVersions.versionNumber)],
    });
  }

  async createVersion(policyId: string, dto: CreateEscalationPolicyVersionDto, user: AuthenticatedUser) {
    await this.getPolicy(policyId, user);
    const draftStatus = await this.typeDefs.id("configuration_version_status", "draft");
    const escalationActionCode = await this.typeDefs.id(
      "host_notification_escalation_action",
      dto.escalationActionCode,
    );
    const latest = await this.latestVersionRow(policyId);
    const versionNumber = (latest?.versionNumber ?? 0) + 1;

    const [created] = await this.db
      .insert(hostNotificationEscalationPolicyVersions)
      .values({
        id: randomUUID(),
        escalationPolicyId: policyId,
        versionNumber,
        waitSeconds: dto.waitSeconds ?? 300,
        escalationActionCode,
        alternateRecipientReference: dto.alternateRecipientReference ?? null,
        statusCode: draftStatus,
      })
      .returning();
    return created;
  }

  async publishVersion(policyId: string, versionId: string, user: AuthenticatedUser) {
    await this.getPolicy(policyId, user);
    const version = await this.getVersionRow(policyId, versionId);
    const [publishedStatus, retiredStatus, draftStatus] = await Promise.all([
      this.typeDefs.id("configuration_version_status", "published"),
      this.typeDefs.id("configuration_version_status", "retired"),
      this.typeDefs.id("configuration_version_status", "draft"),
    ]);

    if (version.statusCode !== draftStatus) {
      throw new ConflictException("Only draft versions can be published");
    }

    const now = new Date();
    const priorPublished = await this.db.query.hostNotificationEscalationPolicyVersions.findMany({
      where: and(
        eq(hostNotificationEscalationPolicyVersions.escalationPolicyId, policyId),
        eq(hostNotificationEscalationPolicyVersions.statusCode, publishedStatus),
        isNull(hostNotificationEscalationPolicyVersions.deletedAt),
      ),
    });

    for (const prior of priorPublished) {
      await this.db
        .update(hostNotificationEscalationPolicyVersions)
        .set({ statusCode: retiredStatus, effectiveUntil: now })
        .where(eq(hostNotificationEscalationPolicyVersions.id, prior.id));
    }

    const [published] = await this.db
      .update(hostNotificationEscalationPolicyVersions)
      .set({
        statusCode: publishedStatus,
        publishedAt: now,
        effectiveFrom: now,
        approvedBy: user.userId,
      })
      .where(eq(hostNotificationEscalationPolicyVersions.id, versionId))
      .returning();

    return published;
  }

  /** Site + visitor category override → org default. Returns published version. */
  async resolveEffectivePolicy(
    organisationId: string,
    siteId: string,
    visitorCategoryCodeId: string,
  ) {
    const publishedStatus = await this.typeDefs.id("configuration_version_status", "published");

    const candidates = await this.db.query.hostNotificationEscalationPolicies.findMany({
      where: and(
        eq(hostNotificationEscalationPolicies.organisationId, organisationId),
        isNull(hostNotificationEscalationPolicies.deletedAt),
      ),
    });

    const ranked = candidates
      .map((policy) => {
        let score = 0;
        if (policy.siteId === siteId) score += 2;
        else if (policy.siteId === null) score += 1;
        else return null;

        if (policy.visitorCategoryCode === visitorCategoryCodeId) score += 2;
        else if (policy.visitorCategoryCode === null) score += 1;
        else return null;

        return { policy, score };
      })
      .filter((row): row is { policy: (typeof candidates)[number]; score: number } => row !== null)
      .sort((a, b) => b.score - a.score);

    const best = ranked[0]?.policy;
    if (!best) return null;

    const version = await this.db.query.hostNotificationEscalationPolicyVersions.findFirst({
      where: and(
        eq(hostNotificationEscalationPolicyVersions.escalationPolicyId, best.id),
        eq(hostNotificationEscalationPolicyVersions.statusCode, publishedStatus),
        isNull(hostNotificationEscalationPolicyVersions.deletedAt),
      ),
      orderBy: [desc(hostNotificationEscalationPolicyVersions.versionNumber)],
    });

    if (!version) return null;

    const escalationActionCode =
      (await this.typeDefs.codeById(version.escalationActionCode)) ?? version.escalationActionCode;

    return { policy: best, version, escalationActionCode };
  }

  private async latestVersionRow(policyId: string) {
    const rows = await this.db.query.hostNotificationEscalationPolicyVersions.findMany({
      where: and(
        eq(hostNotificationEscalationPolicyVersions.escalationPolicyId, policyId),
        isNull(hostNotificationEscalationPolicyVersions.deletedAt),
      ),
      orderBy: [desc(hostNotificationEscalationPolicyVersions.versionNumber)],
      limit: 1,
    });
    return rows[0];
  }

  private async getVersionRow(policyId: string, versionId: string) {
    const found = await this.db.query.hostNotificationEscalationPolicyVersions.findFirst({
      where: and(
        eq(hostNotificationEscalationPolicyVersions.id, versionId),
        eq(hostNotificationEscalationPolicyVersions.escalationPolicyId, policyId),
        isNull(hostNotificationEscalationPolicyVersions.deletedAt),
      ),
    });
    if (!found) throw new NotFoundException("Escalation policy version not found");
    return found;
  }
}
