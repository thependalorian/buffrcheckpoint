import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";

import { appendAuditEvent } from "../../common/audit/audit-chain";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { AGREEMENT_ACTION_PREFIX } from "../legal/legal-documents";
import {
  isValidRetentionDays,
  PRIVACY_NOTICE_POLICY_CODE,
  STANDARD_RETENTION_DAYS,
  standardPrivacyNotice,
} from "./standard-defaults";
import { createHash } from "node:crypto";

export const STANDARDS_ACCEPTANCE_DOCUMENT = "organisation_standards";
export const STANDARDS_ACTION_PREFIX = `${AGREEMENT_ACTION_PREFIX}${STANDARDS_ACCEPTANCE_DOCUMENT}:`;

export interface StandardsSummary {
  privacyNotice: {
    versionId: string;
    versionNumber: number;
    text: string | null;
    /** True while the text is still exactly Checkpoint's standard wording for this organisation and retention period. */
    isStandard: boolean;
  } | null;
  retention: { days: number; version: number; isStandard: boolean } | null;
  form: {
    definitionId: string;
    versionId: string;
    name: string | null;
    fields: Array<{ code: string; label: string; required: boolean }>;
  } | null;
  /** The organisation has accepted (or reviewed and kept) its standards. */
  accepted: boolean;
  acceptedAt: string | null;
  ready: boolean;
}

/**
 * Reads the organisation's standards (visitor privacy notice, retention period, check-in form) and records that its owner accepted
 * them. Acceptance is an audit-chain event `agreement.accepted:organisation_standards:<fingerprint>`, where the fingerprint covers the
 * exact notice text, retention period and form version accepted, so the record says what was accepted, not just that something was.
 */
