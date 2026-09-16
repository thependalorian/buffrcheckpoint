"use client";

import type { ReactNode } from "react";

export type CheckInBranding = {
  organisationDisplayName: string | null;
  siteDisplayName: string | null;
  welcomeMessage: string | null;
  brandColourToken: string | null;
  logoUrl: string | null;
  helpContactReference: string | null;
  brandingScope?: "site" | "organisation";
};

/** Prefer same-origin tenant paths so org logos load from the website, not admin. */
export function resolveOrgLogoSrc(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null;
  try {
    const parsed = new URL(logoUrl, "https://buffrcheckpoint.com");
    if (parsed.pathname.startsWith("/org-assets/")) {
      return parsed.pathname;
    }
    // Legacy Checkpoint default artifact — only when branding still points at product logo
    if (parsed.pathname === "/logo.png") {
      return "/logo.png";
    }
    return logoUrl;
  } catch {
    return logoUrl.startsWith("/") ? logoUrl : null;
  }
}

type ShellProps = {
  branding: CheckInBranding | null;
  siteNameFallback: string;
  privacyNoticeSummary?: string;
  children: ReactNode;
};

/**
 * Organisation owns hero + footer when published branding exists.
 * Buffr Checkpoint chrome is fallback only (no competing product mark in the hero).
 */
export function CheckInBrandedShell({
  branding,
  siteNameFallback,
  privacyNoticeSummary,
  children,
}: ShellProps) {
  const branded = Boolean(branding);
  const accent = branding?.brandColourToken || "#CF1161";
  const logoSrc = resolveOrgLogoSrc(branding?.logoUrl);
  const orgName = branding?.organisationDisplayName || null;
  const siteName = branding?.siteDisplayName || siteNameFallback;
  const welcome = branding?.welcomeMessage || "Complete the visitor register details for this site.";
  const fieldBg = branded ? "#FDEEF2" : "#FFFFFF";
  const ink = branded ? "#3D1152" : undefined;
  const muted = branded ? "#705C67" : undefined;

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: fieldBg }}>
      {branded ? (
        <header className="border-b border-[#EDEBEC] bg-white/90">
          <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-4 py-8 text-center">
            <div className="h-1.5 w-16 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- tenant logos are dynamic paths
              <img
                src={logoSrc}
                alt={orgName || siteName}
                className="h-16 w-16 rounded-2xl object-contain"
              />
            ) : null}
            {orgName ? (
              <p className="text-sm font-medium tracking-tight" style={{ color: accent }}>
                {orgName}
              </p>
            ) : null}
            <h1 className="text-2xl font-light tracking-tight sm:text-3xl" style={{ color: ink }}>
              {welcome}
            </h1>
            <p className="text-sm" style={{ color: muted }}>
              {siteName}
            </p>
          </div>
        </header>
      ) : (
        <header className="border-b border-border/40 bg-white">
          <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
            <a href="/" className="flex items-center gap-2 text-sm text-muted-foreground">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.png" alt="" width={28} height={28} className="rounded-md" />
              <span className="sr-only">Buffr Checkpoint</span>
            </a>
            <span className="text-xs text-muted-foreground">Visitor check-in</span>
          </div>
        </header>
      )}

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">{children}</main>

      <footer className="mt-auto border-t border-[#EDEBEC] bg-white/80">
        <div className="mx-auto max-w-lg space-y-2 px-4 py-6 text-center text-xs" style={{ color: muted || "#675C62" }}>
          {branded ? (
            <>
              {orgName || siteName ? (
                <p className="font-medium" style={{ color: ink }}>
                  {[orgName, siteName].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              {branding?.helpContactReference ? (
                <p>
                  Need help?{" "}
                  <a
                    className="underline underline-offset-2"
                    href={
                      branding.helpContactReference.includes("@")
                        ? `mailto:${branding.helpContactReference}`
                        : undefined
                    }
                    style={{ color: accent }}
                  >
                    {branding.helpContactReference}
                  </a>
                </p>
              ) : null}
              {/* opacity-70/80 dimming previously dropped this text below
                  WCAG AA on white (muted @70% ~3.23:1, @80% ~4.00:1, both
                  under the 4.5:1 required at 11px) — the base muted color
                  already reads as visually quiet at full opacity (~6.39:1),
                  so the dimming was unnecessary as well as non-compliant. */}
              {privacyNoticeSummary ? (
                <p className="text-[11px] leading-relaxed">{privacyNoticeSummary}</p>
              ) : null}
              <p className="pt-1 text-[11px]">Secured by Buffr Checkpoint</p>
            </>
          ) : (
            <>
              <p>
                <a href="/" className="underline underline-offset-2">
                  Buffr Checkpoint
                </a>
              </p>
              <p>Visitor check-in</p>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
