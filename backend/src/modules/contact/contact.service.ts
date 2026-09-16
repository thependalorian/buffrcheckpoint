import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { contactEnquiries, contactEnquiryStatusLog } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { createEmailAdapter } from "../notifications/email.adapter";

@Injectable()
export class ContactService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
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

    const opsInboxRaw = process.env.CONTACT_OPS_EMAIL ?? process.env.RESEND_FROM_EMAIL;
    if (opsInboxRaw && process.env.RESEND_API_KEY) {
      try {
        const opsInbox = opsInboxRaw.includes("<")
          ? (opsInboxRaw.match(/<([^>]+)>/)?.[1] ?? opsInboxRaw)
          : opsInboxRaw;
        const adapter = createEmailAdapter();
        await adapter.send(
          opsInbox,
          `Contact from ${input.name} <${input.email}>\nCompany: ${input.company ?? "—"}\n\n${input.message}`,
          { subject: `Buffr Checkpoint contact: ${input.name}` },
        );
        const emailedStatus = await this.typeDefs.id("contact_enquiry_status", "emailed");
        await this.db.update(contactEnquiries).set({ statusCode: emailedStatus }).where(eq(contactEnquiries.id, enquiryId));
        await this.db.insert(contactEnquiryStatusLog).values({
          id: randomUUID(),
          enquiryId,
          statusCode: emailedStatus,
          reason: "ops email dispatched",
        });
      } catch {
        // Durable row remains; email failure must not break anti-enumeration response.
      }
    }

    return { ok: true };
  }
}
