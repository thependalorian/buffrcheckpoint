import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { createArtifactStore } from "../../common/artifacts/artifact-store";
import { PersonalDataProtectionService } from "../../common/data-protection/personal-data-protection.service";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  applicationUsers,
  organisationKybDocument,
  organisationKybDocumentStatusEvents,
  organisationKybStatusEvents,
  organisationKybVerification,
  organisationMemberships,
  organisations,
  roleDefinitions,
  typeDefinition,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { TemplatedEmailService } from "../notifications/templated-email.service";
import type { SubmitKybDto } from "./dto/kyb.dto";
import { type ExtractedRegistration, parseRegistrationText, toSuggestions } from "./founding-statement-parser";
import { KybDocumentReaderService } from "./kyb-document-reader.service";
import { analyseOwnership, blockingMissing, documentChecklist, type KybRules, parseKybRules } from "./kyb-rules";
import {
  CONTENT_TYPES,
  type CrossCheck,
  type FieldIssue,
  REGISTRATION_PROOF_TYPES,
  crossCheck,
  hasErrors,
  safeFileName,
  validateDocumentFile,
  validateKybFields,
} from "./kyb-validation";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";

export type KybDecision = "verified" | "rejected" | "needs_info";

/** Anything still being worked on: a new submission waits for ops, one that needs information waits for the organisation. */
const OPEN_STATUSES = ["pending", "needs_info"] as const;
/** A document read that has not finished after this long is treated as not read (the process may have restarted). */
const READ_TIMEOUT_MS = 3 * 60 * 1000;

const artifactStore = createArtifactStore();

export interface StoredMember {
  fullName: string;
  role?: string;
  isJuristic?: boolean;
  registrationNumber?: string;
  identityNumber?: string;
  percentage?: number | null;
  phone?: string;
  email?: string;
}

@Injectable()
export class KybService {
  private readonly logger = new Logger(KybService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly dataProtection: PersonalDataProtectionService,
    private readonly templatedEmail: TemplatedEmailService,
    private readonly reader: KybDocumentReaderService,
  ) {}

  // ---------------------------------------------------------------- documents (organisation side)

  /** Stores an uploaded file, then reads it in the background so the form can be pre-filled. Returns at once. */
  async uploadDocument(
    organisationId: string,
    user: AuthenticatedUser,
    file: { buffer: Buffer; originalname: string } | undefined,
    documentType: string,
  ) {
    if (!file?.buffer) throw new BadRequestException({ message: "Choose a file to upload.", issues: [] });
    const typeRow = await this.db.query.typeDefinition.findFirst({
      where: and(eq(typeDefinition.domain, "kyb_document_type"), eq(typeDefinition.code, documentType), isNull(typeDefinition.deletedAt)),
    });
    if (!typeRow) throw new BadRequestException({ message: "Choose what kind of document this is.", issues: [] });

    const checked = validateDocumentFile(file.buffer);
    if (hasErrors(checked.issues) || !checked.type) {
      throw new BadRequestException({ message: checked.issues[0]?.message ?? "The file cannot be accepted.", issues: checked.issues });
    }

    const name = safeFileName(file.originalname, checked.type);
    const stored = await artifactStore.writePackage(
      "kyb-documents",
      [{ name, content: file.buffer, contentType: CONTENT_TYPES[checked.type] }],
      { organisationId, uploadedBy: user.userId, documentType },
    );
    const statusCode = await this.typeDefs.id("kyb_document_status", "received");
    const id = randomUUID();
    await this.db.insert(organisationKybDocument).values({
      id,
      organisationId,
      documentTypeCode: typeRow.id,
      statusCode,
      fileReference: stored.fileReference,
      fileName: name,
      contentType: CONTENT_TYPES[checked.type],
      sizeBytes: file.buffer.length,
      contentSha256: createHash("sha256").update(file.buffer).digest("hex"),
      uploadedBy: user.userId,
    });
    await this.db.insert(organisationKybDocumentStatusEvents).values({
      id: randomUUID(),
      organisationId,
      documentId: id,
      fromStatusCode: null,
      toStatusCode: statusCode,
      actorId: user.userId,
    });

    if ((REGISTRATION_PROOF_TYPES as readonly string[]).includes(documentType)) {
      void this.readInBackground(id, organisationId, file.buffer, checked.type);
    }
    return this.documentView(id, organisationId);
  }

