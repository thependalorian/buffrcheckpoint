import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { platformIncident, platformIncidentAffectedOrganisations, platformIncidentStatusEvents } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";

export interface CreateIncidentInput {
  title: string;
  description?: string;
  severityCode: string;
  affectedOrganisationIds?: string[];
}

export interface UpdateIncidentStatusInput {
  incidentId: string;
  statusCode: string;
  note?: string;
}

@Injectable()
export class PlatformIncidentsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  async list() {
    return this.db.query.platformIncident.findMany({
      where: isNull(platformIncident.deletedAt),
      orderBy: desc(platformIncident.openedAt),
    });
  }

  async getById(incidentId: string) {
    const incident = await this.db.query.platformIncident.findFirst({
      where: and(eq(platformIncident.id, incidentId), isNull(platformIncident.deletedAt)),
    });
    if (!incident) throw new NotFoundException("Incident not found");
    return incident;
  }

  /** Status timeline for one incident — never rendered before this pass despite being captured on every status change. */
  async statusHistory(incidentId: string) {
    return this.db.query.platformIncidentStatusEvents.findMany({
      where: eq(platformIncidentStatusEvents.incidentId, incidentId),
      orderBy: desc(platformIncidentStatusEvents.occurredAt),
    });
  }

  async listAffectedOrganisations(incidentId: string) {
    return this.db.query.platformIncidentAffectedOrganisations.findMany({
      where: eq(platformIncidentAffectedOrganisations.incidentId, incidentId),
    });
  }

  async create(dto: CreateIncidentInput, user: AuthenticatedUser) {
    const severityCode = await this.typeDefs.id("incident_severity", dto.severityCode);
    const statusCode = await this.typeDefs.id("incident_status", "open");

    const [incident] = await this.db
      .insert(platformIncident)
      .values({
        id: randomUUID(),
        title: dto.title,
        description: dto.description,
        severityCode,
        statusCode,
        openedBy: user.userId,
      })
      .returning();

    await this.db.insert(platformIncidentStatusEvents).values({
      id: randomUUID(),
      incidentId: incident.id,
      fromStatusCode: null,
      toStatusCode: statusCode,
      actorId: user.userId,
    });

    if (dto.affectedOrganisationIds?.length) {
      await this.db.insert(platformIncidentAffectedOrganisations).values(
        dto.affectedOrganisationIds.map((organisationId) => ({
          id: randomUUID(),
          incidentId: incident.id,
          organisationId,
        })),
      );
    }

    return incident;
  }

  async updateStatus(dto: UpdateIncidentStatusInput, user: AuthenticatedUser) {
    const incident = await this.db.query.platformIncident.findFirst({
      where: and(eq(platformIncident.id, dto.incidentId), isNull(platformIncident.deletedAt)),
    });
    if (!incident) throw new NotFoundException("Incident not found");

    const toStatusCode = await this.typeDefs.id("incident_status", dto.statusCode);
    const resolvedStatus = await this.typeDefs.id("incident_status", "resolved");

    await this.db
      .update(platformIncident)
      .set({
        statusCode: toStatusCode,
        resolvedAt: toStatusCode === resolvedStatus ? new Date() : incident.resolvedAt,
      })
      .where(eq(platformIncident.id, dto.incidentId));

    await this.db.insert(platformIncidentStatusEvents).values({
      id: randomUUID(),
      incidentId: dto.incidentId,
      fromStatusCode: incident.statusCode,
      toStatusCode,
      actorId: user.userId,
      note: dto.note,
    });

    const row = await this.db.query.platformIncident.findFirst({ where: eq(platformIncident.id, dto.incidentId) });
    return row ?? null;
  }

  /**
   * Bulk transition from the console's incident queue. One row at a time on
   * purpose — each incident needs its own status event carrying its own
   * from_status, which a single UPDATE ... IN cannot write. Failures are
   * collected rather than thrown so one stale id does not discard the rest of
   * the operator's selection.
   */
  async updateStatusBulk(incidentIds: string[], statusCode: string, user: AuthenticatedUser, note?: string) {
    const succeeded: string[] = [];
    const failed: { id: string; reason: string }[] = [];
    for (const incidentId of incidentIds) {
      try {
        await this.updateStatus({ incidentId, statusCode, note }, user);
        succeeded.push(incidentId);
      } catch (error) {
        failed.push({ id: incidentId, reason: error instanceof Error ? error.message : "Update failed" });
      }
    }
    return { requested: incidentIds.length, updated: succeeded.length, succeeded, failed };
  }
}
