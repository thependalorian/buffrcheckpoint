export const MAX_LOGO_BYTES = 400_000;
export const LOGO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const brandingCopy = {
  trigger: "Add branding",
  title: "Organisation branding",
  description: "Saves and publishes branding in one step. Kiosks and phone check-in pick it up on their next sync.",
  page: {
    title: "Organisation Branding",
    description: "Version-controlled logos, welcome messages, languages, and channel visibility per site.",
    loadFailed: "Failed to load branding profiles.",
    columns: { profile: "Profile", scope: "Scope", site: "Site" },
    emptyTitle: "No branding profiles yet",
    emptyDescription:
      "Start with the organisation default. Add a site override later if one site needs a different look.",
    unnamed: "Unnamed profile",
    scope: { site: "Site override", region: "Region default", organisation: "Organisation default" },
    allSites: "All sites",
  },
  siteOverride: "Use different branding for one site (advanced)",
  dropzoneContract: "PNG, JPG, or WebP · up to 400 KB",
  currentLogoKept: "Your current published logo keeps showing until this version is published.",
  published: {
    title: "Branding published. This is what visitors will see.",
    returnToReadiness: "Return to launch readiness",
    close: "Done",
  },
  fields: {
    site: "Site",
    profileName: "Profile name",
    profileNameDefault: "Site branding",
    organisationDisplayName: "Organisation display name",
    siteDisplayName: "Site display name",
    welcomeMessage: "Welcome message",
    welcomeMessageDefault: "Welcome",
    brandColour: "Brand colour (hex)",
    logo: "Logo",
    logoHint: "PNG, JPEG or WebP under 400 KB. It is resized for kiosk and phone screens.",
    logoPreviewAlt: "Logo preview",
    helpContact: "Help contact",
    helpContactPlaceholder: "Reception: ext 100",
  },
  uploading: "Uploading logo...",
  saving: "Saving...",
  submit: "Save and publish",
  /** Pre-upload size error naming the actual size (§11.9.15.5). */
  tooLarge: (kilobytes: number) => `This image is ${kilobytes} KB. Choose an image under 400 KB.`,
  saveFailed: "Could not publish branding.",
  errors: {
    LOGO_TOO_LARGE: "Logo must be under 400 KB. Compress the image and try again.",
    LOGO_UNSUPPORTED_TYPE: "Logo must be a PNG, JPEG or WebP image.",
    LOGO_UNREADABLE: "The logo image could not be read. Try exporting it again.",
    LOGO_MISSING: "Choose a logo file to upload.",
    upload: "Could not upload the logo. Try again.",
  },
} as const;

export type LogoErrorCode = Exclude<keyof typeof brandingCopy.errors, "upload">;

export function logoErrorMessage(code: string | undefined, fallback?: string): string {
  if (code && code in brandingCopy.errors) return brandingCopy.errors[code as LogoErrorCode];
  return fallback ?? brandingCopy.errors.upload;
}

/** Checks type and size before upload, so the user hears about a bad file at once and nothing is sent. */
export function validateLogoFile(file: { type: string; size: number }): string | null {
  if (!(LOGO_MIME_TYPES as readonly string[]).includes(file.type)) return brandingCopy.errors.LOGO_UNSUPPORTED_TYPE;
  if (file.size > MAX_LOGO_BYTES) return brandingCopy.tooLarge(Math.round(file.size / 1000));
  return null;
}
