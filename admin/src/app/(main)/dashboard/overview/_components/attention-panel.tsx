import Link from "next/link";

import { BcPanel } from "@/components/bc-panel";
import { StatusChip, type StatusTone } from "@/components/status-chip";

export interface AttentionItem {
  label: string;
  count: number;
  href: string;
  tone: StatusTone;
}

/** What needs a person today, each line linking to the screen that clears it. */
export function AttentionPanel({ items }: { items: AttentionItem[] }) {
  const open = items.filter((item) => item.count > 0);
  return (
    <BcPanel header={<span>Needs attention</span>} className="h-full">
      {open.length === 0 ? (
        <div className="flex items-center gap-2 text-sm">
          <StatusChip tone="success">All clear</StatusChip>
          <span className="text-muted-foreground">Nothing is waiting on you.</span>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {open.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="flex items-center justify-between gap-3 py-3 text-sm outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>{item.label}</span>
                <StatusChip tone={item.tone} dot={false}>
                  {item.count}
                </StatusChip>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </BcPanel>
  );
}