  private async readInBackground(documentId: string, organisationId: string, buffer: Buffer, type: "pdf" | "png" | "jpeg") {
    try {
      const result = await this.reader.read(buffer, type);
      const parsed = result.text ? parseRegistrationText(result.text, result.precise) : null;
      await this.db
        .update(organisationKybDocument)
        .set({
          extractionMethod: result.method,
          extractionProtected: parsed ? this.dataProtection.encrypt(JSON.stringify(parsed)) : null,
        })
        .where(and(eq(organisationKybDocument.id, documentId), eq(organisationKybDocument.organisationId, organisationId)));
    } catch (error) {
      this.logger.warn(`Reading KYB document ${documentId} failed: ${error instanceof Error ? error.message : "unknown error"}`);
      await this.db
        .update(organisationKybDocument)
        .set({ extractionMethod: "failed" })
        .where(and(eq(organisationKybDocument.id, documentId), eq(organisationKybDocument.organisationId, organisationId)))
        .catch(() => undefined);
    }
  }

  async listDocuments(organisationId: string) {
    const rows = await this.db.query.organisationKybDocument.findMany({
      where: and(eq(organisationKybDocument.organisationId, organisationId), isNull(organisationKybDocument.deletedAt)),
      orderBy: asc(organisationKybDocument.createdAt),
    });
    return Promise.all(rows.map((row) => this.toView(row)));
  }

  async documentView(documentId: string, organisationId: string) {
    const row = await this.db.query.organisationKybDocument.findFirst({
      where: and(eq(organisationKybDocument.id, documentId), eq(organisationKybDocument.organisationId, organisationId)),
    });
    if (!row) throw new NotFoundException("Document not found");
    return this.toView(row);
  }

  async deleteDocument(documentId: string, organisationId: string) {
    const row = await this.db.query.organisationKybDocument.findFirst({
      where: and(
        eq(organisationKybDocument.id, documentId),
        eq(organisationKybDocument.organisationId, organisationId),
        isNull(organisationKybDocument.deletedAt),
      ),
    });
    if (!row) throw new NotFoundException("Document not found");
    const accepted = await this.typeDefs.id("kyb_document_status", "accepted");
    if (row.statusCode === accepted) {
      throw new ForbiddenException("This document has been accepted. Upload a replacement instead of removing it.");
    }
    await this.db
      .update(organisationKybDocument)
      .set({ deletedAt: new Date() })
      .where(and(eq(organisationKybDocument.id, documentId), eq(organisationKybDocument.organisationId, organisationId)));
    return { id: documentId, removed: true };
  }

  private async toView(row: typeof organisationKybDocument.$inferSelect) {
    const [typeRow, statusRow] = await Promise.all([
      this.db.query.typeDefinition.findFirst({ where: eq(typeDefinition.id, row.documentTypeCode) }),
      this.db.query.typeDefinition.findFirst({ where: eq(typeDefinition.id, row.statusCode) }),
    ]);
    const isProof = (REGISTRATION_PROOF_TYPES as readonly string[]).includes(typeRow?.code ?? "");
    let reading: "not_applicable" | "reading" | "read" | "not_read" = "not_applicable";
    let suggestions: Record<string, { value: string; confidence: string }> = {};
    let members: ExtractedRegistration["members"] = [];
    if (isProof) {
      const age = Date.now() - row.createdAt.getTime();
      if (!row.extractionMethod) reading = age > READ_TIMEOUT_MS ? "not_read" : "reading";
      else if (row.extractionMethod === "unavailable" || row.extractionMethod === "failed") reading = "not_read";
      else reading = "read";
      const extracted = this.decodeExtraction(row.extractionProtected);
      if (extracted) {
        suggestions = toSuggestions(extracted);
        members = extracted.members;
        if (Object.keys(suggestions).length === 0 && members.length === 0) reading = "not_read";
      }
    }
    return {
      id: row.id,
      documentType: typeRow?.code ?? "other",
      documentTypeLabel: typeRow?.label ?? "Document",
      status: statusRow?.code ?? "received",
      statusLabel: statusRow?.label ?? "Received",
      fileName: row.fileName,
      sizeBytes: row.sizeBytes,
      uploadedAt: row.createdAt.toISOString(),
      reading,
      suggestions,
      members,
    };
  }

