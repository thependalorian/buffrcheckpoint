import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";

import { resolvePublicAssetUrl } from "../../common/assets/public-asset-url";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  kioskExperienceConfigurations,
  kioskExperienceConfigurationVersionChannels,
  kioskExperienceConfigurationVersions,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { SiteBrandingService } from "../site-branding/site-branding.service";
import { SiteQrReferencesService } from "../site-qr-references/site-qr-references.service";
import { VisitorPolicyService } from "../visitor-policy/visitor-policy.service";
import type { CreateKioskExperienceConfigDto, CreateKioskExperienceVersionDto } from "./dto/kiosk-experience.dto";
import { randomUUID } from "node:crypto";

export interface EffectiveKioskExperience {
  config: typeof kioskExperienceConfigurations.$inferSelect;
  version: typeof kioskExperienceConfigurationVersions.$inferSelect;
  channels: (typeof kioskExperienceConfigurationVersionChannels.$inferSelect)[];
  branding: Awaited<ReturnType<SiteBrandingService["getPublishedForSite"]>>;
  logoUrl: string | null;
  privacyNoticeContent: {
    versionId: string;
    policyName: string | null;
    contentText: string;
    contentUrl: string | null;
  } | null;
  languageCodes: string[];
  publicCheckInQr: {
    referenceId: string;
    label: string;
    payload: string;
    active: boolean;
  } | null;
}

const MIN_IDLE_TIMEOUT_SECONDS = 30;
const MIN_IDLE_WARNING_SECONDS = 5;

