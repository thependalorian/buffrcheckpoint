import { DATA } from "@/lib/chartTokens";
import { WEEKDAYS_SHORT } from "@/lib/copy/analytics";

/**
 * Day-of-week by hour grid. Opacity scales with arrivals against the busiest
 * cell; hours with no arrivals stay blank. Only hours that saw any arrival
 * across the week are shown, so an overnight-closed desk is not 24 columns of nothing.
 */
export function BusyHoursHeatmap({ matrix }: { matrix: number[][] }) {
  const max = Math.max(1, ...matrix.flat());
  const activeHours = Array.from({ length: 24 }, (_, h) => h).filter((h) => matrix.some((row) => row[h] > 0));
  const hours = activeHours.length > 0 ? activeHours : Array.from({ length: 24 }, (_, h) => h);

  return (
    <div className="overflow-x-auto py-2">
      <table className="w-full border-separate border-spacing-0.5 text-xs">
        <thead>
          <tr>
            <th className="w-10" />
            {hours.map((h) => (
              <th key={h} className="font-mono font-normal text-muted-foreground">
                {String(h).padStart(2, "0")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, day) => (
            <tr key={WEEKDAYS_SHORT[day]}>
              <th className="pr-2 text-left font-normal text-muted-foreground">{WEEKDAYS_SHORT[day]}</th>
              {hours.map((h) => (
                <td
                  key={h}
                  title={`${WEEKDAYS_SHORT[day]} ${String(h).padStart(2, "0")}:00, ${row[h]} arrivals`}
                  className="h-7 min-w-6 rounded-sm border border-border/60"
                  style={row[h] > 0 ? { backgroundColor: DATA, opacity: 0.15 + 0.85 * (row[h] / max) } : undefined}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