  private decodeExtraction(protectedValue: unknown): ExtractedRegistration | null {
    if (!protectedValue) return null;
    try {
      return JSON.parse(this.dataProtection.decrypt(protectedValue as never)) as ExtractedRegistration;
    } catch (error) {
      this.logger.warn(`Could not read a stored document extraction: ${error instanceof Error ? error.message : "unknown error"}`);
      return null;
    }
  }

  // ---------------------------------------------------------------- submission (organisation side)

  /** Checks the details the way a submission would, without saving anything. Used by the form as the person types. */
  validate(dto: SubmitKybDto): { issues: FieldIssue[]; ok: boolean } {
    const issues = validateKybFields(this.fieldsOf(dto));
    return { issues, ok: !hasErrors(issues) };
  }

  private fieldsOf(dto: SubmitKybDto) {
    return {
      entityType: dto.entityType,
      businessRegistrationNumber: dto.businessRegistrationNumber,
      registeredBusinessName: dto.registeredBusinessName,
      registeredAddress: dto.registeredAddress,
      authorizedSignatoryName: dto.authorizedSignatoryName,
      financialYearEnd: dto.financialYearEnd,
      postalAddress: dto.postalAddress,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      tin: dto.tin,
      incorporatedOn: dto.incorporatedOn,
      members: dto.members,
    };
  }

  /** The thresholds and limits in the platform setting `kyb_rules`, else the owner's defaults (25 BIPA, 20 FIA). */
  private async rules(): Promise<KybRules> {
    const result = await this.db.execute(sql`
      SELECT setting_value FROM platform_configuration_setting
      WHERE setting_key = 'kyb_rules' AND deleted_at IS NULL LIMIT 1`);
    return parseKybRules((result.rows[0] as { setting_value?: unknown } | undefined)?.setting_value);
  }

  async submit(dto: SubmitKybDto, user: AuthenticatedUser) {
    const organisationId = user.organisationId;
    const issues = validateKybFields(this.fieldsOf(dto));
    const documents = await this.listDocuments(organisationId);
    // Everything the verification requires must be uploaded before it is sent: a submission is never half a pack.
    const rules = await this.rules();
    const missing = blockingMissing(documentChecklist(dto.entityType, analyseOwnership(dto.members ?? [], rules), documents, rules));
    for (const label of missing) {
      issues.push({ field: "documents", code: "documentRequired", severity: "error", message: `Still needed: ${label}.` });
    }
    if (hasErrors(issues)) {
      throw new BadRequestException({ message: issues.find((i) => i.severity === "error")?.message ?? "Some details need correcting.", issues });
    }

    const pendingCode = await this.typeDefs.id("kyb_status", "pending");
    const entityTypeCode = await this.typeDefs.id("kyb_entity_type", dto.entityType);
    const previous = await this.openSubmissions(organisationId);

    const [row] = await this.db
      .insert(organisationKybVerification)
      .values({
        id: randomUUID(),
        organisationId,
        businessRegistrationNumber: dto.businessRegistrationNumber.trim().toUpperCase(),
        registeredBusinessName: dto.registeredBusinessName.replace(/\s+/g, " ").trim(),
        registeredAddressProtected: this.dataProtection.encrypt(dto.registeredAddress.replace(/\s+/g, " ").trim()),
        authorizedSignatoryNameProtected: this.dataProtection.encrypt(dto.authorizedSignatoryName.replace(/\s+/g, " ").trim()),
        entityTypeCode,
        principalBusiness: dto.principalBusiness?.trim() || null,
        financialYearEnd: dto.financialYearEnd?.trim() || null,
        postalAddressProtected: dto.postalAddress?.trim() ? this.dataProtection.encrypt(dto.postalAddress.replace(/\s+/g, " ").trim()) : null,
        contactEmail: dto.contactEmail?.trim().toLowerCase() || null,
        contactPhone: dto.contactPhone?.trim() || null,
        tinProtected: dto.tin?.trim() ? this.dataProtection.encrypt(dto.tin.trim()) : null,
        incorporatedOn: dto.incorporatedOn?.trim() || null,
        membersProtected: dto.members?.length ? this.dataProtection.encrypt(JSON.stringify(dto.members)) : null,
        fieldSources: dto.fieldSources ?? null,
        statusCode: pendingCode,
      })
      .returning();

    await this.db.insert(organisationKybStatusEvents).values({
      id: randomUUID(),
      kybVerificationId: row.id,
      fromStatusCode: null,
      toStatusCode: pendingCode,
      actorId: user.userId,
    });

    // A resubmission replaces the one still open, so the ops queue never holds two entries for one organisation.
    if (previous.length > 0) {
      const supersededCode = await this.typeDefs.id("kyb_status", "superseded");
      for (const old of previous) {
        await this.db
          .update(organisationKybVerification)
          .set({ statusCode: supersededCode })
          .where(eq(organisationKybVerification.id, old.id));
        await this.db.insert(organisationKybStatusEvents).values({
          id: randomUUID(),
          kybVerificationId: old.id,
          fromStatusCode: old.statusCode,
          toStatusCode: supersededCode,
          actorId: user.userId,
          note: "Replaced by a newer submission from the organisation.",
        });
      }
    }

    await this.notifySubmitted(organisationId, user.userId).catch((error) => this.logFailure("submission acknowledgement", error));
    return row;
  }

