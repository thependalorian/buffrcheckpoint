"use client";

import type { ReactNode } from "react";

type ShellProps = {
  privacyNoticeSummary?: string;
  /** The small label in the header and footer. Defaults to the check-in wording. */
  label?: string;
  children: ReactNode;
};

/** Page frame for visitor check-in and sign-out: Checkpoint's own header and footer. Organisations do not customise it. */
export function CheckInShell({ privacyNoticeSummary, label = "Visitor check-in", children }: ShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2 text-sm text-muted-foreground">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="" width={28} height={28} className="rounded-md" />
            <span className="sr-only">Checkpoint</span>
          </a>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
        <div className="bc-surface p-5 sm:p-6">{children}</div>
      </main>

      <footer className="mt-auto border-t border-border bg-card">
        <div className="mx-auto max-w-lg space-y-2 px-4 py-6 text-center text-xs text-muted-foreground">
          {privacyNoticeSummary ? <p className="text-[11px] leading-relaxed">{privacyNoticeSummary}</p> : null}
          <p>
            <a href="/" className="underline underline-offset-2">
              Checkpoint
            </a>
          </p>
          <p>{label}</p>
        </div>
      </footer>
    </div>
  );
}