@Injectable()
export class OrganisationStandardsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** The platform's standard retention, from the setting `organisation_defaults` when valid, else the built-in placeholder. */
  async standardRetentionDays(): Promise<number> {
    const result = await this.db.execute(sql`
      SELECT setting_value FROM platform_configuration_setting
      WHERE setting_key = 'organisation_defaults' AND deleted_at IS NULL LIMIT 1`);
    const stored = (result.rows[0] as { setting_value?: { retentionDays?: unknown } } | undefined)?.setting_value
      ?.retentionDays;
    return isValidRetentionDays(stored) ? stored : STANDARD_RETENTION_DAYS;
  }

  private async organisationName(organisationId: string): Promise<string> {
    const result = await this.db.execute(sql`
      SELECT coalesce(nullif(btrim(trading_name), ''), legal_name) AS name FROM organisations WHERE id = ${organisationId} LIMIT 1`);
    return (result.rows[0] as { name?: string } | undefined)?.name ?? "";
  }

  async summary(organisationId: string): Promise<StandardsSummary> {
    const [noticeResult, retentionResult, formResult, acceptedResult, name, standardDays] = await Promise.all([
      this.db.execute(sql`
        SELECT v.id, v.version_number, v.content_artifact_id, v.content_hash
        FROM visitor_policy_versions v
        JOIN visitor_policy_documents d ON d.id = v.policy_document_id
        JOIN type_definition st ON st.id = v.status_code AND st.domain = 'policy_version_status' AND st.code = 'published'
        WHERE d.organisation_id = ${organisationId} AND d.policy_code = ${PRIVACY_NOTICE_POLICY_CODE}
          AND d.deleted_at IS NULL AND v.deleted_at IS NULL
        ORDER BY v.version_number DESC LIMIT 1`),
      this.db.execute(sql`
        SELECT retention_days, version FROM retention_policies
        WHERE organisation_id = ${organisationId} AND site_id IS NULL AND deleted_at IS NULL
        ORDER BY version DESC LIMIT 1`),
      this.db.execute(sql`
        SELECT f.id AS definition_id, f.form_name, fv.id AS version_id
        FROM check_in_form_definitions f
        JOIN check_in_form_versions fv ON fv.form_definition_id = f.id AND fv.deleted_at IS NULL
        JOIN type_definition st ON st.id = fv.status_code AND st.domain = 'form_version_status' AND st.code = 'published'
        WHERE f.organisation_id = ${organisationId} AND f.deleted_at IS NULL
        ORDER BY fv.version_number DESC LIMIT 1`),
      this.db.execute(sql`
        SELECT occurred_at FROM audit_events
        WHERE organisation_id = ${organisationId} AND action_code LIKE ${`${STANDARDS_ACTION_PREFIX}%`}
        ORDER BY occurred_at DESC LIMIT 1`),
      this.organisationName(organisationId),
      this.standardRetentionDays(),
    ]);

    const retentionRow = retentionResult.rows[0] as { retention_days: number; version: number } | undefined;
    const noticeRow = noticeResult.rows[0] as
      | { id: string; version_number: number; content_artifact_id: string; content_hash: string }
      | undefined;
    const formRow = formResult.rows[0] as
      | { definition_id: string; form_name: string | null; version_id: string }
      | undefined;

    const retention = retentionRow
      ? {
          days: retentionRow.retention_days,
          version: retentionRow.version,
          isStandard: retentionRow.retention_days === standardDays,
        }
      : null;

    let privacyNotice: StandardsSummary["privacyNotice"] = null;
    if (noticeRow) {
      const inline = noticeRow.content_artifact_id.startsWith("inline:")
        ? noticeRow.content_artifact_id.slice(7)
        : null;
      const standardText = standardPrivacyNotice({
        organisationName: name,
        retentionDays: retention?.days ?? standardDays,
      });
      privacyNotice = {
        versionId: noticeRow.id,
        versionNumber: noticeRow.version_number,
        text: inline,
        isStandard: noticeRow.content_hash === createHash("sha256").update(standardText).digest("hex"),
      };
    }

    let form: StandardsSummary["form"] = null;
    if (formRow) {
      const fields = await this.db.execute(sql`
        SELECT field_code, field_label, required FROM check_in_form_fields
        WHERE form_version_id = ${formRow.version_id} AND deleted_at IS NULL ORDER BY display_order`);
      form = {
        definitionId: formRow.definition_id,
        versionId: formRow.version_id,
        name: formRow.form_name,
        fields: (fields.rows as Array<{ field_code: string; field_label: string | null; required: boolean }>).map(
          (row) => ({
            code: row.field_code,
            label: row.field_label ?? row.field_code,
            required: row.required,
          }),
        ),
      };
    }

    const acceptedRow = acceptedResult.rows[0] as { occurred_at?: string | Date } | undefined;
    return {
      privacyNotice,
      retention,
      form,
      accepted: Boolean(acceptedRow),
      acceptedAt: acceptedRow?.occurred_at ? new Date(acceptedRow.occurred_at).toISOString() : null,
      ready: Boolean(privacyNotice && retention && form),
    };
  }

  /** What exactly is being accepted: the notice text, the retention period and the form version, hashed. */
  fingerprint(summary: StandardsSummary): string {
    return createHash("sha256")
      .update(
        [
          summary.privacyNotice?.text ?? summary.privacyNotice?.versionId ?? "",
          summary.retention?.days ?? "",
          summary.form?.versionId ?? "",
        ].join("|"),
      )
      .digest("hex")
      .slice(0, 12);
  }

  async accept(user: { userId: string; organisationId: string }): Promise<StandardsSummary> {
    const summary = await this.summary(user.organisationId);
    if (!summary.ready) {
      throw new BadRequestException("Your standards are not set up yet. Open setup again and they will be created.");
    }
    await appendAuditEvent(this.db, {
      organisationId: user.organisationId,
      actorId: user.userId,
      actionCode: `${STANDARDS_ACTION_PREFIX}${this.fingerprint(summary)}`,
      resourceType: "organisation",
      resourceId: user.organisationId,
    });
    return this.summary(user.organisationId);
  }
}
