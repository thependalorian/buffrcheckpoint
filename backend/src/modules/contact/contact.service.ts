import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { applicationUsers, contactEnquiries, contactEnquiryStatusLog } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { TemplatedEmailService } from "../notifications/templated-email.service";

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly templatedEmail: TemplatedEmailService,
  ) {}

  async submit(input: {
    name: string;
    email: string;
    company?: string;
    message: string;
    website?: string;
  }) {
    if (input.website?.trim()) {
      return { ok: true };
    }

    const receivedStatus = await this.typeDefs.id("contact_enquiry_status", "received");
    const enquiryId = randomUUID();
    await this.db.insert(contactEnquiries).values({
      id: enquiryId,
      organisationId: null,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      company: input.company?.trim() ?? null,
      message: input.message.trim(),
      statusCode: receivedStatus,
    });
    await this.db.insert(contactEnquiryStatusLog).values({
      id: randomUUID(),
      enquiryId,
      statusCode: receivedStatus,
      reason: "enquiry received",
    });

    const opsInbox = TemplatedEmailService.resolveOpsInbox();
    const organisationId = await this.resolveOpsOrganisationId();
    const adminBase = (process.env.PUBLIC_ADMIN_BASE_URL ?? "https://admin.buffrcheckpoint.com").replace(/\/$/, "");
    const signupUrl = `${adminBase}/auth/register`;

    if (opsInbox && organisationId) {
      try {
        await this.templatedEmail.send({
          templateCode: "ops_contact_enquiry",
          organisationId,
          to: opsInbox,
          variables: {
            name: input.name.trim(),
            email: input.email.trim().toLowerCase(),
            company: input.company?.trim() || "—",
            message: input.message.trim(),
          },
          fallback: {
            subject: `Buffr Checkpoint contact: ${input.name.trim()}`,
            body: `Contact from ${input.name.trim()} <${input.email.trim().toLowerCase()}>\nCompany: ${input.company?.trim() || "—"}\n\n${input.message.trim()}`,
          },
        });

        await this.templatedEmail.send({
          templateCode: "ops_contact_ack",
          organisationId,
          to: input.email.trim().toLowerCase(),
          variables: {
            name: input.name.trim(),
            signupUrl,
          },
          fallback: {
            subject: "We received your message — Buffr Checkpoint",
            body: `Hi ${input.name.trim()},\n\nThanks for contacting Buffr Checkpoint. Our team has received your message and will reply shortly.\n\nIf you are ready to start, create an account at ${signupUrl}.`,
          },
        });

        const emailedStatus = await this.typeDefs.id("contact_enquiry_status", "emailed");
        await this.db.update(contactEnquiries).set({ statusCode: emailedStatus }).where(eq(contactEnquiries.id, enquiryId));
        await this.db.insert(contactEnquiryStatusLog).values({
          id: randomUUID(),
          enquiryId,
          statusCode: emailedStatus,
          reason: "ops email dispatched",
        });
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        this.logger.error(`ops email failed enquiryId=${enquiryId}: ${detail}`);
      }
    }

    return { ok: true };
  }

  /** Outbox requires an organisation_id — prefer ops inbox user's org, else any active user org. */
  private async resolveOpsOrganisationId(): Promise<string | null> {
    const opsInbox = TemplatedEmailService.resolveOpsInbox();
    if (opsInbox) {
      const user = await this.db.query.applicationUsers.findFirst({
        where: and(eq(applicationUsers.email, opsInbox.toLowerCase()), isNull(applicationUsers.deletedAt)),
      });
      if (user?.organisationId) return user.organisationId;
    }
    const anyStaff = await this.db.query.applicationUsers.findFirst({
      where: isNull(applicationUsers.deletedAt),
    });
    return anyStaff?.organisationId ?? null;
  }
}
