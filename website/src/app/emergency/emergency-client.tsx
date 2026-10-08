"use client";

import { useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";

import { apiBaseUrl } from "@/lib/api";
import { formatNoticeDate, siteNoticesCopy } from "@/lib/copy/site-notices";

import { CheckInShell } from "../check-in/check-in-shell";

interface EmergencyInfo {
  siteName: string;
  available: boolean;
  contentText: string | null;
  versionNumber: number | null;
  updatedAt: string | null;
}

type State = { kind: "loading" } | { kind: "invalid" } | { kind: "ready"; info: EmergencyInfo };

export default function EmergencyClient() {
  const params = useSearchParams();
  const siteId = params.get("site")?.trim() ?? "";
  const referenceId = params.get("ref")?.trim() ?? "";
  const copy = siteNoticesCopy.emergency;
  const [state, setState] = useState<State>(siteId && referenceId ? { kind: "loading" } : { kind: "invalid" });

  useEffect(() => {
    if (!siteId || !referenceId) return;
    let cancelled = false;
    fetch(
      `${apiBaseUrl()}/public/emergency-info?site=${encodeURIComponent(siteId)}&ref=${encodeURIComponent(referenceId)}`,
    )
      .then(async (res) => {
        if (!res.ok) return { kind: "invalid" } as const;
        return { kind: "ready", info: (await res.json()) as EmergencyInfo } as const;
      })
      .catch(() => ({ kind: "invalid" }) as const)
      .then((next) => {
        if (!cancelled) setState(next);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId, referenceId]);

  return (
    <CheckInShell label={copy.shellLabel}>
      <div className="space-y-4">
        <h1 className="font-semibold text-2xl tracking-tight text-foreground">{copy.title}</h1>
        {state.kind === "loading" ? <p className="text-sm text-muted-foreground">{copy.loading}</p> : null}
        {state.kind === "invalid" ? (
          <p className="text-sm text-foreground" role="alert">
            {copy.invalidLink}
          </p>
        ) : null}
        {state.kind === "ready" ? (
          <>
            <p className="text-sm text-muted-foreground">{copy.siteLine(state.info.siteName)}</p>
            {state.info.available && state.info.contentText ? (
              <>
                <div className="whitespace-pre-line text-base leading-relaxed text-foreground">
                  {state.info.contentText}
                </div>
                {state.info.versionNumber ? (
                  <p className="text-muted-foreground text-xs">
                    {copy.updated(state.info.versionNumber, formatNoticeDate(state.info.updatedAt))}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-foreground">{copy.notPublished}</p>
            )}
          </>
        ) : null}
      </div>
    </CheckInShell>
  );
}
