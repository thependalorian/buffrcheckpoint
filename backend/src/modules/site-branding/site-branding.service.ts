import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { createArtifactStore } from "../../common/artifacts/artifact-store";
import { resolvePublicAssetUrl } from "../../common/assets/public-asset-url";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  siteBrandingProfiles,
  siteBrandingProfileVersionChannels,
  siteBrandingProfileVersionLanguages,
  siteBrandingProfileVersions,
  sites,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import {
  detectLogoType,
  isAllowedLogoReference,
  LOGO_FILE_NAME,
  logoAssetReference,
  MAX_LOGO_BYTES,
  normaliseLogo,
} from "./branding-logo";
import type {
  CreateSiteBrandingProfileDto,
  CreateSiteBrandingVersionDto,
  SetupSiteBrandingDto,
} from "./dto/site-branding.dto";
import { randomUUID } from "node:crypto";

export interface UploadedLogo {
  buffer: Buffer;
  size: number;
}

@Injectable()
export class SiteBrandingService {
  private readonly artifacts = createArtifactStore();

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  async createProfile(dto: CreateSiteBrandingProfileDto, user: AuthenticatedUser) {
    const [created] = await this.db
      .insert(siteBrandingProfiles)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        regionId: dto.regionId ?? null,
        siteId: dto.siteId ?? null,
        profileName: dto.profileName ?? null,
      })
      .returning();
    return created;
  }

  async listProfiles(user: AuthenticatedUser) {
    return this.db.query.siteBrandingProfiles.findMany({
      where: and(eq(siteBrandingProfiles.organisationId, user.organisationId), isNull(siteBrandingProfiles.deletedAt)),
    });
  }

  async getProfile(profileId: string, user: AuthenticatedUser) {
    const found = await this.db.query.siteBrandingProfiles.findFirst({
      where: and(
        eq(siteBrandingProfiles.id, profileId),
        eq(siteBrandingProfiles.organisationId, user.organisationId),
        isNull(siteBrandingProfiles.deletedAt),
      ),
    });
    if (!found) throw new NotFoundException("Branding profile not found");
    return found;
  }

  async softDeleteProfile(profileId: string, user: AuthenticatedUser) {
    const [updated] = await this.db
      .update(siteBrandingProfiles)
      .set({ deletedAt: new Date() })
      .where(and(eq(siteBrandingProfiles.id, profileId), eq(siteBrandingProfiles.organisationId, user.organisationId)))
      .returning();
    if (!updated) throw new NotFoundException("Branding profile not found");
    return updated;
  }

  async listVersions(profileId: string, user: AuthenticatedUser) {
    await this.getProfile(profileId, user);
    return this.db.query.siteBrandingProfileVersions.findMany({
      where: and(
        eq(siteBrandingProfileVersions.brandingProfileId, profileId),
        isNull(siteBrandingProfileVersions.deletedAt),
      ),
      orderBy: [desc(siteBrandingProfileVersions.versionNumber)],
    });
  }

  async createVersion(profileId: string, dto: CreateSiteBrandingVersionDto, user: AuthenticatedUser) {
    await this.getProfile(profileId, user);
    this.assertLogoReference(dto.logoArtifactId, user);
    const draftStatus = await this.typeDefs.id("configuration_version_status", "draft");
    const latest = await this.latestVersionRow(profileId);

    const versionId = randomUUID();
    const versionNumber = (latest?.versionNumber ?? 0) + 1;

    const [created] = await this.db
      .insert(siteBrandingProfileVersions)
      .values({
        id: versionId,
        brandingProfileId: profileId,
        versionNumber,
        logoArtifactId: dto.logoArtifactId ?? null,
        brandColourToken: dto.brandColourToken ?? null,
        welcomeMessage: dto.welcomeMessage ?? null,
        backgroundArtifactId: dto.backgroundArtifactId ?? null,
        organisationDisplayName: dto.organisationDisplayName ?? null,
        siteDisplayName: dto.siteDisplayName ?? null,
        helpContactReference: dto.helpContactReference ?? null,
        privacyNoticeVersionId: dto.privacyNoticeVersionId ?? null,
        statusCode: draftStatus,
      })
      .returning();

    await this.syncVersionJunctions(versionId, dto);
    return created;
  }

  async publishVersion(profileId: string, versionId: string, user: AuthenticatedUser) {
    await this.getProfile(profileId, user);
    const version = await this.getVersionRow(profileId, versionId);
    const [publishedStatus, retiredStatus] = await Promise.all([
      this.typeDefs.id("configuration_version_status", "published"),
      this.typeDefs.id("configuration_version_status", "retired"),
    ]);

    const draftStatus = await this.typeDefs.id("configuration_version_status", "draft");
    if (version.statusCode !== draftStatus) {
      throw new ConflictException("Only draft versions can be published");
    }

    const now = new Date();
    const priorPublished = await this.db.query.siteBrandingProfileVersions.findMany({
      where: and(
        eq(siteBrandingProfileVersions.brandingProfileId, profileId),
        eq(siteBrandingProfileVersions.statusCode, publishedStatus),
        isNull(siteBrandingProfileVersions.deletedAt),
      ),
    });

    for (const prior of priorPublished) {
      await this.db
        .update(siteBrandingProfileVersions)
        .set({ statusCode: retiredStatus, effectiveUntil: now })
        .where(eq(siteBrandingProfileVersions.id, prior.id));
    }

    const [published] = await this.db
      .update(siteBrandingProfileVersions)
      .set({
        statusCode: publishedStatus,
        publishedAt: now,
        effectiveFrom: now,
        approvedBy: user.userId,
      })
      .where(eq(siteBrandingProfileVersions.id, versionId))
      .returning();

    return published;
  }

  /** Validates, re-encodes and stores a logo; returns the reference to save on a branding version. */
  async uploadLogo(file: UploadedLogo | undefined, user: AuthenticatedUser) {
    if (!file?.buffer?.length) {
      throw new BadRequestException({ code: "LOGO_MISSING", message: "Choose a logo file to upload." });
    }
    if (file.size > MAX_LOGO_BYTES) {
      throw new PayloadTooLargeException({ code: "LOGO_TOO_LARGE", message: "Logo must be under 400 KB." });
    }
    if (!detectLogoType(file.buffer)) {
      throw new UnsupportedMediaTypeException({
        code: "LOGO_UNSUPPORTED_TYPE",
        message: "Logo must be a PNG, JPEG or WebP image.",
      });
    }
    let encoded: Buffer;
    try {
      encoded = await normaliseLogo(file.buffer);
    } catch {
      throw new UnsupportedMediaTypeException({
        code: "LOGO_UNREADABLE",
        message: "The logo image could not be read.",
      });
    }
    const stored = await this.artifacts.writePackage(
      `site-branding/${user.organisationId}`,
      [{ name: LOGO_FILE_NAME, content: encoded, contentType: "image/webp" }],
      { organisationId: user.organisationId, kind: "branding_logo", uploadedBy: user.userId },
    );
    const logoArtifactId = logoAssetReference(stored.fileReference);
    return { logoArtifactId, url: resolvePublicAssetUrl(logoArtifactId), bytes: encoded.length };
  }

  /** Public read for visitor-facing screens; only branding logos are reachable. */
  async readLogo(organisationId: string, packageId: string): Promise<Buffer> {
    try {
      return await this.artifacts.readFile(`site-branding/${organisationId}/${packageId}`, LOGO_FILE_NAME);
    } catch {
      throw new NotFoundException("Logo not found");
    }
  }

  /**
   * Profile (reused for the same scope), a new version, publication and the
   * retirement of the previous published version, in one transaction.
   */
  async setupAndPublish(dto: SetupSiteBrandingDto, user: AuthenticatedUser) {
    this.assertLogoReference(dto.logoArtifactId, user);
    if (dto.siteId) await this.assertSite(dto.siteId, user);
    const siteId = dto.siteId ?? null;

    const [publishedStatus, retiredStatus, existing] = await Promise.all([
      this.typeDefs.id("configuration_version_status", "published"),
      this.typeDefs.id("configuration_version_status", "retired"),
      this.db.query.siteBrandingProfiles.findFirst({
        where: and(
          eq(siteBrandingProfiles.organisationId, user.organisationId),
          siteId ? eq(siteBrandingProfiles.siteId, siteId) : isNull(siteBrandingProfiles.siteId),
          isNull(siteBrandingProfiles.regionId),
          isNull(siteBrandingProfiles.deletedAt),
        ),
      }),
    ]);
    const profileId = existing?.id ?? randomUUID();
    const latest = existing ? await this.latestVersionRow(profileId) : undefined;
    const versionId = randomUUID();
    const now = new Date();

    const junctions = await this.junctionRows(versionId, dto);
    const statements: BatchItem<"pg">[] = [
      ...(existing
        ? []
        : [
            this.db.insert(siteBrandingProfiles).values({
              id: profileId,
              organisationId: user.organisationId,
              regionId: null,
              siteId,
              profileName: dto.profileName ?? null,
            }),
          ]),
      this.db
        .update(siteBrandingProfileVersions)
        .set({ statusCode: retiredStatus, effectiveUntil: now })
        .where(
          and(
            eq(siteBrandingProfileVersions.brandingProfileId, profileId),
            eq(siteBrandingProfileVersions.statusCode, publishedStatus),
            isNull(siteBrandingProfileVersions.deletedAt),
          ),
        ),
      this.db.insert(siteBrandingProfileVersions).values({
        id: versionId,
        brandingProfileId: profileId,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        logoArtifactId: dto.logoArtifactId ?? null,
        brandColourToken: dto.brandColourToken ?? null,
        welcomeMessage: dto.welcomeMessage ?? null,
        backgroundArtifactId: null,
        organisationDisplayName: dto.organisationDisplayName ?? null,
        siteDisplayName: dto.siteDisplayName ?? null,
        helpContactReference: dto.helpContactReference ?? null,
        privacyNoticeVersionId: dto.privacyNoticeVersionId ?? null,
        statusCode: publishedStatus,
        publishedAt: now,
        effectiveFrom: now,
        approvedBy: user.userId,
      }),
      ...(junctions.languages.length
        ? [this.db.insert(siteBrandingProfileVersionLanguages).values(junctions.languages)]
        : []),
      ...(junctions.channels.length
        ? [this.db.insert(siteBrandingProfileVersionChannels).values(junctions.channels)]
        : []),
    ];
    const [first, ...rest] = statements;
    await this.db.batch([first, ...rest]);

    const published = await this.getVersionRow(profileId, versionId);
    return { profileId, version: published, logoUrl: resolvePublicAssetUrl(published.logoArtifactId) };
  }

  /** Site override → org default for kiosk/admin resolution. */
  async getPublishedForSite(siteId: string, user: AuthenticatedUser) {
    return this.resolvePublished(user.organisationId, siteId);
  }

  /**
   * Public / system path — same site→org branding hierarchy without a human JWT.
   * Used by phone QR check-in so visitors see the same personalisation as the kiosk.
   */
  async getPublishedForOrganisationSite(organisationId: string, siteId: string) {
    return this.resolvePublished(organisationId, siteId);
  }

  private async resolvePublished(organisationId: string, siteId: string) {
    const siteProfile = await this.db.query.siteBrandingProfiles.findFirst({
      where: and(
        eq(siteBrandingProfiles.organisationId, organisationId),
        eq(siteBrandingProfiles.siteId, siteId),
        isNull(siteBrandingProfiles.deletedAt),
      ),
    });

    const profile =
      siteProfile ??
      (await this.db.query.siteBrandingProfiles.findFirst({
        where: and(
          eq(siteBrandingProfiles.organisationId, organisationId),
          isNull(siteBrandingProfiles.siteId),
          isNull(siteBrandingProfiles.regionId),
          isNull(siteBrandingProfiles.deletedAt),
        ),
      }));

    if (!profile) return null;

    const publishedStatus = await this.typeDefs.id("configuration_version_status", "published");
    const version = await this.db.query.siteBrandingProfileVersions.findFirst({
      where: and(
        eq(siteBrandingProfileVersions.brandingProfileId, profile.id),
        eq(siteBrandingProfileVersions.statusCode, publishedStatus),
        isNull(siteBrandingProfileVersions.deletedAt),
      ),
      orderBy: [desc(siteBrandingProfileVersions.versionNumber)],
    });

    if (!version) return null;

    const [languages, channels] = await Promise.all([
      this.db.query.siteBrandingProfileVersionLanguages.findMany({
        where: and(
          eq(siteBrandingProfileVersionLanguages.brandingProfileVersionId, version.id),
          isNull(siteBrandingProfileVersionLanguages.deletedAt),
        ),
      }),
      this.db.query.siteBrandingProfileVersionChannels.findMany({
        where: and(
          eq(siteBrandingProfileVersionChannels.brandingProfileVersionId, version.id),
          isNull(siteBrandingProfileVersionChannels.deletedAt),
        ),
      }),
    ]);

    return {
      profile,
      version,
      languages,
      channels,
      brandingScope: siteProfile ? ("site" as const) : ("organisation" as const),
    };
  }

  private async latestVersionRow(profileId: string) {
    const rows = await this.db.query.siteBrandingProfileVersions.findMany({
      where: and(
        eq(siteBrandingProfileVersions.brandingProfileId, profileId),
        isNull(siteBrandingProfileVersions.deletedAt),
      ),
      orderBy: [desc(siteBrandingProfileVersions.versionNumber)],
      limit: 1,
    });
    return rows[0];
  }

  private async getVersionRow(profileId: string, versionId: string) {
    const found = await this.db.query.siteBrandingProfileVersions.findFirst({
      where: and(
        eq(siteBrandingProfileVersions.id, versionId),
        eq(siteBrandingProfileVersions.brandingProfileId, profileId),
        isNull(siteBrandingProfileVersions.deletedAt),
      ),
    });
    if (!found) throw new NotFoundException("Branding version not found");
    return found;
  }

  private assertLogoReference(reference: string | undefined, user: AuthenticatedUser) {
    if (reference && !isAllowedLogoReference(reference, user.organisationId)) {
      throw new BadRequestException({
        code: "LOGO_REFERENCE_INVALID",
        message: "Upload the logo first; inline images are not accepted.",
      });
    }
  }

  private async assertSite(siteId: string, user: AuthenticatedUser) {
    const site = await this.db.query.sites.findFirst({
      where: and(eq(sites.id, siteId), eq(sites.organisationId, user.organisationId), isNull(sites.deletedAt)),
    });
    if (!site) throw new NotFoundException("Site not found");
  }

  private async junctionRows(versionId: string, dto: CreateSiteBrandingVersionDto) {
    const [languageIds, channelIds] = await Promise.all([
      Promise.all((dto.languageCodes ?? []).map((code) => this.typeDefs.id("language_code", code))),
      Promise.all((dto.captureChannelCodes ?? []).map((code) => this.typeDefs.id("capture_channel", code))),
    ]);
    return {
      languages: languageIds.map((languageCode) => ({
        id: randomUUID(),
        brandingProfileVersionId: versionId,
        languageCode,
      })),
      channels: channelIds.map((captureChannelCode) => ({
        id: randomUUID(),
        brandingProfileVersionId: versionId,
        captureChannelCode,
      })),
    };
  }

  private async syncVersionJunctions(versionId: string, dto: CreateSiteBrandingVersionDto) {
    if (dto.languageCodes?.length) {
      for (const code of dto.languageCodes) {
        const languageCode = await this.typeDefs.id("language_code", code);
        await this.db.insert(siteBrandingProfileVersionLanguages).values({
          id: randomUUID(),
          brandingProfileVersionId: versionId,
          languageCode,
        });
      }
    }
    if (dto.captureChannelCodes?.length) {
      for (const code of dto.captureChannelCodes) {
        const captureChannelCode = await this.typeDefs.id("capture_channel", code);
        await this.db.insert(siteBrandingProfileVersionChannels).values({
          id: randomUUID(),
          brandingProfileVersionId: versionId,
          captureChannelCode,
        });
      }
    }
  }
}