  private async openSubmissions(organisationId: string) {
    const codes = await Promise.all(OPEN_STATUSES.map((c) => this.typeDefs.id("kyb_status", c)));
    return this.db.query.organisationKybVerification.findMany({
      where: and(
        eq(organisationKybVerification.organisationId, organisationId),
        inArray(organisationKybVerification.statusCode, codes),
        isNull(organisationKybVerification.deletedAt),
      ),
    });
  }

  async getLatestForOrganisation(organisationId: string) {
    const row = await this.db.query.organisationKybVerification.findFirst({
      where: and(eq(organisationKybVerification.organisationId, organisationId), isNull(organisationKybVerification.deletedAt)),
      orderBy: desc(organisationKybVerification.submittedAt),
    });
    return row ?? null;
  }

  /** What the organisation sees and edits: its latest submission with the details in clear, its documents, and what ops asked for. */
  async mine(organisationId: string) {
    const latest = await this.getLatestForOrganisation(organisationId);
    const documents = await this.listDocuments(organisationId);
    const rules = await this.rules();
    if (!latest) {
      return { submission: null, documents, request: null, checklist: documentChecklist(null, analyseOwnership([], rules), documents, rules) };
    }
    const [statusRow, entityRow, lastAsk] = await Promise.all([
      this.db.query.typeDefinition.findFirst({ where: eq(typeDefinition.id, latest.statusCode) }),
      latest.entityTypeCode ? this.db.query.typeDefinition.findFirst({ where: eq(typeDefinition.id, latest.entityTypeCode) }) : null,
      this.latestRequest(latest.id),
    ]);
    return {
      submission: {
        id: latest.id,
        status: statusRow?.code ?? "pending",
        statusLabel: statusRow?.label ?? "Pending",
        submittedAt: latest.submittedAt.toISOString(),
        verifiedAt: latest.verifiedAt?.toISOString() ?? null,
        entityType: entityRow?.code ?? null,
        businessRegistrationNumber: latest.businessRegistrationNumber,
        registeredBusinessName: latest.registeredBusinessName,
        registeredAddress: this.decodeText(latest.registeredAddressProtected),
        authorizedSignatoryName: this.decodeText(latest.authorizedSignatoryNameProtected),
        principalBusiness: latest.principalBusiness,
        financialYearEnd: latest.financialYearEnd,
        postalAddress: latest.postalAddressProtected ? this.decodeText(latest.postalAddressProtected) : "",
        contactEmail: latest.contactEmail ?? "",
        contactPhone: latest.contactPhone ?? "",
        tin: latest.tinProtected ? this.decodeText(latest.tinProtected) : "",
        incorporatedOn: latest.incorporatedOn ?? "",
        members: this.decodeMembers(latest.membersProtected),
      },
      documents,
      request: lastAsk,
      checklist: documentChecklist(entityRow?.code ?? null, analyseOwnership(this.decodeMembers(latest.membersProtected), rules), documents, rules),
    };
  }

  private async latestRequest(kybVerificationId: string) {
    const needsInfo = await this.typeDefs.id("kyb_status", "needs_info");
    const rejected = await this.typeDefs.id("kyb_status", "rejected");
    const events = await this.db.query.organisationKybStatusEvents.findMany({
      where: eq(organisationKybStatusEvents.kybVerificationId, kybVerificationId),
      orderBy: desc(organisationKybStatusEvents.occurredAt),
      limit: 5,
    });
    const ask = events.find((e) => e.toStatusCode === needsInfo || e.toStatusCode === rejected);
    if (!ask) return null;
    return {
      kind: ask.toStatusCode === needsInfo ? "needs_info" : "rejected",
      note: ask.note ?? "",
      flaggedFields: (ask.flaggedFields as string[] | null) ?? [],
      at: ask.occurredAt.toISOString(),
    };
  }

