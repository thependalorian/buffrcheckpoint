import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { desc, eq, inArray } from "drizzle-orm";

import { createArtifactStore } from "../../common/artifacts/artifact-store";
import {
  PersonalDataProtectionService,
  type ProtectedPersonalDataEnvelope,
} from "../../common/data-protection/personal-data-protection.service";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { organisationKybStatusEvents, organisationKybVerification } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { randomUUID } from "node:crypto";

export interface SubmitKybInput {
  organisationId: string;
  businessRegistrationNumber: string;
  registeredBusinessName: string;
  registeredAddress: string;
  authorizedSignatoryName: string;
  documentBase64?: string;
  documentName?: string;
}

const artifactStore = createArtifactStore();

// Scoped to business-identity verification at onboarding only — not
// ongoing sanctions/PEP/AML monitoring (regulated-fintech-grade capability
// this visitor-management product doesn't need). Gates
// organisation_subscription reaching 'active' (billing.service.ts).
@Injectable()
export class KybService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly dataProtection: PersonalDataProtectionService,
  ) {}

  async submit(dto: SubmitKybInput, user: AuthenticatedUser) {
    const statusCode = await this.typeDefs.id("kyb_status", "pending");

    let registrationDocumentReference: string | undefined;
    if (dto.documentBase64 && dto.documentName) {
      const stored = await artifactStore.writePackage(
        "kyb-documents",
        [{ name: dto.documentName, content: Buffer.from(dto.documentBase64, "base64") }],
        { organisationId: dto.organisationId, submittedBy: user.userId },
      );
      registrationDocumentReference = stored.fileReference;
    }

    const [row] = await this.db
      .insert(organisationKybVerification)
      .values({
        id: randomUUID(),
        organisationId: dto.organisationId,
        businessRegistrationNumber: dto.businessRegistrationNumber,
        registeredBusinessName: dto.registeredBusinessName,
        registeredAddressProtected: this.dataProtection.encrypt(dto.registeredAddress),
        authorizedSignatoryNameProtected: this.dataProtection.encrypt(dto.authorizedSignatoryName),
        registrationDocumentReference,
        statusCode,
      })
      .returning();

    await this.db.insert(organisationKybStatusEvents).values({
      id: randomUUID(),
      kybVerificationId: row.id,
      fromStatusCode: null,
      toStatusCode: statusCode,
      actorId: user.userId,
    });

    return row;
  }

  // Explicit `?? null`: Drizzle's findFirst() resolves to `undefined` when
  // nothing matches, and NestJS/Express sends an EMPTY response body for a
  // controller that returns `undefined` — not JSON "null". Every caller of
  // this endpoint expects `KybVerification | null` and calls `.json()` on
  // the response; an empty body makes that throw
  // "SyntaxError: Unexpected end of JSON input" for any organisation with
  // no KYB submission yet — confirmed live via Vercel runtime error logs
  // on both the admin and ops-console KYB screens.
  async getLatestForOrganisation(organisationId: string) {
    const row = await this.db.query.organisationKybVerification.findFirst({
      where: eq(organisationKybVerification.organisationId, organisationId),
      orderBy: desc(organisationKybVerification.submittedAt),
    });
    return row ?? null;
  }

  async listPending() {
    const statusCode = await this.typeDefs.id("kyb_status", "pending");
    return this.db.query.organisationKybVerification.findMany({
      where: eq(organisationKybVerification.statusCode, statusCode),
      orderBy: desc(organisationKybVerification.submittedAt),
    });
  }

  async decide(kybVerificationId: string, decision: "verified" | "rejected", user: AuthenticatedUser, note?: string) {
    const row = await this.db.query.organisationKybVerification.findFirst({
      where: eq(organisationKybVerification.id, kybVerificationId),
    });
    if (!row) throw new NotFoundException("KYB verification not found");

    const toStatusCode = await this.typeDefs.id("kyb_status", decision);
    await this.db
      .update(organisationKybVerification)
      .set({
        statusCode: toStatusCode,
        verifiedBy: decision === "verified" ? user.userId : null,
        verifiedAt: decision === "verified" ? new Date() : null,
      })
      .where(eq(organisationKybVerification.id, kybVerificationId));

    await this.db.insert(organisationKybStatusEvents).values({
      id: randomUUID(),
      kybVerificationId,
      fromStatusCode: row.statusCode,
      toStatusCode,
      actorId: user.userId,
      note,
    });

    const updated = await this.db.query.organisationKybVerification.findFirst({
      where: eq(organisationKybVerification.id, kybVerificationId),
    });
    return updated ?? null;
  }

  async decideBulk(
    kybVerificationIds: string[],
    decision: "verified" | "rejected",
    user: AuthenticatedUser,
    note?: string,
  ) {
    const failed: Array<{ id: string; reason: string }> = [];
    let updated = 0;
    for (const id of kybVerificationIds) {
      try {
        await this.decide(id, decision, user, note);
        updated += 1;
      } catch (err) {
        failed.push({ id, reason: err instanceof Error ? err.message : "Failed" });
      }
    }
    return { requested: kybVerificationIds.length, updated, failed };
  }

  /** Full status-event timeline for an org's KYB verification(s) — the ops-console KYB tab's history view. */
  async history(organisationId: string) {
    const verifications = await this.db.query.organisationKybVerification.findMany({
      where: eq(organisationKybVerification.organisationId, organisationId),
      orderBy: desc(organisationKybVerification.submittedAt),
    });
    if (verifications.length === 0) return [];

    const events = await this.db.query.organisationKybStatusEvents.findMany({
      where: inArray(
        organisationKybStatusEvents.kybVerificationId,
        verifications.map((v) => v.id),
      ),
      orderBy: desc(organisationKybStatusEvents.occurredAt),
    });
    return events;
  }

  /** Streams the stored registration document back for staff review. Reference format is `<namespace>/<packageId>` — the document's own filename lives inside the manifest, not the reference, so resolve it there first. */
  async getDocument(kybVerificationId: string) {
    const row = await this.db.query.organisationKybVerification.findFirst({
      where: eq(organisationKybVerification.id, kybVerificationId),
    });
    if (!row?.registrationDocumentReference) {
      throw new NotFoundException("No registration document on file");
    }

    const manifestBuffer = await artifactStore.readFile(row.registrationDocumentReference, "manifest.json");
    const manifest = JSON.parse(manifestBuffer.toString("utf8")) as {
      files: Array<{ name: string }>;
    };
    const documentFile = manifest.files.find((f) => f.name !== "manifest.json");
    if (!documentFile) {
      throw new NotFoundException("No registration document on file");
    }

    const content = await artifactStore.readFile(row.registrationDocumentReference, documentFile.name);
    return { name: documentFile.name, content };
  }

  async isVerified(organisationId: string): Promise<boolean> {
    const verifiedStatus = await this.typeDefs.id("kyb_status", "verified");
    const latest = await this.db.query.organisationKybVerification.findFirst({
      where: eq(organisationKybVerification.organisationId, organisationId),
      orderBy: desc(organisationKybVerification.submittedAt),
    });
    return latest?.statusCode === verifiedStatus;
  }
}