@Injectable()
export class KioskExperienceService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly siteBrandingService: SiteBrandingService,
    private readonly siteQrReferencesService: SiteQrReferencesService,
    private readonly visitorPolicyService: VisitorPolicyService,
  ) {}

  async createConfig(dto: CreateKioskExperienceConfigDto, user: AuthenticatedUser) {
    const [created] = await this.db
      .insert(kioskExperienceConfigurations)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        siteId: dto.siteId,
        deviceId: dto.deviceId ?? null,
        configName: dto.configName ?? null,
      })
      .returning();
    return created;
  }

  async listConfigs(user: AuthenticatedUser) {
    return this.db.query.kioskExperienceConfigurations.findMany({
      where: and(
        eq(kioskExperienceConfigurations.organisationId, user.organisationId),
        isNull(kioskExperienceConfigurations.deletedAt),
      ),
    });
  }

  async getConfig(configId: string, user: AuthenticatedUser) {
    const found = await this.db.query.kioskExperienceConfigurations.findFirst({
      where: and(
        eq(kioskExperienceConfigurations.id, configId),
        eq(kioskExperienceConfigurations.organisationId, user.organisationId),
        isNull(kioskExperienceConfigurations.deletedAt),
      ),
    });
    if (!found) throw new NotFoundException("Kiosk experience configuration not found");
    return found;
  }

  async listVersions(configId: string, user: AuthenticatedUser) {
    await this.getConfig(configId, user);
    return this.db.query.kioskExperienceConfigurationVersions.findMany({
      where: and(
        eq(kioskExperienceConfigurationVersions.kioskExperienceConfigurationId, configId),
        isNull(kioskExperienceConfigurationVersions.deletedAt),
      ),
      orderBy: [desc(kioskExperienceConfigurationVersions.versionNumber)],
    });
  }

  async createVersion(configId: string, dto: CreateKioskExperienceVersionDto, user: AuthenticatedUser) {
    await this.getConfig(configId, user);
    const draftStatus = await this.typeDefs.id("configuration_version_status", "draft");
    const latest = await this.latestVersionRow(configId);
    const versionId = randomUUID();
    const versionNumber = (latest?.versionNumber ?? 0) + 1;

    const [created] = await this.db
      .insert(kioskExperienceConfigurationVersions)
      .values({
        id: versionId,
        kioskExperienceConfigurationId: configId,
        brandingProfileVersionId: dto.brandingProfileVersionId ?? null,
        versionNumber,
        idleTimeoutSeconds: Math.max(MIN_IDLE_TIMEOUT_SECONDS, dto.idleTimeoutSeconds ?? 120),
        idleWarningSeconds: Math.max(MIN_IDLE_WARNING_SECONDS, dto.idleWarningSeconds ?? 30),
        maintenanceModeEnabled: dto.maintenanceModeEnabled ?? false,
        maintenanceMessage: dto.maintenanceMessage ?? null,
        assistedEntryDirection: dto.assistedEntryDirection ?? null,
        accessibilityLargeTextEnabled: dto.accessibilityLargeTextEnabled ?? false,
        statusCode: draftStatus,
      })
      .returning();

    if (dto.captureChannelCodes?.length) {
      for (const code of dto.captureChannelCodes) {
        const captureChannelCode = await this.typeDefs.id("capture_channel", code);
        await this.db.insert(kioskExperienceConfigurationVersionChannels).values({
          id: randomUUID(),
          kioskExperienceConfigurationVersionId: versionId,
          captureChannelCode,
        });
      }
    }

    return created;
  }

  async publishVersion(configId: string, versionId: string, user: AuthenticatedUser) {
    await this.getConfig(configId, user);
    const version = await this.getVersionRow(configId, versionId);
    const [publishedStatus, retiredStatus, draftStatus] = await Promise.all([
      this.typeDefs.id("configuration_version_status", "published"),
      this.typeDefs.id("configuration_version_status", "retired"),
      this.typeDefs.id("configuration_version_status", "draft"),
    ]);

    if (version.statusCode !== draftStatus) {
      throw new ConflictException("Only draft versions can be published");
    }

    const now = new Date();
    const priorPublished = await this.db.query.kioskExperienceConfigurationVersions.findMany({
      where: and(
        eq(kioskExperienceConfigurationVersions.kioskExperienceConfigurationId, configId),
        eq(kioskExperienceConfigurationVersions.statusCode, publishedStatus),
        isNull(kioskExperienceConfigurationVersions.deletedAt),
      ),
    });

    for (const prior of priorPublished) {
      await this.db
        .update(kioskExperienceConfigurationVersions)
        .set({ statusCode: retiredStatus, effectiveUntil: now })
        .where(eq(kioskExperienceConfigurationVersions.id, prior.id));
    }

    const [published] = await this.db
      .update(kioskExperienceConfigurationVersions)
      .set({
        statusCode: publishedStatus,
        publishedAt: now,
        effectiveFrom: now,
        approvedBy: user.userId,
      })
      .where(eq(kioskExperienceConfigurationVersions.id, versionId))
      .returning();

    return published;
  }

  async getEffective(
    siteId: string,
    deviceId: string | undefined,
    user: AuthenticatedUser,
  ): Promise<EffectiveKioskExperience | null> {
    const config = await this.resolveConfig(siteId, deviceId, user.organisationId);
    if (!config) return null;

    const publishedStatus = await this.typeDefs.id("configuration_version_status", "published");
    const version = await this.db.query.kioskExperienceConfigurationVersions.findFirst({
      where: and(
        eq(kioskExperienceConfigurationVersions.kioskExperienceConfigurationId, config.id),
        eq(kioskExperienceConfigurationVersions.statusCode, publishedStatus),
        isNull(kioskExperienceConfigurationVersions.deletedAt),
      ),
      orderBy: [desc(kioskExperienceConfigurationVersions.versionNumber)],
    });

    if (!version) return null;

    const channelRows = await this.db.query.kioskExperienceConfigurationVersionChannels.findMany({
      where: and(
        eq(kioskExperienceConfigurationVersionChannels.kioskExperienceConfigurationVersionId, version.id),
        isNull(kioskExperienceConfigurationVersionChannels.deletedAt),
      ),
    });

    const channels = await Promise.all(
      channelRows.map(async (row) => ({
        ...row,
        captureChannelCode: (await this.typeDefs.codeById(row.captureChannelCode)) ?? row.captureChannelCode,
      })),
    );

    const brandingBundle = await this.siteBrandingService.getPublishedForSite(siteId, user);
    const branding = brandingBundle
      ? {
          ...brandingBundle,
          channels: await Promise.all(
            brandingBundle.channels.map(async (row) => ({
              ...row,
              captureChannelCode: (await this.typeDefs.codeById(row.captureChannelCode)) ?? row.captureChannelCode,
            })),
          ),
          languages: await Promise.all(
            brandingBundle.languages.map(async (row) => ({
              ...row,
              languageCode: (await this.typeDefs.codeById(row.languageCode)) ?? row.languageCode,
            })),
          ),
        }
      : null;

    const logoUrl = resolvePublicAssetUrl(branding?.version.logoArtifactId ?? null);
    const languageCodes = (branding?.languages ?? [])
      .map((row) => row.languageCode)
      .filter((code): code is string => typeof code === "string");

    let privacyNoticeContent: EffectiveKioskExperience["privacyNoticeContent"] = null;
    const privacyVersionId = branding?.version.privacyNoticeVersionId;
    if (privacyVersionId) {
      try {
        const content = await this.visitorPolicyService.getVersionContent(privacyVersionId, user);
        privacyNoticeContent = {
          versionId: content.id,
          policyName: content.policyName,
          contentText: content.contentText,
          contentUrl: content.contentUrl,
        };
      } catch {
        privacyNoticeContent = null;
      }
    }

    const publicCheckInQr = await this.siteQrReferencesService.resolvePublicCheckInForSite(siteId, user);

    return { config, version, channels, branding, logoUrl, privacyNoticeContent, languageCodes, publicCheckInQr };
  }

  /** Snapshot FK ids for visit check-in audit evidence. */
  async resolveSnapshotIds(siteId: string, deviceId: string | undefined, user: AuthenticatedUser) {
    const effective = await this.getEffective(siteId, deviceId, user);
    if (!effective) {
      return { brandingProfileVersionId: null, kioskExperienceConfigurationVersionId: null };
    }

    const brandingProfileVersionId =
      effective.version.brandingProfileVersionId ?? effective.branding?.version.id ?? null;

    return {
      brandingProfileVersionId,
      kioskExperienceConfigurationVersionId: effective.version.id,
    };
  }

  private async resolveConfig(siteId: string, deviceId: string | undefined, organisationId: string) {
    if (deviceId) {
      const deviceConfig = await this.db.query.kioskExperienceConfigurations.findFirst({
        where: and(
          eq(kioskExperienceConfigurations.organisationId, organisationId),
          eq(kioskExperienceConfigurations.siteId, siteId),
          eq(kioskExperienceConfigurations.deviceId, deviceId),
          isNull(kioskExperienceConfigurations.deletedAt),
        ),
      });
      if (deviceConfig) return deviceConfig;
    }

    return this.db.query.kioskExperienceConfigurations.findFirst({
      where: and(
        eq(kioskExperienceConfigurations.organisationId, organisationId),
        eq(kioskExperienceConfigurations.siteId, siteId),
        isNull(kioskExperienceConfigurations.deviceId),
        isNull(kioskExperienceConfigurations.deletedAt),
      ),
    });
  }

  private async latestVersionRow(configId: string) {
    const rows = await this.db.query.kioskExperienceConfigurationVersions.findMany({
      where: and(
        eq(kioskExperienceConfigurationVersions.kioskExperienceConfigurationId, configId),
        isNull(kioskExperienceConfigurationVersions.deletedAt),
      ),
      orderBy: [desc(kioskExperienceConfigurationVersions.versionNumber)],
      limit: 1,
    });
    return rows[0];
  }

  private async getVersionRow(configId: string, versionId: string) {
    const found = await this.db.query.kioskExperienceConfigurationVersions.findFirst({
      where: and(
        eq(kioskExperienceConfigurationVersions.id, versionId),
        eq(kioskExperienceConfigurationVersions.kioskExperienceConfigurationId, configId),
        isNull(kioskExperienceConfigurationVersions.deletedAt),
      ),
    });
    if (!found) throw new NotFoundException("Kiosk experience version not found");
    return found;
  }
}
