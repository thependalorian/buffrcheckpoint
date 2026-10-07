import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";

import { appendAuditEvent } from "../../common/audit/audit-chain";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  AGREEMENT_ACTION_PREFIX,
  agreementActionCode,
  isLegalDocument,
  isValidVersion,
  LEGAL_DOCUMENT_CODES,
  LEGAL_DOCUMENTS,
  type LegalDocumentCode,
} from "./legal-documents";

export interface LegalDocumentStatus {
  code: LegalDocumentCode;
  label: string;
  path: string;
  version: string;
  accepted: boolean;
}

export interface LegalStatus {
  documents: LegalDocumentStatus[];
  /** Codes of the documents whose current version this organisation has not accepted. */
  pending: LegalDocumentCode[];
}

/** Records and reads agreement acceptances. See legal-documents.ts for the model. */
@Injectable()
export class LegalService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** The current version of every document: the default, unless the platform setting `legal_documents` overrides it. */
  async currentVersions(): Promise<Record<LegalDocumentCode, string>> {
    const versions = Object.fromEntries(
      LEGAL_DOCUMENT_CODES.map((code) => [code, LEGAL_DOCUMENTS[code].version]),
    ) as Record<LegalDocumentCode, string>;
    const result = await this.db.execute(sql`
      SELECT setting_value FROM platform_configuration_setting
      WHERE setting_key = 'legal_documents' AND deleted_at IS NULL LIMIT 1`);
    const stored = (result.rows[0] as { setting_value?: Record<string, { version?: unknown }> } | undefined)
      ?.setting_value;
    for (const code of LEGAL_DOCUMENT_CODES) {
      const version = stored?.[code]?.version;
      if (isValidVersion(version)) versions[code] = version;
    }
    return versions;
  }

  /** The action codes this organisation has already recorded, restricted to agreements. */
  private async acceptedActions(organisationId: string): Promise<Set<string>> {
    const result = await this.db.execute(sql`
      SELECT DISTINCT action_code FROM audit_events
      WHERE organisation_id = ${organisationId} AND action_code LIKE ${`${AGREEMENT_ACTION_PREFIX}%`}`);
    return new Set((result.rows as Array<{ action_code: string }>).map((row) => row.action_code));
  }

  async status(organisationId: string): Promise<LegalStatus> {
    const [versions, accepted] = await Promise.all([this.currentVersions(), this.acceptedActions(organisationId)]);
    const documents = LEGAL_DOCUMENT_CODES.map((code) => ({
      code,
      label: LEGAL_DOCUMENTS[code].label,
      path: LEGAL_DOCUMENTS[code].path,
      version: versions[code],
      accepted: accepted.has(agreementActionCode(code, versions[code])),
    }));
    return { documents, pending: documents.filter((doc) => !doc.accepted).map((doc) => doc.code) };
  }

  /** True when every document's current version has been accepted. */
  async isCurrent(organisationId: string): Promise<boolean> {
    return (await this.status(organisationId)).pending.length === 0;
  }

  /**
   * Records acceptance of the current version of each named document by this user. Idempotent: a version already accepted by the
   * organisation is not recorded twice.
   */
  async accept(user: { userId: string; organisationId: string }, documents: readonly string[]): Promise<LegalStatus> {
    const unknown = documents.filter((code) => !isLegalDocument(code));
    if (unknown.length > 0 || documents.length === 0) {
      throw new BadRequestException("Name at least one known agreement to accept");
    }
    const [versions, accepted] = await Promise.all([this.currentVersions(), this.acceptedActions(user.organisationId)]);
    for (const code of new Set(documents as readonly LegalDocumentCode[])) {
      const actionCode = agreementActionCode(code, versions[code]);
      if (accepted.has(actionCode)) continue;
      await appendAuditEvent(this.db, {
        organisationId: user.organisationId,
        actorId: user.userId,
        actionCode,
        resourceType: "organisation",
        resourceId: user.organisationId,
      });
    }
    return this.status(user.organisationId);
  }
}
