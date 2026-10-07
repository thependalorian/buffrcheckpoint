/** Resolve policy artifact ids to fetchable URLs for kiosk/admin. */
export function resolvePublicAssetUrl(artifactId: string | null | undefined): string | null {
  if (!artifactId) return null;
  if (artifactId.startsWith("http://") || artifactId.startsWith("https://") || artifactId.startsWith("data:image/")) {
    return artifactId;
  }
  if (artifactId.startsWith("inline:")) return null;

  const base =
    process.env.PUBLIC_ASSET_BASE_URL ??
    process.env.VISITOR_CHECKIN_BASE_URL ??
    process.env.PUBLIC_WEB_BASE_URL ??
    process.env.CORS_ORIGIN?.split(",")[0]?.trim() ??
    "http://localhost:3000";

  if (artifactId.startsWith("/")) return `${base.replace(/\/$/, "")}${artifactId}`;
  return `${base.replace(/\/$/, "")}/${artifactId}`;
}

/** Inline artifact text stored as `inline:<body>` in content_artifact_id. */
export function resolveInlineArtifactText(artifactId: string | null | undefined): string | null {
  if (!artifactId?.startsWith("inline:")) return null;
  return artifactId.slice("inline:".length);
}

/** Visitor-scannable public check-in QR payload (site-bound, no PII). */
export function buildPublicCheckInQrUrl(siteId: string, referenceId: string): string {
  const base =
    process.env.VISITOR_CHECKIN_BASE_URL ??
    process.env.PUBLIC_WEB_BASE_URL ??
    process.env.PUBLIC_ASSET_BASE_URL ??
    "https://buffrcheckpoint.com";
  const normalizedBase = base.replace(/\/$/, "");
  return `${normalizedBase}/check-in?site=${siteId}&ref=${referenceId}`;
}

/** QR types a visitor or contractor scans with a phone, mapped to the public page that opens. */
const PUBLIC_QR_PATHS: Readonly<Record<string, string>> = {
  public_site_checkin: "/check-in",
  emergency_info: "/emergency",
  contractor_induction: "/induction",
};

export function isPublicQrType(typeCode: string): boolean {
  return typeCode in PUBLIC_QR_PATHS;
}

/** The URL printed in a site QR code of the given type: site-bound and free of personal data. */
export function buildPublicQrUrl(typeCode: string, siteId: string, referenceId: string): string {
  const path = PUBLIC_QR_PATHS[typeCode];
  if (!path) throw new Error(`QR type "${typeCode}" has no public page`);
  const base =
    process.env.VISITOR_CHECKIN_BASE_URL ??
    process.env.PUBLIC_WEB_BASE_URL ??
    process.env.PUBLIC_ASSET_BASE_URL ??
    "https://buffrcheckpoint.com";
  return `${base.replace(/\/$/, "")}${path}?site=${siteId}&ref=${referenceId}`;
}

/** The URL in a device support QR: an admin page that needs a sign-in and the device permission, so the code itself reveals nothing. */
export function buildDeviceSupportUrl(deviceId: string): string {
  const base = (process.env.PUBLIC_ADMIN_BASE_URL ?? "https://admin.buffrcheckpoint.com").replace(/\/$/, "");
  return `${base}/dashboard/devices/${deviceId}`;
}
