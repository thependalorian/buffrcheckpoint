import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";

import {
  PersonalDataProtectionService,
  type ProtectedPersonalDataEnvelope,
} from "../../common/data-protection/personal-data-protection.service";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { siteHosts } from "../../db/schema";
import { randomUUID } from "node:crypto";

export interface CreateHostInput {
  siteId: string;
  name: string;
  department?: string;
  contactReference?: string;
  organisationUnitId?: string;
}

export interface HostListRow {
  id: string;
  siteId: string;
  displayName: string;
  department: string | null;
  organisationUnitId: string | null;
  active: boolean;
  hasContact: boolean;
}

@Injectable()
export class HostsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly dataProtection: PersonalDataProtectionService,
  ) {}

  async create(input: CreateHostInput, user: AuthenticatedUser) {
    const [created] = await this.db
      .insert(siteHosts)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        siteId: input.siteId,
        organisationUnitId: input.organisationUnitId ?? null,
        hostNameProtected: this.dataProtection.encrypt(input.name),
        hostNameLookupHmac: this.dataProtection.lookupHmac(input.name, "NAME_HASH_PEPPER"),
        department: input.department ?? null,
        hostContactProtected: input.contactReference ? this.dataProtection.encrypt(input.contactReference) : null,
        hostContactLookupHmac: input.contactReference
          ? this.dataProtection.lookupHmac(input.contactReference, "CONTACT_REFERENCE_HASH_PEPPER")
          : null,
      })
      .returning();
    return {
      id: created.id,
      siteId: created.siteId,
      displayName: input.name,
      department: created.department,
      organisationUnitId: created.organisationUnitId,
      active: created.active,
      hasContact: Boolean(input.contactReference),
    } satisfies HostListRow;
  }

  async listBySite(siteId: string | undefined, user: AuthenticatedUser): Promise<HostListRow[]> {
    const rows = siteId
      ? await this.db.query.siteHosts.findMany({
          where: and(
            eq(siteHosts.organisationId, user.organisationId),
            eq(siteHosts.siteId, siteId),
            isNull(siteHosts.deletedAt),
          ),
        })
      : await this.db.query.siteHosts.findMany({
          where: and(eq(siteHosts.organisationId, user.organisationId), isNull(siteHosts.deletedAt)),
        });

    return rows.map((host) => {
      let displayName = "Host";
      if (host.hostNameProtected) {
        try {
          displayName = this.dataProtection.decrypt(host.hostNameProtected as ProtectedPersonalDataEnvelope);
        } catch {
          displayName = "Host";
        }
      }
      return {
        id: host.id,
        siteId: host.siteId,
        displayName,
        department: host.department,
        organisationUnitId: host.organisationUnitId,
        active: host.active,
        hasContact: Boolean(host.hostContactProtected),
      };
    });
  }

  async getById(hostId: string, user: AuthenticatedUser) {
    const found = await this.db.query.siteHosts.findFirst({
      where: and(
        eq(siteHosts.id, hostId),
        eq(siteHosts.organisationId, user.organisationId),
        isNull(siteHosts.deletedAt),
      ),
    });
    if (!found) throw new NotFoundException("Host not found");
    return found;
  }

  async update(
    hostId: string,
    input: {
      name?: string;
      department?: string;
      contactReference?: string;
      active?: boolean;
      organisationUnitId?: string | null;
    },
    user: AuthenticatedUser,
  ): Promise<HostListRow> {
    const found = await this.getById(hostId, user);
    const [updated] = await this.db
      .update(siteHosts)
      .set({
        ...(input.name !== undefined
          ? {
              hostNameProtected: this.dataProtection.encrypt(input.name),
              hostNameLookupHmac: this.dataProtection.lookupHmac(input.name, "NAME_HASH_PEPPER"),
            }
          : {}),
        ...(input.department !== undefined ? { department: input.department } : {}),
        ...(input.organisationUnitId !== undefined ? { organisationUnitId: input.organisationUnitId } : {}),
        ...(input.contactReference !== undefined
          ? {
              hostContactProtected: input.contactReference ? this.dataProtection.encrypt(input.contactReference) : null,
              hostContactLookupHmac: input.contactReference
                ? this.dataProtection.lookupHmac(input.contactReference, "CONTACT_REFERENCE_HASH_PEPPER")
                : null,
            }
          : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(input.active === false ? { deletedAt: new Date() } : {}),
      })
      .where(and(eq(siteHosts.id, hostId), eq(siteHosts.organisationId, user.organisationId)))
      .returning();

    let displayName = "Host";
    if (input.name) {
      displayName = input.name;
    } else if (found.hostNameProtected) {
      try {
        displayName = this.dataProtection.decrypt(found.hostNameProtected as ProtectedPersonalDataEnvelope);
      } catch {
        displayName = "Host";
      }
    }
    return {
      id: updated.id,
      siteId: updated.siteId,
      displayName,
      department: updated.department,
      organisationUnitId: updated.organisationUnitId,
      active: updated.active,
      hasContact: Boolean(updated.hostContactProtected),
    };
  }
}
