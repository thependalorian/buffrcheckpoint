import { describe, expect, it } from "vitest";

import { authorizeUrl, buffrIdClient, challengeFor, decodeFlow, encodeFlow, pkcePair, sameState } from "./buffr-id";

const env = {
  BUFFR_ID_ISSUER: "https://id.buffr.ai/",
  BUFFR_ID_CLIENT_ID_ADMIN: "cid",
  BUFFR_ID_CLIENT_SECRET_ADMIN: "secret",
  PUBLIC_ADMIN_BASE_URL: "https://admin.buffrcheckpoint.com/",
};

describe("PKCE", () => {
  it("matches the RFC 7636 test vector", () => {
    expect(challengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });

  it("makes a fresh verifier and a matching challenge each time", () => {
    const a = pkcePair();
    const b = pkcePair();
    expect(a.verifier).not.toBe(b.verifier);
    expect(a.challenge).toBe(challengeFor(a.verifier));
    expect(a.verifier.length).toBeGreaterThanOrEqual(43);
  });
});

describe("client and authorize URL", () => {
  it("is off unless issuer, id and secret are all set", () => {
    expect(buffrIdClient("https://x.example", {})).toBeNull();
    expect(buffrIdClient("https://x.example", { ...env, BUFFR_ID_CLIENT_SECRET_ADMIN: "" })).toBeNull();
  });

  it("builds an authorization-code request with PKCE S256, state and nonce", () => {
    const client = buffrIdClient("https://ignored.example", env)!;
    expect(client.redirectUri).toBe("https://admin.buffrcheckpoint.com/api/auth/buffr-id/callback");
    const u = new URL(authorizeUrl(client, { state: "s", nonce: "n", challenge: "c" }));
    expect(u.origin + u.pathname).toBe("https://id.buffr.ai/api/auth/oauth2/authorize");
    expect(Object.fromEntries(u.searchParams)).toMatchObject({
      response_type: "code",
      client_id: "cid",
      state: "s",
      nonce: "n",
      code_challenge: "c",
      code_challenge_method: "S256",
      scope: "openid email profile",
    });
  });
});

describe("flow cookie", () => {
  it("round-trips and rejects junk", () => {
    const flow = {
      state: "s",
      nonce: "n",
      verifier: "v",
      intent: "register" as const,
      next: "/dashboard",
      organisationName: "Org",
      sectorCode: "sme",
      acceptTerms: true,
    };
    expect(decodeFlow(encodeFlow(flow))).toEqual(flow);
    expect(decodeFlow(undefined)).toBeNull();
    expect(decodeFlow("###")).toBeNull();
    expect(
      decodeFlow(
        Buffer.from(JSON.stringify({ state: "s", nonce: "n", verifier: "v", intent: "admin" })).toString("base64url"),
      ),
    ).toBeNull();
  });

  it("compares state exactly", () => {
    expect(sameState("abc", "abc")).toBe(true);
    expect(sameState("abc", "abd")).toBe(false);
    expect(sameState(null, "abc")).toBe(false);
    expect(sameState("ab", "abc")).toBe(false);
  });
});
