import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { supportTicket, supportTicketComments, supportTicketStatusEvents } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";

export interface CreateTicketInput {
  organisationId?: string;
  subject: string;
  description?: string;
  severityCode: string;
}

@Injectable()
export class SupportTicketsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  async list() {
    return this.db.query.supportTicket.findMany({
      where: isNull(supportTicket.deletedAt),
      orderBy: desc(supportTicket.createdAt),
    });
  }

  /** An organisation's own tickets — the customer-facing controller's list, scoped by caller organisationId. */
  async listForOrganisation(organisationId: string) {
    return this.db.query.supportTicket.findMany({
      where: and(eq(supportTicket.organisationId, organisationId), isNull(supportTicket.deletedAt)),
      orderBy: desc(supportTicket.createdAt),
    });
  }

  async getById(ticketId: string) {
    const ticket = await this.db.query.supportTicket.findFirst({
      where: and(eq(supportTicket.id, ticketId), isNull(supportTicket.deletedAt)),
    });
    if (!ticket) throw new NotFoundException("Ticket not found");
    return ticket;
  }

  /** Tenancy check for the customer-facing controller — a ticket ID alone must not read/write across orgs. */
  async assertOwnedByOrganisation(ticketId: string, organisationId: string) {
    const ticket = await this.db.query.supportTicket.findFirst({
      where: and(
        eq(supportTicket.id, ticketId),
        eq(supportTicket.organisationId, organisationId),
        isNull(supportTicket.deletedAt),
      ),
    });
    if (!ticket) throw new NotFoundException("Ticket not found");
    return ticket;
  }

  async create(dto: CreateTicketInput, user: AuthenticatedUser) {
    const severityCode = await this.typeDefs.id("ticket_severity", dto.severityCode);
    const statusCode = await this.typeDefs.id("ticket_status", "open");

    const [ticket] = await this.db
      .insert(supportTicket)
      .values({
        id: randomUUID(),
        organisationId: dto.organisationId,
        subject: dto.subject,
        description: dto.description,
        severityCode,
        statusCode,
        requestedBy: user.userId,
      })
      .returning();

    await this.db.insert(supportTicketStatusEvents).values({
      id: randomUUID(),
      ticketId: ticket.id,
      fromStatusCode: null,
      toStatusCode: statusCode,
      actorId: user.userId,
    });

    return ticket;
  }

  async updateStatus(ticketId: string, statusCode: string, user: AuthenticatedUser, note?: string) {
    const ticket = await this.db.query.supportTicket.findFirst({ where: eq(supportTicket.id, ticketId) });
    if (!ticket) throw new NotFoundException("Ticket not found");

    const toStatusCode = await this.typeDefs.id("ticket_status", statusCode);
    await this.db.update(supportTicket).set({ statusCode: toStatusCode }).where(eq(supportTicket.id, ticketId));
    await this.db.insert(supportTicketStatusEvents).values({
      id: randomUUID(),
      ticketId,
      fromStatusCode: ticket.statusCode,
      toStatusCode,
      actorId: user.userId,
      note,
    });

    const row = await this.db.query.supportTicket.findFirst({ where: eq(supportTicket.id, ticketId) });
    return row ?? null;
  }

  /**
   * Same transition as updateStatus, applied to a selection from the console's
   * queue. Deliberately one row at a time rather than a single UPDATE ... IN:
   * every ticket still needs its own status event with its own from_status, and
   * a bulk UPDATE cannot produce those. Rows that fail are reported back rather
   * than aborting the batch, so a stale id in the selection does not silently
   * discard the operator's other 19 transitions.
   */
  async updateStatusBulk(ticketIds: string[], statusCode: string, user: AuthenticatedUser, note?: string) {
    const succeeded: string[] = [];
    const failed: { id: string; reason: string }[] = [];
    for (const ticketId of ticketIds) {
      try {
        await this.updateStatus(ticketId, statusCode, user, note);
        succeeded.push(ticketId);
      } catch (error) {
        failed.push({ id: ticketId, reason: error instanceof Error ? error.message : "Update failed" });
      }
    }
    return { requested: ticketIds.length, updated: succeeded.length, succeeded, failed };
  }

  async addComment(ticketId: string, body: string, user: AuthenticatedUser) {
    const ticket = await this.db.query.supportTicket.findFirst({ where: eq(supportTicket.id, ticketId) });
    if (!ticket) throw new NotFoundException("Ticket not found");

    const authorTypeCode = await this.typeDefs.id(
      "support_ticket_comment_author_type",
      user.roleCode === "platform_support" ? "platform_staff" : "organisation_member",
    );

    const [comment] = await this.db
      .insert(supportTicketComments)
      .values({ id: randomUUID(), ticketId, authorId: user.userId, authorTypeCode, body })
      .returning();
    return comment;
  }

  async listComments(ticketId: string) {
    return this.db.query.supportTicketComments.findMany({
      where: eq(supportTicketComments.ticketId, ticketId),
      orderBy: supportTicketComments.createdAt,
    });
  }
}
