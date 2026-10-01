export interface IntegrationHealthRow {
  name: string;
  status: "healthy" | "degraded" | "down" | "not_configured";
  latencyMs: number | null;
  detail: string;
}

const STATUS_TEXT: Record<IntegrationHealthRow["status"], string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  down: "Down",
  not_configured: "Not configured",
};

/** Live status of every external dependency, probed when the page loads. */
export function IntegrationHealthPanel({
  rows,
  checkedAt,
}: {
  rows: IntegrationHealthRow[];
  checkedAt: string | null;
}) {
  const problems = rows.filter((r) => r.status === "down" || r.status === "degraded").length;
  return (
    <div className="bc-panel">
      <div className="bc-panel-header">
        <p className="font-heading font-medium text-lg leading-none">Integration health</p>
        <p className="mt-1 font-normal text-muted-foreground text-sm">
          {rows.length === 0
            ? "Health check unavailable."
            : problems === 0
              ? "No integration is down or degraded."
              : `${problems} integration${problems === 1 ? "" : "s"} need attention.`}
          {checkedAt ? ` Checked ${new Date(checkedAt).toLocaleTimeString()}.` : ""}
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border border-b text-left text-muted-foreground">
            <th className="px-4 py-2 font-medium">Integration</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 text-right font-medium">Latency</th>
            <th className="px-4 py-2 font-medium">Detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-border border-b last:border-0">
              <td className="px-4 py-2">{row.name}</td>
              <td
                className={`px-4 py-2 ${row.status === "down" || row.status === "degraded" ? "font-medium text-destructive" : "text-muted-foreground"}`}
              >
                {STATUS_TEXT[row.status]}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {row.latencyMs === null ? "-" : `${row.latencyMs} ms`}
              </td>
              <td className="px-4 py-2 text-muted-foreground">{row.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
