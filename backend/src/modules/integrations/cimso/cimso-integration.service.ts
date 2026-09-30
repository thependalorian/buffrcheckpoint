import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { and, desc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { AuthenticatedUser } from "../../../common/decorators/current-user.decorator";
import type { Database } from "../../../db/client";
import { DB } from "../../../db/db.module";
import {
  pmsExternalEntityLinks,
  pmsIntegrationConnectionStatusLog,
  pmsIntegrationConnections,
  pmsRoomZoneMappings,
  pmsSyncRunLog,
  siteHosts,
  sites,
  typeDefinition,
} from "../../../db/schema";
import { TypeDefinitionLookupService } from "../../../db/type-definition-lookup.service";
import { CapabilityStatusService } from "../../capability-status/capability-status.service";
import { InvitationsService } from "../../invitations/invitations.service";
import { CimsoFrontDeskAdapter } from "./adapters/front-desk.adapter";
import { CimsoReservationsAdapter } from "./adapters/reservations.adapter";
import { CimsoInnterchangeClient } from "./cimso-innterchange.client";
import {
  CIMSO_HOSPITALITY_DEFAULT_TYPES,
  type CimsoConnectionStatus,
  type CimsoConnectionStatusCode,
  type CimsoFrontDeskEvent,
  type CimsoInterfaceTypeId,
} from "./cimso.types";
import { reservationToInvitationDraft } from "./mappers/reservation-to-invitation";

const PROVIDER = "cimso_innterchange" as const;
const CAPABILITY_CODE = "cimso_innterchange" as const;

export class CimsoSyncReservationsDto {
  @IsUUID()
  siteId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  siteExternalId?: string;

  @IsOptional()
  @IsISO8601()
  fromIso?: string;

  @IsOptional()
  @IsISO8601()
  toIso?: string;
}

export class CimsoFrontDeskIngestDto {
  @IsUUID()
  siteId!: string;

  @IsString()
  @MaxLength(128)
  externalEventId!: string;

  @IsIn(["check_in", "check_out", "unknown"])
  eventType!: CimsoFrontDeskEvent["eventType"];

  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalReservationId?: string;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
}

export class CimsoConnectDto {
  @IsUUID()
  siteId!: string;

  @IsOptional()
  @IsArray()
  @IsIn([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], { each: true })
  enabledInterfaceTypes?: CimsoInterfaceTypeId[];

  @IsOptional()
  @IsString()
  @MaxLength(128)
  siteExternalId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tcpHost?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  tcpPort?: number;

  @IsOptional()
  @IsBoolean()
  tlsEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  clientLoginId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  credentialsSecretRef?: string;

  @IsOptional()
  @IsUUID()
  defaultHostId?: string;
}

export type ConnectionTransport = {
  tcpHost: string | null;
  tcpPort: number | null;
  tlsEnabled: boolean;
  clientLoginId: string | null;
  credentialsSecretRef: string | null;
  password: string | null;
  transportConfigured: boolean;
};

@Injectable()
export class CimsoIntegrationService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly client: CimsoInnterchangeClient,
    private readonly reservations: CimsoReservationsAdapter,
    private readonly frontDesk: CimsoFrontDeskAdapter,
    private readonly capabilityStatus: CapabilityStatusService,
    private readonly invitations: InvitationsService,
  ) {}

  async getStatus(user: AuthenticatedUser, siteId?: string): Promise<
    CimsoConnectionStatus & {
      orgEnabled: boolean;
      platformPublicStatus: string;
      connections: Array<{
        id: string;
        siteId: string;
        siteName: string | null;
        statusCode: string;
        siteExternalId: string | null;
        enabledInterfaceTypes: number[];
        tcpHost: string | null;
        tcpPort: number | null;
        tlsEnabled: boolean;
        clientLoginId: string | null;
        credentialsSecretRef: string | null;
        defaultHostId: string | null;
        lastSyncAt: string | null;
        lastErrorCode: string | null;
        credentialsConfigured: boolean;
      }>;
    }
  > {
    const [orgEnabled, platform] = await Promise.all([
      this.isCimsoOrgEnabled(user),
      this.capabilityStatus.listPublic(),
    ]);
    const connections = await this.listConnectionRows(user.organisationId, siteId);
    const primary = connections[0];
    const rowTransport = primary
      ? this.resolveConnectionTransport({
          tcpHost: primary.tcpHost,
          tcpPort: primary.tcpPort,
          tlsEnabled: primary.tlsEnabled,
          clientLoginId: primary.clientLoginId,
          credentialsSecretRef: primary.credentialsSecretRef,
        })
      : null;
    const envReady = this.client.isReady();
    const transportConfigured = rowTransport?.transportConfigured ?? envReady;
    const envStatus: CimsoConnectionStatusCode = transportConfigured
      ? "configured"
      : "awaiting_property_credentials";
    const statusCode = (primary?.statusCode as CimsoConnectionStatusCode | undefined) ?? envStatus;

    return {
      provider: PROVIDER,
      statusCode,
      orgEnabled,
      platformPublicStatus: platform.cimsoInnterchange,
      enabledInterfaceTypes: (primary?.enabledInterfaceTypes?.length
        ? primary.enabledInterfaceTypes
        : this.client.getConfig().enabledInterfaceTypes.length
          ? this.client.getConfig().enabledInterfaceTypes
          : CIMSO_HOSPITALITY_DEFAULT_TYPES) as CimsoInterfaceTypeId[],
      transportConfigured,
      lastSyncAt: primary?.lastSyncAt ?? null,
      lastErrorCode: primary?.lastErrorCode ?? null,
      afterNdaRequired: !transportConfigured,
      notes: transportConfigured
        ? "Transport configured. Implement TCP framing + handshake, then sync 1101/1107/2001. Synced reservations become invitations for kiosk/website QR."
        : "Spec package received (June 2026). Enable CiMSO under Capabilities, then connect each site with TCP host/port/login and a credentials secret ref (password in Railway env). Synced reservations become invitations for kiosk/website QR.",
      connections,
    };
  }

  /**
   * Persist org+site connection preferences + non-secret TCP settings.
   * Passwords stay in Railway env named by credentialsSecretRef — never on this body.
   */
  async connect(dto: CimsoConnectDto, user: AuthenticatedUser) {
    await this.assertCimsoConfigurable(user);
    await this.assertSiteOwned(dto.siteId, user.organisationId);

    if (dto.defaultHostId) {
      await this.assertDefaultHost(dto.defaultHostId, dto.siteId, user.organisationId);
    }

    const types = dto.enabledInterfaceTypes?.length
      ? dto.enabledInterfaceTypes
      : CIMSO_HOSPITALITY_DEFAULT_TYPES;
    const allowed = new Set(CIMSO_HOSPITALITY_DEFAULT_TYPES);
    for (const t of types) {
      if (!allowed.has(t)) {
        throw new BadRequestException(
          `Interface type ${t} is out of scope for Buffr Checkpoint hospitality beachhead (use 1, 3, and 4).`,
        );
      }
    }

    const [providerId] = await Promise.all([this.typeDefs.id("pms_provider_code", PROVIDER)]);

    const existing = await this.db.query.pmsIntegrationConnections.findFirst({
      where: and(
        eq(pmsIntegrationConnections.organisationId, user.organisationId),
        eq(pmsIntegrationConnections.siteId, dto.siteId),
        eq(pmsIntegrationConnections.providerCode, providerId),
        isNull(pmsIntegrationConnections.deletedAt),
      ),
    });

    const tcpHost = dto.tcpHost?.trim() || existing?.tcpHost || null;
    const tcpPort = dto.tcpPort ?? existing?.tcpPort ?? null;
    const tlsEnabled = dto.tlsEnabled ?? existing?.tlsEnabled ?? true;
    const clientLoginId = dto.clientLoginId?.trim() || existing?.clientLoginId || null;
    const credentialsSecretRef =
      dto.credentialsSecretRef?.trim() || existing?.credentialsSecretRef || null;
    const defaultHostId = dto.defaultHostId ?? existing?.defaultHostId ?? null;

    const transport = this.resolveConnectionTransport({
      tcpHost,
      tcpPort,
      tlsEnabled,
      clientLoginId,
      credentialsSecretRef,
    });
    const statusCodeValue: CimsoConnectionStatusCode = transport.transportConfigured
      ? "configured"
      : "awaiting_property_credentials";
    const statusId = await this.typeDefs.id("pms_connection_status", statusCodeValue);

    const now = new Date();
    const notes =
      "Preferences stored. Password via env named by credentials_secret_ref (or CIMSO_INNTERCHANGE_CLIENT_PASSWORD). Spec: NDA_PACKAGE_NOTES.md.";
    let connectionId: string;
    if (existing) {
      connectionId = existing.id;
      await this.db
        .update(pmsIntegrationConnections)
        .set({
          statusCode: statusId,
          siteExternalId: dto.siteExternalId ?? existing.siteExternalId,
          enabledInterfaceTypes: types,
          tcpHost,
          tcpPort,
          tlsEnabled,
          clientLoginId,
          credentialsSecretRef,
          defaultHostId,
          notes,
          updatedAt: now,
        })
        .where(eq(pmsIntegrationConnections.id, existing.id));
    } else {
      connectionId = randomUUID();
      await this.db.insert(pmsIntegrationConnections).values({
        id: connectionId,
        organisationId: user.organisationId,
        siteId: dto.siteId,
        providerCode: providerId,
        statusCode: statusId,
        siteExternalId: dto.siteExternalId ?? (this.client.getConfig().siteExternalId || null),
        enabledInterfaceTypes: types,
        tcpHost,
        tcpPort,
        tlsEnabled,
        clientLoginId,
        credentialsSecretRef,
        defaultHostId,
        notes,
        createdAt: now,
        updatedAt: now,
      });
    }

    await this.db.insert(pmsIntegrationConnectionStatusLog).values({
      id: randomUUID(),
      connectionId,
      statusCode: statusId,
      actorId: user.userId,
      reason: existing ? "connect_update" : "connect_create",
    });

    return {
      accepted: true,
      connectionId,
      siteId: dto.siteId,
      enabledInterfaceTypes: types,
      siteExternalId: dto.siteExternalId ?? null,
      secretsViaEnv: true,
      transportConfigured: transport.transportConfigured,
      afterNdaRequired: !transport.transportConfigured,
      statusCode: statusCodeValue,
      message: notes,
    };
  }

  async syncReservations(dto: CimsoSyncReservationsDto, user: AuthenticatedUser) {
    await this.assertCimsoConfigurable(user);
    const connection = await this.requireConnection(user.organisationId, dto.siteId);
    const cfg = this.client.getConfig();
    const startedAt = new Date();
    const result = await this.reservations.syncWindow({
      siteExternalId: dto.siteExternalId ?? connection.siteExternalId ?? (cfg.siteExternalId || undefined),
      fromIso: dto.fromIso,
      toIso: dto.toIso,
    });

    let recordsApplied = 0;
    let errorCode: string | null = null;
    let outcomeCode: "success" | "partial" | "failed" | "skipped_after_nda" = "partial";
    const detail: Record<string, unknown> = { afterNdaRequired: result.afterNdaRequired };

    if (result.afterNdaRequired || result.reservations.length === 0) {
      outcomeCode = result.afterNdaRequired ? "skipped_after_nda" : "partial";
      detail.reason = result.afterNdaRequired ? "tcp_not_ready" : "no_reservations";
    } else if (!connection.defaultHostId) {
      outcomeCode = "partial";
      errorCode = "missing_default_host";
      detail.reason = "missing_default_host";
    } else {
      await this.assertDefaultHost(connection.defaultHostId, connection.siteId, user.organisationId);
      const persist = await this.persistReservationDrafts({
        drafts: result.invitations,
        connectionId: connection.id,
        siteId: connection.siteId,
        defaultHostId: connection.defaultHostId,
        user,
      });
      recordsApplied = persist.applied;
      detail.skippedExisting = persist.skippedExisting;
      outcomeCode = recordsApplied > 0 ? "success" : "partial";
    }

    const outcomeId = await this.typeDefs.id("pms_sync_run_outcome", outcomeCode);
    const finishedAt = new Date();

    await this.db.insert(pmsSyncRunLog).values({
      id: randomUUID(),
      organisationId: user.organisationId,
      siteId: dto.siteId,
      connectionId: connection.id,
      directionCode: "reservations_inbound",
      outcomeCode: outcomeId,
      recordsSeen: result.reservations.length,
      recordsApplied,
      errorCode,
      startedAt,
      finishedAt,
      actorId: user.userId,
      detailJson: detail,
    });

    await this.db
      .update(pmsIntegrationConnections)
      .set({ lastSyncAt: finishedAt, lastErrorCode: errorCode, updatedAt: finishedAt })
      .where(eq(pmsIntegrationConnections.id, connection.id));

    return {
      ...result,
      recordsApplied,
      syncRunLogged: true,
      connectionId: connection.id,
      errorCode,
    };
  }

  async ingestFrontDeskEvent(dto: CimsoFrontDeskIngestDto, user: AuthenticatedUser) {
    await this.assertCimsoConfigurable(user);
    const connection = await this.requireConnection(user.organisationId, dto.siteId);
    const startedAt = new Date();
    const result = await this.frontDesk.ingestExternalEvent({
      externalEventId: dto.externalEventId,
      eventType: dto.eventType,
      externalReservationId: dto.externalReservationId,
      occurredAt: dto.occurredAt,
    });

    const outcomeId = await this.typeDefs.id(
      "pms_sync_run_outcome",
      result.afterNdaRequired ? "skipped_after_nda" : "success",
    );
    const finishedAt = new Date();

    await this.db.insert(pmsSyncRunLog).values({
      id: randomUUID(),
      organisationId: user.organisationId,
      siteId: dto.siteId,
      connectionId: connection.id,
      directionCode: "front_desk_inbound",
      outcomeCode: outcomeId,
      recordsSeen: 1,
      recordsApplied: result.accepted ? 1 : 0,
      startedAt,
      finishedAt,
      actorId: user.userId,
      detailJson: { externalEventId: dto.externalEventId, eventType: dto.eventType },
    });

    return { ...result, syncRunLogged: true, connectionId: connection.id };
  }

  async listMappings(user: AuthenticatedUser, siteId?: string) {
    await this.assertCimsoConfigurable(user);
    const providerId = await this.typeDefs.id("pms_provider_code", PROVIDER);
    const connectionWhere = siteId
      ? and(
          eq(pmsIntegrationConnections.organisationId, user.organisationId),
          eq(pmsIntegrationConnections.siteId, siteId),
          eq(pmsIntegrationConnections.providerCode, providerId),
          isNull(pmsIntegrationConnections.deletedAt),
        )
      : and(
          eq(pmsIntegrationConnections.organisationId, user.organisationId),
          eq(pmsIntegrationConnections.providerCode, providerId),
          isNull(pmsIntegrationConnections.deletedAt),
        );

    const connections = await this.db.query.pmsIntegrationConnections.findMany({
      where: connectionWhere,
    });
    const connectionIds = connections.map((c) => c.id);
    if (connectionIds.length === 0) {
      return {
        afterNdaRequired: !this.client.isReady(),
        roomToZone: [] as Array<{ roomCode: string; securityZoneId: string; siteId: string }>,
        notes: "Connect a site first, then map rooms to security zones.",
      };
    }

    const mappingFilters = [
      eq(pmsRoomZoneMappings.organisationId, user.organisationId),
      isNull(pmsRoomZoneMappings.deletedAt),
    ];
    if (siteId) mappingFilters.push(eq(pmsRoomZoneMappings.siteId, siteId));

    const rows = await this.db.query.pmsRoomZoneMappings.findMany({
      where: and(...mappingFilters),
    });

    return {
      afterNdaRequired: !this.client.isReady(),
      roomToZone: rows.map((r) => ({
        roomCode: r.roomCode,
        securityZoneId: r.securityZoneId,
        siteId: r.siteId,
      })),
      notes: rows.length === 0 ? "No room/zone mappings yet — add after first property pilot." : null,
    };
  }

  /** Platform ops: list PMS connections for an organisation. */
  async listForOrganisation(organisationId: string) {
    return this.listConnectionRows(organisationId);
  }

  /**
   * Persist reservation drafts as Checkpoint invitations + entity links.
   * Exported for unit tests with fixtures while TCP returns empty drafts.
   */
  async persistReservationDrafts(input: {
    drafts: ReturnType<typeof reservationToInvitationDraft>[];
    connectionId: string;
    siteId: string;
    defaultHostId: string;
    user: AuthenticatedUser;
  }): Promise<{ applied: number; skippedExisting: number }> {
    const entityKindId = await this.typeDefs.id("pms_external_entity_kind", "reservation");
    let applied = 0;
    let skippedExisting = 0;

    for (const draft of input.drafts) {
      const existingLink = await this.db.query.pmsExternalEntityLinks.findFirst({
        where: and(
          eq(pmsExternalEntityLinks.organisationId, input.user.organisationId),
          eq(pmsExternalEntityLinks.connectionId, input.connectionId),
          eq(pmsExternalEntityLinks.entityKindCode, entityKindId),
          eq(pmsExternalEntityLinks.externalEntityId, draft.externalReservationId),
          isNull(pmsExternalEntityLinks.deletedAt),
        ),
      });
      if (existingLink) {
        skippedExisting += 1;
        continue;
      }

      const visitorReference =
        draft.guestDisplayName?.trim() ||
        `cimso:${draft.externalReservationId}`;
      const arrival = draft.arrivalDate ? new Date(draft.arrivalDate) : new Date();
      let departure = draft.departureDate
        ? new Date(draft.departureDate)
        : new Date(arrival.getTime() + 24 * 60 * 60 * 1000);
      if (Number.isNaN(departure.getTime()) || departure <= arrival) {
        departure = new Date(arrival.getTime() + 24 * 60 * 60 * 1000);
      }

      const invitation = await this.invitations.create(
        {
          siteId: input.siteId,
          hostId: input.defaultHostId,
          visitorReference,
          expectedAt: arrival.toISOString(),
          expiresAt: departure.toISOString(),
        },
        input.user,
      );

      await this.db.insert(pmsExternalEntityLinks).values({
        id: randomUUID(),
        organisationId: input.user.organisationId,
        siteId: input.siteId,
        connectionId: input.connectionId,
        entityKindCode: entityKindId,
        externalEntityId: draft.externalReservationId,
        invitationId: invitation.id,
        createdAt: new Date(),
      });
      applied += 1;
    }

    return { applied, skippedExisting };
  }

  resolveConnectionTransport(row: {
    tcpHost: string | null;
    tcpPort: number | null;
    tlsEnabled: boolean;
    clientLoginId: string | null;
    credentialsSecretRef: string | null;
  }): ConnectionTransport {
    const tcpHost = row.tcpHost?.trim() || null;
    const tcpPort = row.tcpPort && row.tcpPort > 0 ? row.tcpPort : null;
    const clientLoginId = row.clientLoginId?.trim() || null;
    const credentialsSecretRef = row.credentialsSecretRef?.trim() || null;
    let password: string | null = null;
    if (credentialsSecretRef) {
      const fromRef = (process.env[credentialsSecretRef] ?? "").trim();
      if (fromRef) password = fromRef;
    }
    if (!password) {
      const global = (process.env.CIMSO_INNTERCHANGE_CLIENT_PASSWORD ?? "").trim();
      if (global) password = global;
    }
    const transportConfigured = Boolean(tcpHost && tcpPort && clientLoginId && password);
    return {
      tcpHost,
      tcpPort,
      tlsEnabled: row.tlsEnabled,
      clientLoginId,
      credentialsSecretRef,
      password,
      transportConfigured,
    };
  }

  private async isCimsoOrgEnabled(user: AuthenticatedUser): Promise<boolean> {
    const rows = await this.capabilityStatus.listOrganisationEnablement(user);
    const row = rows.find((r) => r.capabilityCode === CAPABILITY_CODE);
    return row?.statusCode === "approved";
  }

  private async assertCimsoConfigurable(user: AuthenticatedUser): Promise<void> {
    const platform = await this.capabilityStatus.listPublic();
    const publicStatus = platform.cimsoInnterchange;
    if (publicStatus !== "targeted" && publicStatus !== "live") {
      throw new ForbiddenException(
        "CiMSO INNterchange is not available at the platform level.",
      );
    }
    const orgEnabled = await this.isCimsoOrgEnabled(user);
    if (!orgEnabled) {
      throw new ForbiddenException(
        "Enable CiMSO INNterchange under Capability enablement before configuring connections.",
      );
    }
  }

  private async listConnectionRows(organisationId: string, siteId?: string) {
    const providerId = await this.typeDefs.id("pms_provider_code", PROVIDER);
    const rows = await this.db
      .select({
        id: pmsIntegrationConnections.id,
        siteId: pmsIntegrationConnections.siteId,
        siteName: sites.name,
        statusCodeId: pmsIntegrationConnections.statusCode,
        statusCode: typeDefinition.code,
        siteExternalId: pmsIntegrationConnections.siteExternalId,
        enabledInterfaceTypes: pmsIntegrationConnections.enabledInterfaceTypes,
        tcpHost: pmsIntegrationConnections.tcpHost,
        tcpPort: pmsIntegrationConnections.tcpPort,
        tlsEnabled: pmsIntegrationConnections.tlsEnabled,
        clientLoginId: pmsIntegrationConnections.clientLoginId,
        credentialsSecretRef: pmsIntegrationConnections.credentialsSecretRef,
        defaultHostId: pmsIntegrationConnections.defaultHostId,
        lastSyncAt: pmsIntegrationConnections.lastSyncAt,
        lastErrorCode: pmsIntegrationConnections.lastErrorCode,
      })
      .from(pmsIntegrationConnections)
      .innerJoin(sites, eq(sites.id, pmsIntegrationConnections.siteId))
      .innerJoin(typeDefinition, eq(typeDefinition.id, pmsIntegrationConnections.statusCode))
      .where(
        and(
          eq(pmsIntegrationConnections.organisationId, organisationId),
          eq(pmsIntegrationConnections.providerCode, providerId),
          isNull(pmsIntegrationConnections.deletedAt),
          ...(siteId ? [eq(pmsIntegrationConnections.siteId, siteId)] : []),
        ),
      )
      .orderBy(desc(pmsIntegrationConnections.updatedAt));

    return rows.map((r) => {
      const transport = this.resolveConnectionTransport({
        tcpHost: r.tcpHost,
        tcpPort: r.tcpPort,
        tlsEnabled: r.tlsEnabled,
        clientLoginId: r.clientLoginId,
        credentialsSecretRef: r.credentialsSecretRef,
      });
      return {
        id: r.id,
        siteId: r.siteId,
        siteName: r.siteName,
        statusCode: r.statusCode,
        siteExternalId: r.siteExternalId,
        enabledInterfaceTypes: r.enabledInterfaceTypes ?? [],
        tcpHost: r.tcpHost,
        tcpPort: r.tcpPort,
        tlsEnabled: r.tlsEnabled,
        clientLoginId: r.clientLoginId,
        credentialsSecretRef: r.credentialsSecretRef,
        defaultHostId: r.defaultHostId,
        lastSyncAt: r.lastSyncAt?.toISOString() ?? null,
        lastErrorCode: r.lastErrorCode,
        credentialsConfigured: Boolean(transport.password),
      };
    });
  }

  private async requireConnection(organisationId: string, siteId: string) {
    await this.assertSiteOwned(siteId, organisationId);
    const providerId = await this.typeDefs.id("pms_provider_code", PROVIDER);
    const connection = await this.db.query.pmsIntegrationConnections.findFirst({
      where: and(
        eq(pmsIntegrationConnections.organisationId, organisationId),
        eq(pmsIntegrationConnections.siteId, siteId),
        eq(pmsIntegrationConnections.providerCode, providerId),
        isNull(pmsIntegrationConnections.deletedAt),
      ),
    });
    if (!connection) {
      throw new NotFoundException(
        "No CiMSO connection for this site. POST /integrations/cimso/connect first.",
      );
    }
    return connection;
  }

  private async assertSiteOwned(siteId: string, organisationId: string) {
    const site = await this.db.query.sites.findFirst({
      where: and(eq(sites.id, siteId), eq(sites.organisationId, organisationId), isNull(sites.deletedAt)),
    });
    if (!site) throw new NotFoundException("Site not found");
    return site;
  }

  private async assertDefaultHost(hostId: string, siteId: string, organisationId: string) {
    const host = await this.db.query.siteHosts.findFirst({
      where: and(
        eq(siteHosts.id, hostId),
        eq(siteHosts.organisationId, organisationId),
        eq(siteHosts.siteId, siteId),
        eq(siteHosts.active, true),
        isNull(siteHosts.deletedAt),
      ),
    });
    if (!host) {
      throw new BadRequestException(
        "defaultHostId must be an active host on the same site as the connection.",
      );
    }
    return host;
  }
}
