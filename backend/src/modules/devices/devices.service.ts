import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";

import { buildDeviceSupportUrl } from "../../common/assets/public-asset-url";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  deviceOperationalStatusLog,
  managedKioskDevices,
  notificationDeliveryInstructions,
  typeDefinition,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { randomUUID } from "node:crypto";

export interface CreateDeviceInput {
  siteId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  radioWifi?: boolean;
  radioBluetooth?: boolean;
  radioNfc?: boolean;
  radioCellular?: boolean;
  supplierEvidenceReference?: string;
  firmwareVersion?: string;
  warrantyExpiresAt?: string;
}

const APPROVED_FOR_DEPLOYMENT = "approved_for_deployment";

@Injectable()
export class DevicesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  // Section 14.3a: "no unregistered device should be deployable" — every
  // device starts life 'unassessed', not implicitly trusted, and must be
  // walked through the full 7-value sequence before it can be activated.
  async create(input: CreateDeviceInput, user: AuthenticatedUser) {
    const unassessedStatus = await this.typeDefs.id("cran_compliance_status", "unassessed");

    const [created] = await this.db
      .insert(managedKioskDevices)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        siteId: input.siteId,
        manufacturer: input.manufacturer,
        model: input.model,
        serialNumber: input.serialNumber,
        radioWifi: input.radioWifi ?? false,
        radioBluetooth: input.radioBluetooth ?? false,
        radioNfc: input.radioNfc ?? false,
        radioCellular: input.radioCellular ?? false,
        cranComplianceStatusCode: unassessedStatus,
        supplierEvidenceReference: input.supplierEvidenceReference ?? null,
        firmwareVersion: input.firmwareVersion ?? null,
        warrantyExpiresAt: input.warrantyExpiresAt ? new Date(input.warrantyExpiresAt) : null,
      })
      .returning();

    await this.db.insert(deviceOperationalStatusLog).values({
      id: randomUUID(),
      deviceId: created.id,
      statusCode: unassessedStatus,
      occurredAt: new Date(),
      actorId: user.userId,
      reason: "device registered",
    });

    return created;
  }

  async list(user: AuthenticatedUser) {
    return this.db.query.managedKioskDevices.findMany({
      where: and(eq(managedKioskDevices.organisationId, user.organisationId), isNull(managedKioskDevices.deletedAt)),
    });
  }

  /** Platform Ops Console's org-detail Devices tab — explicit organisationId, not the caller's own (a platform_support user's home org is unrelated). */
  async listForOrganisation(organisationId: string) {
    return this.db.query.managedKioskDevices.findMany({
      where: and(eq(managedKioskDevices.organisationId, organisationId), isNull(managedKioskDevices.deletedAt)),
    });
  }

  /** Cross-org device register for Ops Console top-level Devices list. */
  async listAllPlatform(organisationId?: string) {
    const rows = await this.db
      .select({
        id: managedKioskDevices.id,
        organisationId: managedKioskDevices.organisationId,
        siteId: managedKioskDevices.siteId,
        manufacturer: managedKioskDevices.manufacturer,
        model: managedKioskDevices.model,
        serialNumber: managedKioskDevices.serialNumber,
        cranComplianceStatusCode: typeDefinition.code,
        firmwareVersion: managedKioskDevices.firmwareVersion,
      })
      .from(managedKioskDevices)
      .leftJoin(typeDefinition, eq(managedKioskDevices.cranComplianceStatusCode, typeDefinition.id))
      .where(
        organisationId
          ? and(eq(managedKioskDevices.organisationId, organisationId), isNull(managedKioskDevices.deletedAt))
          : isNull(managedKioskDevices.deletedAt),
      );
    return rows;
  }

  /**
   * Offline/backlog picture for one organisation — the admin Devices banner.
   * A kiosk's unsynced check-ins live in its own on-device outbox and never
   * reach the server, so what the server can honestly report is: which devices
   * last reported themselves offline, and how many notifications for this org
   * are still queued. Named "server-visible" in the UI for that reason.
   */
  async backlogSummary(user: AuthenticatedUser) {
    const devices = await this.list(user);
    const [offlineStatus, pendingStatus] = await Promise.all([
      this.typeDefs.id("device_operational_status", "offline").catch(() => null),
      this.typeDefs.id("notification_delivery_status", "pending").catch(() => null),
    ]);

    const logs = devices.length
      ? await this.db.query.deviceOperationalStatusLog.findMany({
          where: inArray(
            deviceOperationalStatusLog.deviceId,
            devices.map((d) => d.id),
          ),
          orderBy: desc(deviceOperationalStatusLog.occurredAt),
        })
      : [];
    const latestByDevice = new Map<string, (typeof logs)[number]>();
    for (const log of logs) {
      if (!latestByDevice.has(log.deviceId)) latestByDevice.set(log.deviceId, log);
    }

    const offlineDevices = devices
      .filter((device) => offlineStatus && latestByDevice.get(device.id)?.statusCode === offlineStatus)
      .map((device) => ({
        id: device.id,
        deviceName: device.deviceName,
        manufacturer: device.manufacturer,
        model: device.model,
        serialNumber: device.serialNumber,
        siteId: device.siteId,
        lastStatusAt: latestByDevice.get(device.id)?.occurredAt ?? null,
      }));

    const [pendingRow] = pendingStatus
      ? await this.db
          .select({ value: count() })
          .from(notificationDeliveryInstructions)
          .where(
            and(
              eq(notificationDeliveryInstructions.organisationId, user.organisationId),
              eq(notificationDeliveryInstructions.statusCode, pendingStatus),
              isNull(notificationDeliveryInstructions.deletedAt),
            ),
          )
      : [];

    return {
      deviceCount: devices.length,
      offlineDeviceCount: offlineDevices.length,
      pendingNotificationCount: pendingRow?.value ?? 0,
      offlineDevices,
    };
  }

  /** Platform Ops Console's site detail page — which devices sit at this site. */
  async listForSite(siteId: string, organisationId: string) {
    return this.db.query.managedKioskDevices.findMany({
      where: and(
        eq(managedKioskDevices.siteId, siteId),
        eq(managedKioskDevices.organisationId, organisationId),
        isNull(managedKioskDevices.deletedAt),
      ),
    });
  }

  async getById(deviceId: string, user: AuthenticatedUser) {
    const found = await this.db.query.managedKioskDevices.findFirst({
      where: and(
        eq(managedKioskDevices.id, deviceId),
        eq(managedKioskDevices.organisationId, user.organisationId),
        isNull(managedKioskDevices.deletedAt),
      ),
    });
    if (!found) throw new NotFoundException("Device not found");
    return found;
  }

  /** The URL and caption for a device's support QR. Identifies the device for an authorised technician; the page behind it is permission-gated. */
  async supportQr(deviceId: string, user: AuthenticatedUser) {
    const device = await this.getById(deviceId, user);
    return {
      deviceId: device.id,
      payload: buildDeviceSupportUrl(device.id),
      caption: [device.deviceName, `${device.manufacturer} ${device.model}`, `S/N ${device.serialNumber}`]
        .filter(Boolean)
        .join(" - "),
    };
  }

  /** Platform Ops Console's device detail page — explicit organisationId, same shape as getById(). */
  async getByIdForOrganisation(deviceId: string, organisationId: string) {
    const [found] = await this.db
      .select({
        id: managedKioskDevices.id,
        organisationId: managedKioskDevices.organisationId,
        siteId: managedKioskDevices.siteId,
        manufacturer: managedKioskDevices.manufacturer,
        model: managedKioskDevices.model,
        serialNumber: managedKioskDevices.serialNumber,
        cranComplianceStatusCode: typeDefinition.code,
        cranCertificateReference: managedKioskDevices.cranCertificateReference,
        firmwareVersion: managedKioskDevices.firmwareVersion,
        warrantyExpiresAt: managedKioskDevices.warrantyExpiresAt,
      })
      .from(managedKioskDevices)
      .leftJoin(typeDefinition, eq(managedKioskDevices.cranComplianceStatusCode, typeDefinition.id))
      .where(
        and(
          eq(managedKioskDevices.id, deviceId),
          eq(managedKioskDevices.organisationId, organisationId),
          isNull(managedKioskDevices.deletedAt),
        ),
      )
      .limit(1);
    if (!found) throw new NotFoundException("Device not found");
    return found;
  }

  /** Platform Ops Console's device detail page — explicit organisationId, same shape as statusHistory(). */
  async statusHistoryForOrganisation(deviceId: string, organisationId: string) {
    await this.getByIdForOrganisation(deviceId, organisationId);
    return this.db
      .select({
        id: deviceOperationalStatusLog.id,
        statusCode: typeDefinition.code,
        occurredAt: deviceOperationalStatusLog.occurredAt,
        actorId: deviceOperationalStatusLog.actorId,
        reason: deviceOperationalStatusLog.reason,
      })
      .from(deviceOperationalStatusLog)
      .innerJoin(typeDefinition, eq(deviceOperationalStatusLog.statusCode, typeDefinition.id))
      .where(eq(deviceOperationalStatusLog.deviceId, deviceId))
      .orderBy(desc(deviceOperationalStatusLog.occurredAt));
  }

  async setStatus(deviceId: string, statusCode: string, reason: string, user: AuthenticatedUser) {
    await this.getById(deviceId, user); // 404s if not found/wrong tenant
    return this.writeStatus(deviceId, statusCode, reason, user.userId);
  }

  /** Ops Console CRAN status change — organisationId is the target tenant, not the staff home org. */
  async setStatusForOrganisation(
    deviceId: string,
    organisationId: string,
    statusCode: string,
    reason: string,
    actorId: string,
  ) {
    await this.getByIdForOrganisation(deviceId, organisationId);
    return this.writeStatus(deviceId, statusCode, reason, actorId);
  }

  private async writeStatus(deviceId: string, statusCode: string, reason: string, actorId: string) {
    const statusId = await this.typeDefs.id("cran_compliance_status", statusCode);

    await this.db
      .update(managedKioskDevices)
      .set({ cranComplianceStatusCode: statusId })
      .where(eq(managedKioskDevices.id, deviceId));
    await this.db.insert(deviceOperationalStatusLog).values({
      id: randomUUID(),
      deviceId,
      statusCode: statusId,
      occurredAt: new Date(),
      actorId,
      reason,
    });

    return { deviceId, cranComplianceStatusCode: statusCode };
  }

  // Section 14.3a's enforcement rule: "a device check-in/activation request
  // is rejected unless device.cran_status_code resolves to
  // approved_for_deployment." This is the concrete, testable gate — the
  // application-layer guard the kiosk's own device-authenticated write path
  // must call once it exists (Section 11.4.2 gap — kiosk not yet built).
  async assertDeployable(deviceId: string, user: AuthenticatedUser): Promise<void> {
    const found = await this.getById(deviceId, user);

    const [current] = await this.db
      .select({ code: typeDefinition.code })
      .from(typeDefinition)
      .where(eq(typeDefinition.id, found.cranComplianceStatusCode as string));

    if (current?.code !== APPROVED_FOR_DEPLOYMENT) {
      throw new ForbiddenException(
        `Device is not deployable — cran_compliance_status is '${current?.code ?? "unknown"}', requires '${APPROVED_FOR_DEPLOYMENT}'`,
      );
    }
  }

  async activate(deviceId: string, user: AuthenticatedUser) {
    await this.assertDeployable(deviceId, user);
    return { deviceId, activated: true };
  }

  async statusHistory(deviceId: string, user: AuthenticatedUser) {
    await this.getById(deviceId, user);
    return this.db
      .select({
        id: deviceOperationalStatusLog.id,
        statusCode: typeDefinition.code,
        occurredAt: deviceOperationalStatusLog.occurredAt,
        actorId: deviceOperationalStatusLog.actorId,
        reason: deviceOperationalStatusLog.reason,
      })
      .from(deviceOperationalStatusLog)
      .innerJoin(typeDefinition, eq(deviceOperationalStatusLog.statusCode, typeDefinition.id))
      .where(eq(deviceOperationalStatusLog.deviceId, deviceId))
      .orderBy(desc(deviceOperationalStatusLog.occurredAt));
  }

  // Soft delete only (Wiebe rule 7) — retiring a device is a status
  // transition to 'retired' plus the standard soft-delete flag, never a
  // hard DELETE on an operational asset record.
  async retire(deviceId: string, reason: string, user: AuthenticatedUser) {
    await this.setStatus(deviceId, "retired", reason, user);
    const [updated] = await this.db
      .update(managedKioskDevices)
      .set({ deletedAt: new Date() })
      .where(and(eq(managedKioskDevices.id, deviceId), eq(managedKioskDevices.organisationId, user.organisationId)))
      .returning();
    if (!updated) throw new NotFoundException("Device not found");
    return updated;
  }
}