  private decodeText(value: unknown): string {
    try {
      return this.dataProtection.decrypt(value as never);
    } catch (error) {
      this.logger.warn(`Could not read a protected KYB value: ${error instanceof Error ? error.message : "unknown error"}`);
      return "";
    }
  }

  private decodeMembers(value: unknown): StoredMember[] {
    if (!value) return [];
    try {
      return JSON.parse(this.dataProtection.decrypt(value as never)) as StoredMember[];
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------- review (platform staff)

  /** Everything waiting on Checkpoint, oldest first. Submissions waiting on the organisation are listed separately. */
  async listPending() {
    const statusCode = await this.typeDefs.id("kyb_status", "pending");
    return this.db.query.organisationKybVerification.findMany({
      where: and(eq(organisationKybVerification.statusCode, statusCode), isNull(organisationKybVerification.deletedAt)),
      orderBy: asc(organisationKybVerification.submittedAt),
    });
  }

  async listAwaitingOrganisation() {
    const statusCode = await this.typeDefs.id("kyb_status", "needs_info");
    return this.db.query.organisationKybVerification.findMany({
      where: and(eq(organisationKybVerification.statusCode, statusCode), isNull(organisationKybVerification.deletedAt)),
      orderBy: asc(organisationKybVerification.submittedAt),
    });
  }

  /** The reviewer's screen: the details, how they compare with the documents, which documents are accepted, and the history. */
  async review(kybVerificationId: string) {
    const row = await this.db.query.organisationKybVerification.findFirst({ where: eq(organisationKybVerification.id, kybVerificationId) });
    if (!row) throw new NotFoundException("KYB verification not found");
    const [org, statusRow, entityRow, documents, history] = await Promise.all([
      this.db.query.organisations.findFirst({ where: eq(organisations.id, row.organisationId) }),
      this.db.query.typeDefinition.findFirst({ where: eq(typeDefinition.id, row.statusCode) }),
      row.entityTypeCode ? this.db.query.typeDefinition.findFirst({ where: eq(typeDefinition.id, row.entityTypeCode) }) : null,
      this.listDocuments(row.organisationId),
      this.historyFor(row.id),
    ]);
    const registeredAddress = this.decodeText(row.registeredAddressProtected);
    const authorizedSignatoryName = this.decodeText(row.authorizedSignatoryNameProtected);
    const members = this.decodeMembers(row.membersProtected);
    const postalAddress = row.postalAddressProtected ? this.decodeText(row.postalAddressProtected) : "";
    const tin = row.tinProtected ? this.decodeText(row.tinProtected) : "";
    const issues = validateKybFields({
      entityType: entityRow?.code ?? null,
      businessRegistrationNumber: row.businessRegistrationNumber,
      registeredBusinessName: row.registeredBusinessName,
      registeredAddress,
      authorizedSignatoryName,
      financialYearEnd: row.financialYearEnd,
      postalAddress,
      contactEmail: row.contactEmail,
      contactPhone: row.contactPhone,
      tin,
      incorporatedOn: row.incorporatedOn,
      members,
    });
    const rules = await this.rules();
    const ownership = analyseOwnership(members, rules);
    const checklist = documentChecklist(entityRow?.code ?? null, ownership, documents, rules);
    // The newest document that could be read is the best evidence of what the organisation filed.
    const read = [...documents].reverse().find((d) => d.reading === "read" && (d.suggestions.businessRegistrationNumber || d.suggestions.registeredBusinessName));
    const comparison: CrossCheck[] = crossCheck(
      { businessRegistrationNumber: row.businessRegistrationNumber, registeredBusinessName: row.registeredBusinessName, registeredAddress },
      read
        ? {
            registrationNumber: read.suggestions.businessRegistrationNumber?.value,
            businessName: read.suggestions.registeredBusinessName?.value,
            registeredAddress: read.suggestions.registeredAddress?.value,
          }
        : null,
    );
    // Approval counts only documents a person has accepted. A single file sent before documents were listed counts as registration proof.
    const acceptedDocs = documents.filter((d) => d.status === "accepted");
    if (row.registrationDocumentReference) acceptedDocs.push({ documentType: "founding_statement", status: "accepted" } as (typeof documents)[number]);
    const approvalBlockers = blockingMissing(documentChecklist(entityRow?.code ?? null, ownership, acceptedDocs, rules));
    const proofAccepted = !approvalBlockers.some((b) => b.startsWith("Proof of registration"));
    return {
      id: row.id,
      organisationId: row.organisationId,
      organisationName: org?.legalName ?? null,
      status: statusRow?.code ?? "pending",
      statusLabel: statusRow?.label ?? "Pending",
      submittedAt: row.submittedAt.toISOString(),
      entityType: entityRow?.code ?? null,
      entityTypeLabel: entityRow?.label ?? null,
      businessRegistrationNumber: row.businessRegistrationNumber,
      registeredBusinessName: row.registeredBusinessName,
      registeredAddress,
      authorizedSignatoryName,
      principalBusiness: row.principalBusiness,
      financialYearEnd: row.financialYearEnd,
      postalAddress,
      contactEmail: row.contactEmail,
      contactPhone: row.contactPhone,
      tin,
      incorporatedOn: row.incorporatedOn,
      members,
      ownership,
      checklist,
      rules,
      fieldSources: (row.fieldSources as Record<string, string> | null) ?? {},
      legacyDocument: Boolean(row.registrationDocumentReference),
      issues,
      comparison,
      documents,
      proofAccepted,
      approvalBlockers,
      canVerify: !hasErrors(issues) && approvalBlockers.length === 0,
      history,
    };
  }

  async decideDocument(documentId: string, decision: "accepted" | "rejected", user: AuthenticatedUser, note?: string) {
    const row = await this.db.query.organisationKybDocument.findFirst({
      where: and(eq(organisationKybDocument.id, documentId), isNull(organisationKybDocument.deletedAt)),
    });
    if (!row) throw new NotFoundException("Document not found");
    if (decision === "rejected" && !note?.trim()) throw new BadRequestException("Say why the document is rejected so the organisation can fix it.");
    const toStatusCode = await this.typeDefs.id("kyb_document_status", decision);
    if (row.statusCode === toStatusCode) return this.toView(row);
    await this.db.update(organisationKybDocument).set({ statusCode: toStatusCode }).where(eq(organisationKybDocument.id, documentId));
    await this.db.insert(organisationKybDocumentStatusEvents).values({
      id: randomUUID(),
      organisationId: row.organisationId,
      documentId,
      fromStatusCode: row.statusCode,
      toStatusCode,
      actorId: user.userId,
      note: note?.trim() || null,
    });
    return this.documentView(documentId, row.organisationId);
  }

  async decide(
    kybVerificationId: string,
    decision: KybDecision,
    user: AuthenticatedUser,
    note?: string,
    flaggedFields?: string[],
    registryChecked?: boolean,
  ) {
    const row = await this.db.query.organisationKybVerification.findFirst({
      where: eq(organisationKybVerification.id, kybVerificationId),
    });
    if (!row) throw new NotFoundException("KYB verification not found");

    const open = await Promise.all(OPEN_STATUSES.map((c) => this.typeDefs.id("kyb_status", c)));
    if (!open.includes(row.statusCode)) {
      throw new BadRequestException("This submission has already been decided or replaced. Open the organisation's latest submission.");
    }
    if ((decision === "rejected" || decision === "needs_info") && !note?.trim()) {
      throw new BadRequestException("Tell the organisation what to correct or add.");
    }
    if (decision === "needs_info" && !(flaggedFields?.length || note?.trim())) {
      throw new BadRequestException("Name the fields or documents that need attention.");
    }
    if (decision === "verified") {
      if (!registryChecked) {
        throw new BadRequestException("Confirm you checked the registration number on the BIPA register before approving.");
      }
      await this.assertCanVerify(row);
    }

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
      note: [decision === "verified" ? "Registration checked on the BIPA register by the reviewer." : "", note?.trim() ?? ""].filter(Boolean).join(" ") || null,
      flaggedFields: decision === "needs_info" ? (flaggedFields ?? []) : null,
    });

    await this.notifyDecision(row.organisationId, decision, note).catch((error) => this.logFailure(`${decision} decision email`, error));

    const updated = await this.db.query.organisationKybVerification.findFirst({
      where: eq(organisationKybVerification.id, kybVerificationId),
    });
    return updated ?? null;
  }

