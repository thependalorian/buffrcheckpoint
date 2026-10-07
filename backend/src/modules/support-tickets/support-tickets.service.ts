import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { applicationUsers, supportTicket, supportTicketComments, supportTicketStatusEvents } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { TemplatedEmailService } from "../notifications/templated-email.service";
import { randomUUID } from "node:crypto";

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
    private readonly templatedEmail: TemplatedEmailService,
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

    await this.acknowledgeToRequester(ticket, user);
    return ticket;
  }

  /** The person who opened the ticket gets a receipt, when they belong to the organisation it is for (not for tickets staff open on a customer's behalf). */
  private async acknowledgeToRequester(ticket: typeof supportTicket.$inferSelect, user: AuthenticatedUser) {
    if (!ticket.organisationId || ticket.organisationId !== user.organisationId) return;
    const requester = await this.db.query.applicationUsers.findFirst({ where: eq(applicationUsers.id, user.userId) });
    if (!requester) return;
    const reference = ticket.id.slice(0, 8).toUpperCase();
    await this.templatedEmail.send({
      templateCode: "support_ticket_ack",
      organisationId: ticket.organisationId,
      to: requester.email,
      // The seeded row asks for {{ticketId}} (as support_ticket_reply does); {{ticketReference}} is kept for rows seeded
      // before migration 0064, and {{name}} for the greeting of those rows — the requester has no stored name here.
      variables: { name: "", subject: ticket.subject, ticketId: reference, ticketReference: reference },
      fallback: {
        subject: `We received your request: ${ticket.subject}`,
        body: `We received your support request.\n\nSubject: ${ticket.subject}\nReference: ${reference}\n\nOur team will reply by email and in the Support section of your dashboard. Reply to this email to add details.`,
      },
    });
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
    if (user.roleCode === "platform_support") await this.notifyRequesterOfReply(ticket, body);
    return comment;
  }

  /** A reply from our team is emailed to the person who opened the ticket, so they do not have to keep checking the dashboard. */
  private async notifyRequesterOfReply(ticket: typeof supportTicket.$inferSelect, reply: string) {
    if (!ticket.organisationId || !ticket.requestedBy) return;
    const requester = await this.db.query.applicationUsers.findFirst({
      where: eq(applicationUsers.id, ticket.requestedBy),
    });
    if (!requester) return;
    const reference = ticket.id.slice(0, 8).toUpperCase();
    await this.templatedEmail.send({
      templateCode: "support_ticket_reply",
      organisationId: ticket.organisationId,
      to: requester.email,
      variables: { subject: ticket.subject, ticketId: reference, reply: reply.trim().slice(0, 4000) },
      fallback: {
        subject: `Re: ${ticket.subject} [${reference}]`,
        body: `Our team has replied to your support request.\n\nReference: ${reference}\nSubject: ${ticket.subject}\n\n${reply.trim().slice(0, 4000)}\n\nReply to this email to add details, or open the Support section of your dashboard.`,
      },
    });
  }

  async listComments(ticketId: string) {
    return this.db.query.supportTicketComments.findMany({
      where: eq(supportTicketComments.ticketId, ticketId),
      orderBy: supportTicketComments.createdAt,
    });
  }
}
