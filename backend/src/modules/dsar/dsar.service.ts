import { Inject, Injectable, NotFoundException, StreamableFile } from "@nestjs/common";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { createArtifactStore } from "../../common/artifacts/artifact-store";
import { sessionCache } from "../../common/auth/session-cache";
import { PersonalDataProtectionService } from "../../common/data-protection/personal-data-protection.service";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  applicationUsers,
  privacyRequestStatusLog,
  privacyRequests,
  visitorPersonalData,
  visitorSubjects,
  visitorVisits,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { randomUUID } from "node:crypto";

export interface CreateDsarInput {
  subjectReference: string;
  requestTypeCode: string;
}

@Injectable()
export class DsarService {
  private readonly artifacts = createArtifactStore();

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly dataProtection: PersonalDataProtectionService,
  ) {}

  async create(input: CreateDsarInput, user: AuthenticatedUser) {
    const [requestTypeCode, pendingStatus] = await Promise.all([
      this.typeDefs.id("dsar_request_type", input.requestTypeCode),
      this.typeDefs.id("dsar_status", "pending"),
    ]);

    const [created] = await this.db
      .insert(privacyRequests)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        subjectReference: input.subjectReference,
        requestTypeCode,
        statusCode: pendingStatus,
      })
      .returning();

    await this.db.insert(privacyRequestStatusLog).values({
      id: randomUUID(),
      requestId: created.id,
      statusCode: pendingStatus,
      occurredAt: new Date(),
      actorId: user.userId,
      reason: "request received",
    });

    return created;
  }

  async list(user: AuthenticatedUser, filter?: { requestTypeCode?: string }) {
    const rows = await this.db.query.privacyRequests.findMany({
      where: and(eq(privacyRequests.organisationId, user.organisationId), isNull(privacyRequests.deletedAt)),
    });

    const enriched = await Promise.all(
      rows.map(async (row) => {
        const [requestTypeCode, statusCode] = await Promise.all([
          this.typeDefs.codeById(row.requestTypeCode),
          this.typeDefs.codeById(row.statusCode),
        ]);
        return {
          ...row,
          requestTypeCode: requestTypeCode ?? row.requestTypeCode,
          statusCode: statusCode ?? row.statusCode,
          isAccountDeletion: requestTypeCode === "account_deletion",
        };
      }),
    );

    if (filter?.requestTypeCode) {
      return enriched.filter((row) => row.requestTypeCode === filter.requestTypeCode);
    }
    return enriched;
  }

  async resolve(requestId: string, resolution: "completed" | "rejected", reason: string, user: AuthenticatedUser) {
    const request = await this.db.query.privacyRequests.findFirst({
      where: and(eq(privacyRequests.id, requestId), eq(privacyRequests.organisationId, user.organisationId)),
    });
    if (!request) throw new NotFoundException("DSAR not found");

    const [resolvedStatus, accountDeletionType, dataExportType] = await Promise.all([
      this.typeDefs.id("dsar_status", resolution),
      this.typeDefs.id("dsar_request_type", "account_deletion"),
      this.typeDefs.id("dsar_request_type", "data_export"),
    ]);

    let exportFileReference: string | null = request.exportFileReference ?? null;

    if (resolution === "completed" && request.requestTypeCode === accountDeletionType) {
      await this.db
        .update(applicationUsers)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(applicationUsers.email, request.subjectReference),
            eq(applicationUsers.organisationId, user.organisationId),
          ),
        );
    }

    if (resolution === "completed" && request.requestTypeCode === accountDeletionType) {
      sessionCache.invalidateOrganisation(user.organisationId);
    }

    if (resolution === "completed" && request.requestTypeCode === dataExportType) {
      const packaged = await this.buildExportPackage(request.subjectReference, user);
      exportFileReference = packaged.fileReference;
    }

    await this.db
      .update(privacyRequests)
      .set({ statusCode: resolvedStatus, exportFileReference })
      .where(eq(privacyRequests.id, requestId));

    await this.db.insert(privacyRequestStatusLog).values({
      id: randomUUID(),
      requestId,
      statusCode: resolvedStatus,
      occurredAt: new Date(),
      actorId: user.userId,
      reason,
    });

    return { requestId, resolution, exportFileReference };
  }

  async download(requestId: string, user: AuthenticatedUser) {
    const request = await this.db.query.privacyRequests.findFirst({
      where: and(eq(privacyRequests.id, requestId), eq(privacyRequests.organisationId, user.organisationId)),
    });
    if (!request?.exportFileReference) throw new NotFoundException("DSAR export package not found");
    const manifest = await this.artifacts.readFile(request.exportFileReference, "manifest.json");
    return new StreamableFile(manifest, {
      type: "application/json",
      disposition: `attachment; filename="dsar-${requestId}-manifest.json"`,
    });
  }

  async downloadFile(requestId: string, name: string, user: AuthenticatedUser) {
    const request = await this.db.query.privacyRequests.findFirst({
      where: and(eq(privacyRequests.id, requestId), eq(privacyRequests.organisationId, user.organisationId)),
    });
    if (!request?.exportFileReference) throw new NotFoundException("DSAR export package not found");
    if (!["data.json", "visits.csv", "README.txt", "schema.txt", "manifest.json"].includes(name)) {
      throw new NotFoundException("File not part of this export package");
    }
    const content = await this.artifacts.readFile(request.exportFileReference, name);
    return new StreamableFile(content, { disposition: `attachment; filename="${name}"` });
  }

  async getPackage(requestId: string, user: AuthenticatedUser) {
    const request = await this.db.query.privacyRequests.findFirst({
      where: and(eq(privacyRequests.id, requestId), eq(privacyRequests.organisationId, user.organisationId)),
    });
    if (!request?.exportFileReference) throw new NotFoundException("DSAR export package not found");
    return {
      requestId,
      fileReference: request.exportFileReference,
      files: ["data.json", "visits.csv", "README.txt", "schema.txt", "manifest.json"].map((name) => ({
        name,
        downloadUrl: `/dsar/${requestId}/files/${name}`,
      })),
    };
  }

  // subjectReference is overloaded today: an email for the staff
  // account-deletion path above (matched against applicationUsers.email),
  // but a phone number for this visitor data-export path — visitors have no
  // applicationUsers row to match on, only the phoneLookupHmac deterministic
  // hash already used for returning-visitor lookup (visitors.service.ts's
  // findByPhone, visits.service.ts's signOutByPhone). That split is a real
  // pre-existing product-data-model question, not resolved here — this fix
  // only closes the bug where this method ignored subjectReference entirely
  // and returned every visitor's data regardless of who requested it.
  private async buildExportPackage(subjectReference: string, user: AuthenticatedUser) {
    const phoneHmacs = this.dataProtection.phoneLookupHmacCandidates(subjectReference);
    const personalDataMatch = await this.db.query.visitorPersonalData.findFirst({
      where: inArray(visitorPersonalData.phoneLookupHmac, phoneHmacs),
    });

    const subjects = personalDataMatch
      ? await this.db.query.visitorSubjects.findMany({
          where: and(
            eq(visitorSubjects.id, personalDataMatch.visitorId),
            eq(visitorSubjects.organisationId, user.organisationId),
            isNull(visitorSubjects.deletedAt),
          ),
        })
      : [];
    const subjectIds = subjects.map((s) => s.id);
    // subjects is already org-scoped above, so a non-empty result confirms
    // the phone-matched visitor belongs to this organisation.
    const personal = subjects.length > 0 && personalDataMatch ? [personalDataMatch] : [];

    const visits =
      subjectIds.length === 0
        ? []
        : await this.db.query.visitorVisits.findMany({
            where: and(
              eq(visitorVisits.organisationId, user.organisationId),
              isNull(visitorVisits.deletedAt),
              inArray(visitorVisits.visitorId, subjectIds),
            ),
          });

    const dataJson = {
      subjectReference,
      organisationId: user.organisationId,
      visitorSubjects: subjects,
      visitorPersonalData: personal.map((row) => ({
        visitorId: row.visitorId,
        hasProtectedFields: Boolean(row.encryptedPayload),
        preferredLanguageCode: row.preferredLanguageCode,
        lastRotatedAt: row.lastRotatedAt,
      })),
      exportedAt: new Date().toISOString(),
    };

    const csvHeader = "visit_id,site_id,status_code,checked_in_at,checked_out_at\n";
    const csvBody = visits
      .map(
        (v) =>
          `${v.id},${v.siteId},${v.statusCode},${v.checkedInAt?.toISOString?.() ?? ""},${v.checkedOutAt?.toISOString?.() ?? ""}`,
      )
      .join("\n");

    const readme = [
      "Buffr Checkpoint DSAR export package",
      "Formats: data.json (structured), visits.csv (flat portability).",
      "See schema.txt for field dictionary. manifest.json holds SHA-256 hashes.",
      `Subject reference: ${subjectReference}`,
      `Operator: ${user.userId}`,
    ].join("\n");

    const schema = [
      "data.json.visitorSubjects.id — visitor subject UUID",
      "data.json.visitorPersonalData.* — protected personal data envelopes",
      "visits.csv.visit_id — visit UUID",
      "visits.csv.site_id — site UUID",
      "visits.csv.check_in_at / check_out_at — ISO-8601 timestamps",
    ].join("\n");

    return this.artifacts.writePackage(
      "dsar",
      [
        { name: "data.json", content: JSON.stringify(dataJson, null, 2) },
        { name: "visits.csv", content: `${csvHeader + csvBody}\n` },
        { name: "README.txt", content: readme },
        { name: "schema.txt", content: schema },
      ],
      {
        scope: { subjectReference, organisationId: user.organisationId },
        operator: user.userId,
        counts: { subjects: subjects.length, personalRows: personal.length, visits: visits.length },
      },
    );
  }
}