  /** Approval needs correct details and every required document accepted by a person. */
  private async assertCanVerify(row: typeof organisationKybVerification.$inferSelect) {
    const review = await this.review(row.id);
    const blocking = review.issues.find((i) => i.severity === "error");
    if (blocking) throw new BadRequestException(`Cannot approve yet: ${blocking.message}`);
    if (review.approvalBlockers.length > 0) {
      throw new BadRequestException(`Cannot approve yet. Accept: ${review.approvalBlockers.join("; ")}.`);
    }
  }

  async decideBulk(kybVerificationIds: string[], decision: "verified" | "rejected", user: AuthenticatedUser, note?: string) {
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
    return this.db.query.organisationKybStatusEvents.findMany({
      where: inArray(
        organisationKybStatusEvents.kybVerificationId,
        verifications.map((v) => v.id),
      ),
      orderBy: desc(organisationKybStatusEvents.occurredAt),
    });
  }

  private async historyFor(kybVerificationId: string) {
    const events = await this.db.query.organisationKybStatusEvents.findMany({
      where: eq(organisationKybStatusEvents.kybVerificationId, kybVerificationId),
      orderBy: desc(organisationKybStatusEvents.occurredAt),
    });
    const ids = [...new Set(events.flatMap((e) => [e.toStatusCode]))];
    const rows = ids.length ? await this.db.query.typeDefinition.findMany({ where: inArray(typeDefinition.id, ids) }) : [];
    const label = new Map(rows.map((r) => [r.id, r.label]));
    return events.map((e) => ({
      at: e.occurredAt.toISOString(),
      status: label.get(e.toStatusCode) ?? "",
      note: e.note ?? "",
      flaggedFields: (e.flaggedFields as string[] | null) ?? [],
    }));
  }

