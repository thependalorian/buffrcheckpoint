"use client";

import { useEffect, useState } from "react";

export interface BuffrIdUiConfig {
  loaded: boolean;
  enabled: boolean;
  issuer: string | null;
  legacyPassword: "on" | "kiosk" | "off";
}

const INITIAL: BuffrIdUiConfig = { loaded: false, enabled: false, issuer: null, legacyPassword: "on" };

/** Whether to offer Buffr ID, and whether the password form is still open. Fails to the old behaviour if the call fails. */
export function useBuffrIdConfig(): BuffrIdUiConfig {
  const [config, setConfig] = useState<BuffrIdUiConfig>(INITIAL);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/buffr-id/config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled) return;
        setConfig({
          loaded: true,
          enabled: body?.enabled === true,
          issuer: typeof body?.issuer === "string" ? body.issuer : null,
          legacyPassword: body?.legacyPassword === "kiosk" || body?.legacyPassword === "off" ? body.legacyPassword : "on",
        });
      })
      .catch(() => !cancelled && setConfig({ ...INITIAL, loaded: true }));
    return () => {
      cancelled = true;
    };
  }, []);
  return config;
}
