/**
 * Env / config for CiMSO INNterchange (TCP client).
 * Spec: docs/cimso-innterchange/NDA_PACKAGE_NOTES.md
 *
 * Legacy CIMSO_INNTERCHANGE_BASE_URL / API_KEY are accepted as aliases
 * only for migration; prefer HOST/PORT/LOGIN/PASSWORD.
 */
export function getCimsoConfig() {
  const host = (process.env.CIMSO_INNTERCHANGE_HOST ?? "").trim();
  const portRaw = (process.env.CIMSO_INNTERCHANGE_PORT ?? "").trim();
  const port = portRaw ? Number(portRaw) : 0;
  const tls =
    (process.env.CIMSO_INNTERCHANGE_TLS ?? "true").trim().toLowerCase() !== "false";
  const clientLoginId = (process.env.CIMSO_INNTERCHANGE_CLIENT_LOGIN_ID ?? "").trim();
  const clientPassword = (process.env.CIMSO_INNTERCHANGE_CLIENT_PASSWORD ?? "").trim();
  const siteExternalId = (process.env.CIMSO_SITE_EXTERNAL_ID ?? "").trim();
  const enabledRaw = (process.env.CIMSO_ENABLED_INTERFACE_TYPES ?? "1,3,4").trim();
  const enabledInterfaceTypes = enabledRaw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 11);

  // Legacy aliases (pre-package REST assumption)
  const legacyBaseUrl = (process.env.CIMSO_INNTERCHANGE_BASE_URL ?? "").trim();
  const legacyApiKey = (process.env.CIMSO_INNTERCHANGE_API_KEY ?? "").trim();

  const transportConfigured = Boolean(
    (host && port > 0 && clientLoginId && clientPassword) ||
      (legacyBaseUrl && legacyApiKey),
  );

  return {
    host,
    port: Number.isFinite(port) ? port : 0,
    tls,
    clientLoginId,
    // Never return password from status endpoints.
    clientPasswordPresent: clientPassword.length > 0,
    clientPassword,
    siteExternalId,
    enabledInterfaceTypes: enabledInterfaceTypes.length ? enabledInterfaceTypes : [1, 3, 4],
    transportConfigured,
    legacyBaseUrl,
    legacyApiKeyPresent: legacyApiKey.length > 0,
    // Back-compat fields for older status consumers
    baseUrl: host ? `${tls ? "tls" : "tcp"}://${host}:${port}` : legacyBaseUrl,
    apiKeyPresent: clientPassword.length > 0 || legacyApiKey.length > 0,
    apiKey: clientPassword || legacyApiKey,
  };
}

export type CimsoConfig = ReturnType<typeof getCimsoConfig>;
