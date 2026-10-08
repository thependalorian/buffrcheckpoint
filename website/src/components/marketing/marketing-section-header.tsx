import type { ReactNode } from "react";

import { marketingEyebrow, marketingLead, marketingSectionTitle } from "@/lib/marketing-layout";

/** Section opener: yellow marker, optional eyebrow, title and lead, so every section starts the same way. */
export function MarketingSectionHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
}) {
  return (
    <header className="min-w-0 max-w-3xl">
      <div className="flex items-center gap-2">
        <span aria-hidden className="size-2 rounded-[2px] bg-[var(--color-sodium-yellow)]" />
        {eyebrow ? <p className={marketingEyebrow}>{eyebrow}</p> : null}
      </div>
      <h2 className={`mt-3 ${marketingSectionTitle}`}>{title}</h2>
      {lead ? <p className={`mt-4 ${marketingLead}`}>{lead}</p> : null}
    </header>
  );
}
