import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface GrantHistoryRow {
  id: string;
  status: string;
  reasonLabel: string;
  requestedDurationMs: number;
  customerApprovedAt: string | null;
  deniedAt: string | null;
  denialReason: string | null;
  revokedAt: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  sessionCount: number;
  lastSessionAt: string | null;
  recordedWriteCount: number;
}

function describeDecision(row: GrantHistoryRow): string {
  if (row.deniedAt) return `Denied ${new Date(row.deniedAt).toLocaleString()}`;
  if (row.revokedAt) return `Revoked ${new Date(row.revokedAt).toLocaleString()}`;
  if (row.customerApprovedAt) return `Approved ${new Date(row.customerApprovedAt).toLocaleString()}`;
  return "No decision recorded";
}

/**
 * The accountability half of the consent gate. Approving a support-access
 * request was previously the end of what a customer could see; this shows what
 * happened afterwards — whether the window was used, how many sessions were
 * minted under it, and how many writes those sessions recorded.
 */
export function GrantHistory({ rows }: { rows: GrantHistoryRow[] }) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <Card key={row.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {row.reasonLabel.replaceAll("_", " ")} · {row.status.replaceAll("_", " ")}
            </CardTitle>
            <CardDescription>{describeDecision(row)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-muted-foreground text-sm">
            {row.startsAt && row.expiresAt ? (
              <p>
                Window {new Date(row.startsAt).toLocaleString()} to {new Date(row.expiresAt).toLocaleString()}
              </p>
            ) : (
              <p>Approved for up to {Math.round(row.requestedDurationMs / (60 * 60 * 1000))} hour(s)</p>
            )}
            <p>
              {row.sessionCount === 0
                ? "No support session was ever opened under this approval."
                : `${row.sessionCount} support session(s), most recently ${
                    row.lastSessionAt ? new Date(row.lastSessionAt).toLocaleString() : "unknown"
                  }.`}
            </p>
            <p>
              {row.recordedWriteCount === 0
                ? "No changes to your data were recorded."
                : `${row.recordedWriteCount} change(s) to your data recorded in the support audit trail.`}
            </p>
            {row.denialReason ? <p>Reason given: {row.denialReason}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
