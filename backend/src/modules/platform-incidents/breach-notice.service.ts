import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { appendAuditEvent } from "../../common/audit/audit-chain";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { applicationUsers, organisationMemberships, organisations, roleDefinitions, typeDefinition } from "../../db/schema";
import { TemplatedEmailService } from "../notifications/templated-email.service";

export interface BreachNoticeInput {
  organisationId: string;
  whatHappened: string;
  whenDiscovered: string;
  dataAffected: string;
  peopleAffected: string;
  consequences: string;
  measures: string;
}

const ADMIN_ROLE_CODES = ["owner_operator", "system_administrator"];

/**
 * Tells a customer, as the controller, about a personal data breach affecting its data (draft Data Protection Bill s22(3) and (4)). Sent to
 * every administrator of the organisation, always (it cannot be switched off), and recorded in the organisation's audit chain. Triggered by
 * Buffr staff, never automatically: deciding that a breach has happened is a human call.
 */
@Injectable()
export class BreachNoticeService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly templatedEmail: TemplatedEmailService,
  ) {}

  async adminEmails(organisationId: string): Promise<string[]> {
    const memberships = await this.db.query.organisationMemberships.findMany({
      where: and(eq(organisationMemberships.organisationId, organisationId), isNull(organisationMemberships.deletedAt)),
    });
    if (memberships.length === 0) return [];
    const roles = await this.db.query.roleDefinitions.findMany({
      where: inArray(
        roleDefinitions.id,
        memberships.map((m) => m.roleId),
      ),
    });
    const codes = await this.db.query.typeDefinition.findMany({
      where: inArray(
        typeDefinition.id,
        roles.map((r) => r.roleCode),
      ),
    });
    const adminRoleIds = new Set(
      roles.filter((r) => ADMIN_ROLE_CODES.includes(codes.find((c) => c.id === r.roleCode)?.code ?? "")).map((r) => r.id),
    );
    const userIds = memberships.filter((m) => adminRoleIds.has(m.roleId)).map((m) => m.userId);
    if (userIds.length === 0) return [];
    const users = await this.db.query.applicationUsers.findMany({
      where: and(inArray(applicationUsers.id, userIds), isNull(applicationUsers.deletedAt)),
    });
    return [...new Set(users.map((u) => u.email.trim().toLowerCase()))];
  }

  async notify(input: BreachNoticeInput, user: AuthenticatedUser) {
    const organisation = await this.db.query.organisations.findFirst({
      where: and(eq(organisations.id, input.organisationId), isNull(organisations.deletedAt)),
    });
    if (!organisation) throw new NotFoundException("Organisation not found");
    const organisationName = organisation.tradingName?.trim() || organisation.legalName;

    const recipients = await this.adminEmails(input.organisationId);
    let sent = 0;
    for (const to of recipients) {
      const result = await this.templatedEmail.send({
        templateCode: "customer_breach_notice",
        organisationId: input.organisationId,
        to,
        variables: {
          organisationName,
          whatHappened: input.whatHappened,
          whenDiscovered: input.whenDiscovered,
          dataAffected: input.dataAffected,
          peopleAffected: input.peopleAffected,
          consequences: input.consequences,
          measures: input.measures,
        },
        fallback: {
          subject: `Important: personal data incident affecting ${organisationName}`,
          body: [
            `We are writing to tell you about an incident that affects personal data held for ${organisationName} in Buffr Checkpoint.`,
            `What happened: ${input.whatHappened}`,
            `When we became aware: ${input.whenDiscovered}`,
            `Information involved: ${input.dataAffected}`,
            `People affected (approximate): ${input.peopleAffected}`,
            `Likely consequences: ${input.consequences}`,
            `What we have done and what we are doing: ${input.measures}`,
          ].join("\n\n"),
        },
      });
      if (result !== null) sent += 1;
    }

    await appendAuditEvent(this.db, {
      organisationId: input.organisationId,
      actorId: user.userId ?? null,
      actionCode: `breach.customer_notified:${sent}`,
      resourceType: "organisation",
      resourceId: input.organisationId,
    });
    return { organisationId: input.organisationId, administrators: recipients.length, queued: sent };
  }
}
