/** Resolve branding/policy artifact ids to fetchable URLs for kiosk/admin. */
export function resolvePublicAssetUrl(artifactId: string | null | undefined): string | null {
  if (!artifactId) return null;
  if (
    artifactId.startsWith("http://") ||
    artifactId.startsWith("https://") ||
    artifactId.startsWith("data:image/")
  ) {
    return artifactId;
  }
  if (artifactId.startsWith("inline:")) return null;

  const base =
    process.env.PUBLIC_ASSET_BASE_URL ??
    process.env.VISITOR_CHECKIN_BASE_URL ??
    process.env.PUBLIC_WEB_BASE_URL ??
    process.env.CORS_ORIGIN?.split(",")[0]?.trim() ??
    "http://localhost:3000";

  // Visitor-facing tenant assets (org logos) must resolve on the website host,
  // not admin — even when PUBLIC_ASSET_BASE_URL points at the admin app.
  if (artifactId.startsWith("/org-assets/")) {
    const webBase = (
      process.env.VISITOR_CHECKIN_BASE_URL ??
      process.env.PUBLIC_WEB_BASE_URL ??
      "https://buffrcheckpoint.com"
    ).replace(/\/$/, "");
    return `${webBase}${artifactId}`;
  }

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
