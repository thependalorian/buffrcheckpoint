import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";
import { randomBytes, randomUUID } from "node:crypto";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  accessCredentials,
  credentialSiteEntitlements,
  credentialStatusEvents,
  credentialUseEvents,
  managedKioskDevices,
  readerSessions,
  typeDefinition,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { DevicesService } from "../devices/devices.service";
import type { ValidateCredentialDto } from "./dto/validate-credential.dto";

export interface IssueCredentialInput {
  holderTypeCode: string;
  holderId: string;
  credentialTypeCode: string;
  expiresAt?: string;
}

export type CredentialValidationResult =
  | {
      valid: true;
      credentialId: string;
      holderTypeCode: string;
      holderId: string;
      credentialTypeCode: string;
    }
  | { valid: false; reason: string };

@Injectable()
export class CredentialsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly devicesService: DevicesService,
  ) {}

  async issue(input: IssueCredentialInput, user: AuthenticatedUser) {
    const [holderTypeCode, credentialTypeCode, activeStatus] = await Promise.all([
      this.typeDefs.id("credential_holder_type", input.holderTypeCode),
      this.typeDefs.id("credential_type", input.credentialTypeCode),
      this.typeDefs.id("credential_status", "active"),
    ]);

    const [created] = await this.db
      .insert(accessCredentials)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        holderTypeCode,
        holderId: input.holderId,
        credentialTypeCode,
        credentialReferenceHmac: randomBytes(24).toString("hex"),
        validUntil: input.expiresAt ? new Date(input.expiresAt) : null,
      })
      .returning();

    await this.db.insert(credentialStatusEvents).values({
      id: randomUUID(),
      credentialId: created.id,
      statusCode: activeStatus,
      occurredAt: new Date(),
      actorId: user.userId,
      reason: "issued",
    });

    return created;
  }

  async list(user: AuthenticatedUser) {
    return this.db.query.accessCredentials.findMany({
      where: eq(accessCredentials.organisationId, user.organisationId),
    });
  }

  async listEntitlements(credentialId: string, user: AuthenticatedUser) {
    await this.assertCredentialOwned(credentialId, user);
    return this.db.query.credentialSiteEntitlements.findMany({
      where: and(
        eq(credentialSiteEntitlements.credentialId, credentialId),
        eq(credentialSiteEntitlements.organisationId, user.organisationId),
        isNull(credentialSiteEntitlements.deletedAt),
      ),
    });
  }

  async addEntitlement(
    credentialId: string,
    input: { siteId: string; zoneId?: string },
    user: AuthenticatedUser,
  ) {
    await this.assertCredentialOwned(credentialId, user);
    const [created] = await this.db
      .insert(credentialSiteEntitlements)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        credentialId,
        siteId: input.siteId,
        zoneId: input.zoneId ?? null,
      })
      .returning();
    return created;
  }

  async removeEntitlement(credentialId: string, entitlementId: string, user: AuthenticatedUser) {
    await this.assertCredentialOwned(credentialId, user);
    const found = await this.db.query.credentialSiteEntitlements.findFirst({
      where: and(
        eq(credentialSiteEntitlements.id, entitlementId),
        eq(credentialSiteEntitlements.credentialId, credentialId),
        eq(credentialSiteEntitlements.organisationId, user.organisationId),
        isNull(credentialSiteEntitlements.deletedAt),
      ),
    });
    if (!found) throw new NotFoundException("Entitlement not found");

    await this.db
      .update(credentialSiteEntitlements)
      .set({ deletedAt: new Date() })
      .where(eq(credentialSiteEntitlements.id, entitlementId));

    return { entitlementId, removed: true };
  }

  private async assertCredentialOwned(credentialId: string, user: AuthenticatedUser) {
    const found = await this.db.query.accessCredentials.findFirst({
      where: and(
        eq(accessCredentials.id, credentialId),
        eq(accessCredentials.organisationId, user.organisationId),
      ),
    });
    if (!found) throw new NotFoundException("Credential not found");
    return found;
  }

  async revoke(credentialId: string, reason: string, user: AuthenticatedUser) {
    const found = await this.db.query.accessCredentials.findFirst({
      where: and(eq(accessCredentials.id, credentialId), eq(accessCredentials.organisationId, user.organisationId)),
    });
    if (!found) throw new NotFoundException("Credential not found");

    const revokedStatus = await this.typeDefs.id("credential_status", "revoked");

    await this.db
      .update(accessCredentials)
      .set({ deletedAt: new Date() })
      .where(eq(accessCredentials.id, credentialId));
    await this.db.insert(credentialStatusEvents).values({
      id: randomUUID(),
      credentialId,
      statusCode: revokedStatus,
      occurredAt: new Date(),
      actorId: user.userId,
      reason,
    });

    return { credentialId, revoked: true };
  }

  async openReaderSession(deviceId: string, user: AuthenticatedUser) {
    await this.devicesService.assertDeployable(deviceId, user);
    const device = await this.devicesService.getById(deviceId, user);
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.db.insert(readerSessions).values({
      id: sessionId,
      organisationId: user.organisationId,
      deviceId: device.id,
      expiresAt,
      trusted: true,
    });
    return { readerSessionReference: sessionId, expiresAt: expiresAt.toISOString() };
  }

  async validate(dto: ValidateCredentialDto, user: AuthenticatedUser): Promise<CredentialValidationResult> {
    const credentialReference = dto.credentialReference ?? dto.credentialReferenceHmac;
    if (!credentialReference) {
      throw new BadRequestException("credentialReference is required");
    }

    let device: typeof managedKioskDevices.$inferSelect | null = null;
    let sessionId: string | null = null;

    if (dto.readerSessionReference) {
      const session = await this.db.query.readerSessions.findFirst({
        where: and(
          eq(readerSessions.id, dto.readerSessionReference),
          eq(readerSessions.organisationId, user.organisationId),
          isNull(readerSessions.deletedAt),
        ),
      });
      if (!session || session.expiresAt.getTime() < Date.now() || !session.trusted) {
        return { valid: false, reason: "invalid_reader_session" };
      }
      sessionId = session.id;

      device = await this.db.query.managedKioskDevices.findFirst({
        where: and(
          eq(managedKioskDevices.id, session.deviceId),
          eq(managedKioskDevices.organisationId, user.organisationId),
          isNull(managedKioskDevices.deletedAt),
        ),
      }) ?? null;
      if (!device) {
        return { valid: false, reason: "device_not_enrolled" };
      }

      try {
        await this.devicesService.assertDeployable(device.id, user);
      } catch {
        return { valid: false, reason: "device_not_approved" };
      }
    }

    const found = await this.db.query.accessCredentials.findFirst({
      where: and(
        eq(accessCredentials.credentialReferenceHmac, credentialReference),
        eq(accessCredentials.organisationId, user.organisationId),
      ),
    });
    if (!found || found.deletedAt) {
      await this.recordUseEvent(found?.id ?? null, device?.id ?? null, sessionId, device?.siteId ?? user.siteId, dto.requestedZoneReference ?? null, "not_found", user.organisationId);
      return { valid: false, reason: "not_found" };
    }
    if (found.validUntil && found.validUntil.getTime() < Date.now()) {
      await this.recordUseEvent(found.id, device?.id ?? null, sessionId, device?.siteId ?? user.siteId, dto.requestedZoneReference ?? null, "expired", user.organisationId);
      return { valid: false, reason: "expired" };
    }

    const [latestStatus] = await this.db
      .select({ code: typeDefinition.code })
      .from(credentialStatusEvents)
      .innerJoin(typeDefinition, eq(credentialStatusEvents.statusCode, typeDefinition.id))
      .where(eq(credentialStatusEvents.credentialId, found.id))
      .orderBy(desc(credentialStatusEvents.occurredAt))
      .limit(1);

    if (latestStatus?.code !== "active") {
      await this.recordUseEvent(found.id, device?.id ?? null, sessionId, device?.siteId ?? user.siteId, dto.requestedZoneReference ?? null, "revoked", user.organisationId);
      return { valid: false, reason: "revoked" };
    }

    const entitlements = await this.db.query.credentialSiteEntitlements.findMany({
      where: and(
        eq(credentialSiteEntitlements.credentialId, found.id),
        isNull(credentialSiteEntitlements.deletedAt),
      ),
    });
    const effectiveSiteId = device?.siteId ?? user.siteId;
    if (entitlements.length > 0 && effectiveSiteId) {
      const siteOk = entitlements.some((e) => e.siteId === effectiveSiteId);
      if (!siteOk) {
        await this.recordUseEvent(found.id, device?.id ?? null, sessionId, effectiveSiteId, dto.requestedZoneReference ?? null, "site_not_entitled", user.organisationId);
        return { valid: false, reason: "site_not_entitled" };
      }
      if (dto.requestedZoneReference) {
        const zoneOk = entitlements.some(
          (e) => e.siteId === effectiveSiteId && (e.zoneId === null || e.zoneId === dto.requestedZoneReference),
        );
        if (!zoneOk) {
          await this.recordUseEvent(found.id, device?.id ?? null, sessionId, effectiveSiteId, dto.requestedZoneReference, "zone_not_entitled", user.organisationId);
          return { valid: false, reason: "zone_not_entitled" };
        }
      }
    }

    // Release 1.5 hooks — pass until induction/sponsor rules ship
    const inductionOk = true;
    const sponsorOk = true;
    if (!inductionOk || !sponsorOk) {
      return { valid: false, reason: "policy_not_met" };
    }

    // Assurance threshold stub — V2 for NFC badge credentials
    const assuranceOk = true;
    if (!assuranceOk) {
      return { valid: false, reason: "assurance_threshold_not_met" };
    }

    await this.recordUseEvent(found.id, device?.id ?? null, sessionId, device?.siteId ?? user.siteId, dto.requestedZoneReference ?? null, "valid", user.organisationId);

    const [holderTypeRow] = await this.db
      .select({ holderTypeCode: typeDefinition.code })
      .from(typeDefinition)
      .where(eq(typeDefinition.id, found.holderTypeCode));
    const [credentialTypeRow] = await this.db
      .select({ credentialTypeCode: typeDefinition.code })
      .from(typeDefinition)
      .where(eq(typeDefinition.id, found.credentialTypeCode));

    return {
      valid: true,
      credentialId: found.id,
      holderId: found.holderId as string,
      holderTypeCode: holderTypeRow?.holderTypeCode ?? "unknown",
      credentialTypeCode: credentialTypeRow?.credentialTypeCode ?? "unknown",
    };
  }

  private async recordUseEvent(
    credentialId: string | null,
    deviceId: string | null,
    readerSessionId: string | null,
    siteId: string | null,
    zoneId: string | null,
    outcomeCode: string,
    organisationId: string,
  ) {
    if (!credentialId) return;
    await this.db.insert(credentialUseEvents).values({
      id: randomUUID(),
      organisationId,
      credentialId,
      deviceId,
      readerSessionId,
      siteId,
      zoneId,
      outcomeCode,
    });
  }
}
