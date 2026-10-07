import { createHash, randomBytes } from "node:crypto";

// Sign in with Buffr ID (OIDC authorization code with PKCE S256). Buffr ID proves who the person is; the backend turns the ID token
// into an ordinary Checkpoint session (POST /auth/buffr-id/exchange), so nothing downstream of sign-in changes.

export type FlowIntent = "signin" | "register";

export interface BuffrIdClient {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** Null when Buffr ID sign-in is not configured for this deployment. */
export function buffrIdClient(
  origin: string,
  env: Record<string, string | undefined> = process.env,
): BuffrIdClient | null {
  const issuer = env.BUFFR_ID_ISSUER?.trim().replace(/\/$/, "");
  const clientId = env.BUFFR_ID_CLIENT_ID_ADMIN?.trim();
  const clientSecret = env.BUFFR_ID_CLIENT_SECRET_ADMIN?.trim();
  if (!issuer || !clientId || !clientSecret) return null;
  const base = (env.PUBLIC_ADMIN_BASE_URL?.trim() || origin).replace(/\/$/, "");
  return { issuer, clientId, clientSecret, redirectUri: `${base}/api/auth/buffr-id/callback` };
}

const b64url = (buf: Buffer) => buf.toString("base64url");

export function randomToken(bytes = 32): string {
  return b64url(randomBytes(bytes));
}

export function pkcePair(): { verifier: string; challenge: string } {
  const verifier = randomToken(48);
  return { verifier, challenge: challengeFor(verifier) };
}

export function challengeFor(verifier: string): string {
  return b64url(createHash("sha256").update(verifier).digest());
}

export function authorizeUrl(client: BuffrIdClient, p: { state: string; nonce: string; challenge: string }): string {
  const url = new URL(`${client.issuer}/api/auth/oauth2/authorize`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: client.clientId,
    redirect_uri: client.redirectUri,
    scope: "openid email profile",
    state: p.state,
    nonce: p.nonce,
    code_challenge: p.challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

export interface FlowState {
  state: string;
  nonce: string;
  verifier: string;
  intent: FlowIntent;
  next: string | null;
  organisationName: string | null;
  sectorCode: string | null;
  /** The person ticked the agreement before being sent to Buffr ID. Only meaningful for `register`. */
  acceptTerms: boolean;
}

export const FLOW_COOKIE = "bc_buffr_id_flow";
export const FLOW_MAX_AGE_SECONDS = 10 * 60;

export function encodeFlow(flow: FlowState): string {
  return Buffer.from(JSON.stringify(flow)).toString("base64url");
}

export function decodeFlow(raw: string | undefined): FlowState | null {
  if (!raw) return null;
  try {
    const f = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<FlowState>;
    if (typeof f.state !== "string" || typeof f.nonce !== "string" || typeof f.verifier !== "string") return null;
    if (f.intent !== "signin" && f.intent !== "register") return null;
    return {
      state: f.state,
      nonce: f.nonce,
      verifier: f.verifier,
      intent: f.intent,
      next: typeof f.next === "string" ? f.next : null,
      organisationName: typeof f.organisationName === "string" ? f.organisationName : null,
      sectorCode: typeof f.sectorCode === "string" ? f.sectorCode : null,
      acceptTerms: f.acceptTerms === true,
    };
  } catch {
    return null;
  }
}

/** Constant-time-enough comparison for the state parameter. */
export function sameState(a: string | null, b: string): boolean {
  return (
    a !== null &&
    a.length === b.length &&
    createHash("sha256").update(a).digest().equals(createHash("sha256").update(b).digest())
  );
}
