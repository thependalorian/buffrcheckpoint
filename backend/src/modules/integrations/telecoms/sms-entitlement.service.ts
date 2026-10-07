import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";

import type { Database } from "../../../db/client";
import { DB } from "../../../db/db.module";
import { amountToCents, type BillingMonth, currentBillingMonth, DEFAULT_SMS_UNIT_PRICE } from "./sms-usage-billing";

/**
 * Safety limit on texts per organisation per month. This is not an entitlement and not an allowance included in a price: texts are billed
 * by use (N$1.00 each, see sms-usage-billing.ts), so the limit exists only to stop a runaway (a loop, a flood of check-ins, a stolen
 * session) from sending thousands of billable messages before anyone notices. Raise it for everyone with the setting `sms_limit:default`
 * or for one organisation with `sms_limit:<organisation id>` (value `{ "perMonth": 5000 }`); both are audited platform settings.
 */
export const DEFAULT_SMS_LIMIT_PER_MONTH = 1000;

export type SmsEntitlementDenial = "addon_not_active" | "monthly_limit_reached";

export interface SmsEntitlement {
  allowed: boolean;
  reason: SmsEntitlementDenial | null;
  used: number;
  limit: number;
}

export interface SmsUsageSummary {
  month: string;
  sent: number;
  unitPrice: string;
  limit: number;
}

/**
 * Whether an organisation may send a text right now, and what it has sent. Email costs us nothing; every text is bought from the
 * provider and billed to the organisation by use, so a text needs an active "sms" add-on on the organisation's subscription and a month
 * that is under the safety limit. A refused text never reaches the provider, so it spends no credit. Two sends racing at the limit can
 * overshoot by the number of concurrent sends; that is accepted and bounded.
 */
@Injectable()
export class SmsEntitlementService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async hasActiveAddon(organisationId: string): Promise<boolean> {
    const result = await this.db.execute(sql`
      SELECT 1
      FROM organisation_subscription_addon a
      JOIN type_definition status ON status.id = a.status_code
      JOIN subscription_catalog_item item ON item.id = a.catalog_item_id
      JOIN type_definition code ON code.id = item.item_code
      WHERE a.organisation_id = ${organisationId}
        AND a.deleted_at IS NULL
        AND status.domain = 'subscription_addon_status' AND status.code = 'active'
        AND code.domain = 'subscription_addon' AND code.code = 'sms'
      LIMIT 1`);
    return result.rows.length > 0;
  }

  private async setting<T>(key: string): Promise<T | null> {
    const result = await this.db.execute(sql`
      SELECT setting_value FROM platform_configuration_setting WHERE setting_key = ${key} AND deleted_at IS NULL LIMIT 1`);
    return ((result.rows[0] as { setting_value?: T } | undefined)?.setting_value ?? null) as T | null;
  }

  async limitFor(organisationId: string): Promise<number> {
    for (const key of [`sms_limit:${organisationId}`, "sms_limit:default"]) {
      const value = (await this.setting<{ perMonth?: unknown }>(key))?.perMonth;
      if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
    }
    return DEFAULT_SMS_LIMIT_PER_MONTH;
  }

  /** The price of one text for this organisation, as a two-decimal amount. A malformed setting falls back to the platform default. */
  async unitPriceFor(organisationId: string): Promise<string> {
    for (const key of [`sms_unit_price:${organisationId}`, "sms_unit_price:default"]) {
      const value = (await this.setting<{ amount?: unknown }>(key))?.amount;
      if (typeof value === "string" && amountToCents(value) !== null) return value;
    }
    return DEFAULT_SMS_UNIT_PRICE;
  }

  /** Texts handed to the provider for this organisation inside [start, end), counted from the event log. */
  async sentBetween(organisationId: string, start: Date, end: Date): Promise<number> {
    const result = await this.db.execute(sql`
      SELECT count(*)::int AS sent
      FROM sms_contact_confirmation_events
      WHERE organisation_id = ${organisationId}
        AND outcome_code = 'sent'
        AND occurred_at >= ${start.toISOString()}
        AND occurred_at < ${end.toISOString()}`);
    return Number((result.rows[0] as { sent?: number } | undefined)?.sent ?? 0);
  }

  async usageFor(organisationId: string, month: BillingMonth = currentBillingMonth()): Promise<SmsUsageSummary> {
    const [sent, unitPrice, limit] = await Promise.all([
      this.sentBetween(organisationId, month.start, month.end),
      this.unitPriceFor(organisationId),
      this.limitFor(organisationId),
    ]);
    return { month: month.key, sent, unitPrice, limit };
  }

  async check(organisationId: string, now = new Date()): Promise<SmsEntitlement> {
    if (!(await this.hasActiveAddon(organisationId))) {
      return { allowed: false, reason: "addon_not_active", used: 0, limit: 0 };
    }
    const month = currentBillingMonth(now);
    const [limit, used] = await Promise.all([
      this.limitFor(organisationId),
      this.sentBetween(organisationId, month.start, month.end),
    ]);
    return used >= limit
      ? { allowed: false, reason: "monthly_limit_reached", used, limit }
      : { allowed: true, reason: null, used, limit };
  }
}
