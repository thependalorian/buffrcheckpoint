import { DATA, DATA_MUTED } from "@/lib/chartTokens";

export interface ShareRow {
  label: string;
  count: number;
  share: number | null;
}

/** Horizontal share bars on a zero baseline. The lead row carries the data colour, the rest are muted. */
export function ShareBars({ rows }: { rows: ShareRow[] }) {
  return (
    <ul className="space-y-3 py-2">
      {rows.map((row, index) => (
        <li key={row.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className={index === 0 ? "font-medium" : "text-muted-foreground"}>{row.label}</span>
            <span className="font-mono tabular-nums">
              {row.share === null ? "n/a" : `${row.share}%`}{" "}
              <span className="text-muted-foreground">({row.count})</span>
            </span>
          </div>
          <div className="h-2.5 w-full rounded-sm bg-[color-mix(in_srgb,var(--color-frost)_40%,transparent)]">
            <div
              className="h-full rounded-sm"
              style={{ width: `${Math.max(row.share ?? 0, 0.5)}%`, backgroundColor: index === 0 ? DATA : DATA_MUTED }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
