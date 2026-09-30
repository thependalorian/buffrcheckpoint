import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { createArtifactStore } from "../../common/artifacts/artifact-store";
import {
  PersonalDataProtectionService,
} from "../../common/data-protection/personal-data-protection.service";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  applicationUsers,
  organisationKybStatusEvents,
  organisationKybVerification,
  organisationMemberships,
  organisations,
  roleDefinitions,
  typeDefinition,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { TemplatedEmailService } from "../notifications/templated-email.service";
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

@Injectable()
export class KybService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly dataProtection: PersonalDataProtectionService,
    private readonly templatedEmail: TemplatedEmailService,
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

    await this.notifySubmitted(dto.organisationId, user.userId).catch(() => undefined);
    return row;
  }

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

    await this.notifyDecision(row.organisationId, decision, note).catch(() => undefined);

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

  async getDocument(kybVerificationId: string) {
    const row = await this.db.query.organisationKybVerification.findFirst({
      where: eq(organisationKybVerification.id, kybVerificationId),
    });
    if (!row?.registrationDocumentReference) {
      throw new NotFoundException("No KYB document on file");
    }

    const manifestBuffer = await artifactStore.readFile(row.registrationDocumentReference, "manifest.json");
    const manifest = JSON.parse(manifestBuffer.toString("utf8")) as { files: Array<{ name: string }> };
    const documentFile = manifest.files.find((f) => f.name !== "manifest.json");
    if (!documentFile) {
      throw new NotFoundException("No KYB document on file");
    }

    const content = await artifactStore.readFile(row.registrationDocumentReference, documentFile.name);
    return { name: documentFile.name, content };
  }

  async isVerified(organisationId: string): Promise<boolean> {
    const verifiedStatus = await this.typeDefs.id("kyb_status", "verified");
    const latest = await this.getLatestForOrganisation(organisationId);
    return latest?.statusCode === verifiedStatus;
  }

  private async notifySubmitted(organisationId: string, userId: string) {
    const org = await this.db.query.organisations.findFirst({ where: eq(organisations.id, organisationId) });
    const submitter = await this.db.query.applicationUsers.findFirst({ where: eq(applicationUsers.id, userId) });
    if (!submitter) return;
    await this.templatedEmail.send({
      templateCode: "kyb_submitted_ack",
      organisationId,
      to: submitter.email,
      variables: { organisationName: org?.legalName ?? "your organisation" },
      fallback: {
        subject: "KYB documents received",
        body: `We received the business verification (KYB) pack for ${org?.legalName ?? "your organisation"}.\n\nOur team will review it. You will receive an email when it is verified or if we need more information.`,
      },
    });
  }

  private async notifyDecision(organisationId: string, decision: "verified" | "rejected", note?: string) {
    const org = await this.db.query.organisations.findFirst({ where: eq(organisations.id, organisationId) });
    const organisationName = org?.legalName ?? "your organisation";
    const recipients = await this.organisationAdminEmails(organisationId);
    const templateCode = decision === "verified" ? "kyb_verified" : "kyb_rejected";
    const noteText = note?.trim() || (decision === "rejected" ? "Please correct the details and resubmit." : "");
    await Promise.all(
      recipients.map((email) =>
        this.templatedEmail.send({
          templateCode,
          organisationId,
          to: email,
          variables: { organisationName, note: noteText },
          fallback:
            decision === "verified"
              ? {
                  subject: "Business verification approved",
                  body: `Business verification (KYB) for ${organisationName} is approved.\n\nYou can proceed with billing activation and go-live when your subscription is active or on trial.`,
                }
              : {
                  subject: "Business verification needs attention",
                  body: `Business verification (KYB) for ${organisationName} was not approved.\n\n${noteText}\n\nPlease correct the details and resubmit from Admin → KYB.`,
                },
        }),
      ),
    );
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
}
