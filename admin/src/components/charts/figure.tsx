import type { ReactNode } from "react";

/**
 * Finding-first chart frame: the question as a label, the finding as the
 * title, then the encoding, then why it matters, what to do next and the
 * source. A chart without a finding is unfinished.
 */
export function Figure({
  question,
  finding,
  why,
  next,
  source,
  action,
  children,
}: {
  question: string;
  finding: string;
  why?: string;
  next?: string;
  source?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bc-panel min-w-0">
      <div className="bc-panel-header flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">{question}</p>
          <h2 className="mt-1 font-heading font-medium text-lg leading-snug">{finding}</h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="px-4 pb-2">{children}</div>
      {why || next || source ? (
        <div className="space-y-1 border-border border-t px-4 py-3 text-sm">
          {why ? <p className="text-muted-foreground">{why}</p> : null}
          {next ? <p className="font-medium">{next}</p> : null}
          {source ? <p className="font-mono text-muted-foreground text-xs">{source}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
