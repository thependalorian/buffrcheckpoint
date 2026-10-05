import { DashboardErrorState } from "@/components/dashboard-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";

import { RecordAccessReviewForm } from "./record-access-review-form";

interface MemberRow {
  membershipId: string;
  userId: string;
  email: string;
  roleLabel: string;
  lastReviewOutcome: string | null;
  lastReviewedAt: string | null;
}

interface Summary {
  memberCount: number;
  reviewedCount: number;
  unreviewedCount: number;
  actionRequiredCount: number;
  lastReviewedAt: string | null;
}

interface HistoryRow {
  id: string;
  reviewedUserEmail: string;
  outcomeCode: string;
  occurredAt: string;
  note: string | null;
}

export async function AccessReviewsTab() {
  let members: MemberRow[] = [];
  let summary: Summary | null = null;
  let history: HistoryRow[] = [];
  let error: string | null = null;

  try {
    [members, summary, history] = await Promise.all([
      api.get<MemberRow[]>("/access-reviews/members"),
      api.get<Summary>("/access-reviews/summary"),
      api.get<HistoryRow[]>("/access-reviews/history"),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load access reviews.";
    if (message.includes("403")) {
      return (
        <p className="text-muted-foreground text-sm">
          Access reviews require the access_review.manage permission (owner, system administrator, or compliance
          officer).
        </p>
      );
    }
    error = message;
  }

  if (error) {
    return <DashboardErrorState message={error} />;
  }

  return (
    <div className="space-y-6">
      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active members</CardDescription>
              <CardTitle className="text-2xl">{summary.memberCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Attested</CardDescription>
              <CardTitle className="text-2xl">{summary.reviewedCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Not yet reviewed</CardDescription>
              <CardTitle className="text-2xl">{summary.unreviewedCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Needs follow-up</CardDescription>
              <CardTitle className="text-2xl">{summary.actionRequiredCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Membership attestation</CardTitle>
          <CardDescription>
            Record whether each member&apos;s access is still appropriate. Outcomes are append-only — a correction is a
            new row, not an edit. Role changes still happen under Users and Roles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.length === 0 ? (
            <p className="text-muted-foreground text-sm">No active memberships to review.</p>
          ) : (
            members.map((member) => (
              <div
                key={member.membershipId}
                className="flex flex-col gap-3 border-b border-border pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{member.email}</p>
                  <p className="text-muted-foreground text-sm">{member.roleLabel}</p>
                  {member.lastReviewOutcome ? (
                    <Badge variant="outline" className="mt-2">
                      Last: {member.lastReviewOutcome.replaceAll("_", " ")}
                      {member.lastReviewedAt ? ` · ${new Date(member.lastReviewedAt).toLocaleDateString()}` : ""}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="mt-2">
                      Not reviewed
                    </Badge>
                  )}
                </div>
                <RecordAccessReviewForm reviewedUserId={member.userId} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {history.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Review history</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{new Date(row.occurredAt).toLocaleString()}</TableCell>
                    <TableCell>{row.reviewedUserEmail}</TableCell>
                    <TableCell>{row.outcomeCode.replaceAll("_", " ")}</TableCell>
                    <TableCell className="text-muted-foreground">{row.note ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
