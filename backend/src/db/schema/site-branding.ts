import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { visitorPolicyVersions } from "./consent";
import { organisations, regions } from "./organisations";
import { sites } from "./sites";
import { typeDefinition } from "./type-definitions";

/**
 * Section 11.9.8.2 — organisation/site branding with immutable version rows.
 * Hierarchy: org default (site_id NULL) → region override → site override.
 */
export const siteBrandingProfiles = pgTable(
  "site_branding_profiles",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    regionId: uuid("region_id").references(() => regions.id),
    siteId: uuid("site_id").references(() => sites.id),
    profileName: text("profile_name"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_site_branding_profiles_org").on(t.organisationId, t.siteId)],
);

// Immutable once published — corrections are new version rows (form-templates pattern).
export const siteBrandingProfileVersions = pgTable(
  "site_branding_profile_versions",
  {
    id: uuid("id").primaryKey(),
    brandingProfileId: uuid("branding_profile_id")
      .notNull()
      .references(() => siteBrandingProfiles.id),
    versionNumber: integer("version_number").notNull(),
    logoArtifactId: text("logo_artifact_id"),
    brandColourToken: text("brand_colour_token"),
    welcomeMessage: text("welcome_message"),
    backgroundArtifactId: text("background_artifact_id"),
    organisationDisplayName: text("organisation_display_name"),
    siteDisplayName: text("site_display_name"),
    helpContactReference: text("help_contact_reference"),
    privacyNoticeVersionId: uuid("privacy_notice_version_id").references(() => visitorPolicyVersions.id),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }),
    effectiveUntil: timestamp("effective_until", { withTimezone: true }),
    approvedBy: uuid("approved_by"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    statusCode: uuid("status_code").references(() => typeDefinition.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_site_branding_profile_versions_profile").on(t.brandingProfileId),
    uniqueIndex("idx_site_branding_profile_versions_profile_version").on(
      t.brandingProfileId,
      t.versionNumber,
    ),
  ],
);

export const siteBrandingProfileVersionLanguages = pgTable(
  "site_branding_profile_version_languages",
  {
    id: uuid("id").primaryKey(),
    brandingProfileVersionId: uuid("branding_profile_version_id")
      .notNull()
      .references(() => siteBrandingProfileVersions.id),
    languageCode: uuid("language_code")
      .notNull()
      .references(() => typeDefinition.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_site_branding_profile_version_languages_version").on(t.brandingProfileVersionId),
    uniqueIndex("idx_site_branding_profile_version_languages_unique").on(
      t.brandingProfileVersionId,
      t.languageCode,
    ),
  ],
);

export const siteBrandingProfileVersionChannels = pgTable(
  "site_branding_profile_version_channels",
  {
    id: uuid("id").primaryKey(),
    brandingProfileVersionId: uuid("branding_profile_version_id")
      .notNull()
      .references(() => siteBrandingProfileVersions.id),
    captureChannelCode: uuid("capture_channel_code")
      .notNull()
      .references(() => typeDefinition.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_site_branding_profile_version_channels_version").on(t.brandingProfileVersionId),
    uniqueIndex("idx_site_branding_profile_version_channels_unique").on(
      t.brandingProfileVersionId,
      t.captureChannelCode,
    ),
  ],
);

export type SiteBrandingProfile = typeof siteBrandingProfiles.$inferSelect;
export type SiteBrandingProfileVersion = typeof siteBrandingProfileVersions.$inferSelect;
