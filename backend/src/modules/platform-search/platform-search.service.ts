import { Inject, Injectable } from "@nestjs/common";
import { and, eq, ilike, isNull, or } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  crmDeal,
  managedKioskDevices,
  organisations,
  platformIncident,
  supportTicket,
  typeDefinition,
} from "../../db/schema";

const RESULTS_PER_CATEGORY = 10;

export interface SearchHit {
  category: "organisation" | "ticket" | "incident" | "deal" | "device";
  id: string;
  title: string;
  subtitle: string | null;
  status: string | null;
  organisationId: string | null;
  href: string;
}

/**
 * Cross-register lookup for the console's single search box. Deliberately
 * ILIKE over a handful of name columns rather than a full-text index: these
 * registers are in the thousands of rows, and a tsvector column plus its
 * maintenance is not yet worth the schema surface. Revisit if the org register
 * outgrows a sequential scan.
 *
 * Every category is gated on the permission that guards its own screen, so a
 * search never becomes a way around a queue the caller cannot open.
 */
@Injectable()
export class PlatformSearchService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async search(term: string, user: AuthenticatedUser): Promise<{ term: string; hits: SearchHit[]; skipped: string[] }> {
    const trimmed = term.trim();
    if (trimmed.length < 2) return { term: trimmed, hits: [], skipped: [] };

    // Escape the LIKE metacharacters so a user searching for "50%" gets the
    // literal string, not a wildcard.
    const pattern = `%${trimmed.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
    const can = (permission: string) => user.permissions.includes(permission);

    const hits: SearchHit[] = [];
    const skipped: string[] = [];

    if (can(PERMISSIONS.PLATFORM_DASHBOARD_READ)) {
      const rows = await this.db
        .select({
          id: organisations.id,
          legalName: organisations.legalName,
          tradingName: organisations.tradingName,
          registrationReference: organisations.registrationReference,
        })
        .from(organisations)
        .where(
          and(
            isNull(organisations.deletedAt),
            or(
              ilike(organisations.legalName, pattern),
              ilike(organisations.tradingName, pattern),
              ilike(organisations.registrationReference, pattern),
            ),
          ),
        )
        .limit(RESULTS_PER_CATEGORY);
      hits.push(
        ...rows.map((row) => ({
          category: "organisation" as const,
          id: row.id,
          title: row.tradingName ?? row.legalName,
          subtitle: row.tradingName ? row.legalName : row.registrationReference,
          status: null,
          organisationId: row.id,
          href: `/organisations/${row.id}`,
        })),
      );
    } else {
      skipped.push("organisation");
    }

    if (can(PERMISSIONS.PLATFORM_TICKET_MANAGE)) {
      const rows = await this.db
        .select({
          id: supportTicket.id,
          subject: supportTicket.subject,
          organisationId: supportTicket.organisationId,
          organisationName: organisations.legalName,
          status: typeDefinition.label,
        })
        .from(supportTicket)
        .leftJoin(organisations, eq(supportTicket.organisationId, organisations.id))
        .leftJoin(typeDefinition, eq(supportTicket.statusCode, typeDefinition.id))
        .where(
          and(
            isNull(supportTicket.deletedAt),
            or(ilike(supportTicket.subject, pattern), ilike(supportTicket.description, pattern)),
          ),
        )
        .limit(RESULTS_PER_CATEGORY);
      hits.push(
        ...rows.map((row) => ({
          category: "ticket" as const,
          id: row.id,
          title: row.subject,
          subtitle: row.organisationName,
          status: row.status,
          organisationId: row.organisationId,
          href: `/tickets/${row.id}`,
        })),
      );
    } else {
      skipped.push("ticket");
    }

    if (can(PERMISSIONS.PLATFORM_DASHBOARD_READ)) {
      const rows = await this.db
        .select({
          id: platformIncident.id,
          title: platformIncident.title,
          status: typeDefinition.label,
        })
        .from(platformIncident)
        .leftJoin(typeDefinition, eq(platformIncident.statusCode, typeDefinition.id))
        .where(
          and(
            isNull(platformIncident.deletedAt),
            or(ilike(platformIncident.title, pattern), ilike(platformIncident.description, pattern)),
          ),
        )
        .limit(RESULTS_PER_CATEGORY);
      hits.push(
        ...rows.map((row) => ({
          category: "incident" as const,
          id: row.id,
          title: row.title,
          subtitle: null,
          status: row.status,
          organisationId: null,
          href: `/incidents/${row.id}`,
        })),
      );
    } else {
      skipped.push("incident");
    }

    if (can(PERMISSIONS.PLATFORM_CRM_MANAGE)) {
      const rows = await this.db
        .select({
          id: crmDeal.id,
          prospectName: crmDeal.prospectName,
          organisationId: crmDeal.organisationId,
          organisationName: organisations.legalName,
          status: typeDefinition.label,
        })
        .from(crmDeal)
        .leftJoin(organisations, eq(crmDeal.organisationId, organisations.id))
        .leftJoin(typeDefinition, eq(crmDeal.stageCode, typeDefinition.id))
        .where(
          and(
            isNull(crmDeal.deletedAt),
            or(ilike(crmDeal.prospectName, pattern), ilike(organisations.legalName, pattern)),
          ),
        )
        .limit(RESULTS_PER_CATEGORY);
      hits.push(
        ...rows.map((row) => ({
          category: "deal" as const,
          id: row.id,
          title: row.prospectName ?? row.organisationName ?? "Unnamed deal",
          subtitle: row.organisationName,
          status: row.status,
          organisationId: row.organisationId,
          href: `/crm/${row.id}`,
        })),
      );
    } else {
      skipped.push("deal");
    }

    if (can(PERMISSIONS.PLATFORM_DASHBOARD_READ)) {
      const rows = await this.db
        .select({
          id: managedKioskDevices.id,
          deviceName: managedKioskDevices.deviceName,
          serialNumber: managedKioskDevices.serialNumber,
          model: managedKioskDevices.model,
          organisationId: managedKioskDevices.organisationId,
          organisationName: organisations.legalName,
          status: typeDefinition.label,
        })
        .from(managedKioskDevices)
        .leftJoin(organisations, eq(managedKioskDevices.organisationId, organisations.id))
        .leftJoin(typeDefinition, eq(managedKioskDevices.cranComplianceStatusCode, typeDefinition.id))
        .where(
          and(
            isNull(managedKioskDevices.deletedAt),
            or(
              ilike(managedKioskDevices.deviceName, pattern),
              ilike(managedKioskDevices.serialNumber, pattern),
              ilike(managedKioskDevices.model, pattern),
            ),
          ),
        )
        .limit(RESULTS_PER_CATEGORY);
      hits.push(
        ...rows.map((row) => ({
          category: "device" as const,
          id: row.id,
          title: row.deviceName ?? `${row.model} ${row.serialNumber}`,
          subtitle: row.organisationName,
          status: row.status,
          organisationId: row.organisationId,
          // The device detail page requires organisationId as a query param
          // (it isn't derivable from the id alone without another fetch) —
          // omitting it here would hand back a dead-end "missing
          // organisationId" error page instead of the device.
          href: `/devices/${row.id}?organisationId=${row.organisationId}`,
        })),
      );
    } else {
      skipped.push("device");
    }

    return { term: trimmed, hits, skipped };
  }
}
