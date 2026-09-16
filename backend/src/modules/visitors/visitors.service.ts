import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";

import {
  PersonalDataProtectionService,
  type ProtectedPersonalDataEnvelope,
} from "../../common/data-protection/personal-data-protection.service";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { visitorPersonalData, visitorSubjects } from "../../db/schema";
import { randomUUID } from "node:crypto";

export interface CreateVisitorInput {
  name?: string;
  phone?: string; // raw phone, protected before storage — never stored raw
  preferredLanguageCode?: string;
}

interface VisitorPersonalFields {
  name?: string;
  phone?: string;
}

// Section 11.3/§5.2: visitor identity is split — visitor_subjects is a
// stable, PII-free reference; visitor_personal_data holds the protected
// payload (PersonalDataProtectionService's envelope, local-dev-stubbed KMS
// per this pass's scope decision) plus keyed lookup HMACs for exact-match
// queries (never a plain hash — the Canonical Engineering Constitution's
// explicit correction against dictionary-attack-vulnerable name/phone hashes).
@Injectable()
export class VisitorsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly dataProtection: PersonalDataProtectionService,
  ) {}

  async create(input: CreateVisitorInput, user: AuthenticatedUser) {
    const visitorId = randomUUID();

    const [createdSubject] = await this.db
      .insert(visitorSubjects)
      .values({
        id: visitorId,
        organisationId: user.organisationId,
      })
      .returning();

    const payload: VisitorPersonalFields = { name: input.name, phone: input.phone };
    await this.db.insert(visitorPersonalData).values({
      visitorId,
      encryptedPayload: this.dataProtection.encrypt(JSON.stringify(payload)),
      nameLookupHmac: input.name ? this.dataProtection.lookupHmac(input.name, "NAME_HASH_PEPPER") : null,
      phoneLookupHmac: input.phone ? this.dataProtection.lookupHmac(input.phone, "PHONE_HASH_PEPPER") : null,
      preferredLanguageCode: input.preferredLanguageCode ?? null,
    });

    return createdSubject;
  }

  async findByPhone(phone: string, user: AuthenticatedUser) {
    const phoneHmac = this.dataProtection.lookupHmac(phone, "PHONE_HASH_PEPPER");
    const personalData = await this.db.query.visitorPersonalData.findFirst({
      where: eq(visitorPersonalData.phoneLookupHmac, phoneHmac),
    });
    if (!personalData) return null;

    const subject = await this.db.query.visitorSubjects.findFirst({
      where: and(
        eq(visitorSubjects.id, personalData.visitorId),
        eq(visitorSubjects.organisationId, user.organisationId),
        isNull(visitorSubjects.deletedAt),
      ),
    });
    return subject ?? null;
  }

  // Backs the admin app's Visitors screen. Never returns the protected
  // payload's phone field — Part Three §4's default-table-response rule
  // ("phone number: reveal only where role and workflow require it")
  // applies even though today's envelope is a local-dev stub, not real KMS
  // ciphertext (Section 13.1's real KMS integration isn't wired up yet).
  async list(user: AuthenticatedUser) {
    const subjects = await this.db.query.visitorSubjects.findMany({
      where: and(eq(visitorSubjects.organisationId, user.organisationId), isNull(visitorSubjects.deletedAt)),
    });

    return Promise.all(
      subjects.map(async (subject) => {
        const personalData = await this.db.query.visitorPersonalData.findFirst({
          where: eq(visitorPersonalData.visitorId, subject.id),
        });
        const decoded = personalData
          ? (JSON.parse(
              this.dataProtection.decrypt(personalData.encryptedPayload as ProtectedPersonalDataEnvelope),
            ) as VisitorPersonalFields)
          : {};
        return {
          id: subject.id,
          name: decoded.name ?? null,
          preferredLanguageCode: personalData?.preferredLanguageCode ?? null,
        };
      }),
    );
  }

  async getById(visitorId: string, user: AuthenticatedUser) {
    const found = await this.db.query.visitorSubjects.findFirst({
      where: and(
        eq(visitorSubjects.id, visitorId),
        eq(visitorSubjects.organisationId, user.organisationId),
        isNull(visitorSubjects.deletedAt),
      ),
    });
    if (!found) throw new NotFoundException("Visitor not found");
    return found;
  }
}