  /** A stored file for review: the new documents, or the single file sent with a submission made before documents had their own list. */
  async getDocumentFile(id: string) {
    const doc = await this.db.query.organisationKybDocument.findFirst({
      where: and(eq(organisationKybDocument.id, id), isNull(organisationKybDocument.deletedAt)),
    });
    if (doc) {
      const content = await artifactStore.readFile(doc.fileReference, doc.fileName);
      return { name: doc.fileName, contentType: doc.contentType, content };
    }
    return this.getDocument(id);
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
    return { name: documentFile.name, contentType: "application/octet-stream", content };
  }

  async isVerified(organisationId: string): Promise<boolean> {
    const verifiedStatus = await this.typeDefs.id("kyb_status", "verified");
    const latest = await this.getLatestForOrganisation(organisationId);
    return latest?.statusCode === verifiedStatus;
  }

  // ---------------------------------------------------------------- email

  private logFailure(what: string, error: unknown) {
    this.logger.warn(`KYB ${what} could not be sent: ${error instanceof Error ? error.message : "unknown error"}`);
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

  private async notifyDecision(organisationId: string, decision: KybDecision, note?: string) {
    const org = await this.db.query.organisations.findFirst({ where: eq(organisations.id, organisationId) });
    const organisationName = org?.legalName ?? "your organisation";
    const recipients = await this.organisationAdminEmails(organisationId);
    const templateCode = decision === "verified" ? "kyb_verified" : decision === "rejected" ? "kyb_rejected" : "kyb_needs_info";
    const noteText = note?.trim() || (decision === "rejected" ? "Please correct the details and resubmit." : "");
    const fallbackBody =
      decision === "verified"
        ? `Business verification (KYB) for ${organisationName} is approved.\n\nYou can proceed with billing activation and go-live when your subscription is active or on trial.`
        : decision === "rejected"
          ? `Business verification (KYB) for ${organisationName} was not approved.\n\n${noteText}\n\nPlease correct the details and resubmit from Admin → Business Verification.`
          : `We need a little more to verify ${organisationName}.\n\n${noteText}\n\nOpen Business Verification in your admin to correct the details or add documents.`;
    const fallbackSubject =
      decision === "verified"
        ? "Business verification approved"
        : decision === "rejected"
          ? "Business verification needs attention"
          : "More information needed for business verification";
    await Promise.all(
      recipients.map((email) =>
        this.templatedEmail.send({
          templateCode,
          organisationId,
          to: email,
          variables: { organisationName, note: noteText },
          fallback: { subject: fallbackSubject, body: fallbackBody },
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
