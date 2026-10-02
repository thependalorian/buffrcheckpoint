import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { reportsCopy } from "@/lib/copy/reports";

import { type ReportSchedule, ReportScheduleForm } from "./_components/report-schedule-form";

interface SchedulesResponse {
  reports: ReportSchedule[];
  recipientRoleOptions: { code: string; label: string }[];
}

interface RunRow {
  id: string;
  reportCode: string;
  periodKey: string;
  status: string | null;
  recipientCount: number | null;
  errorMessage: string | null;
}

export default async function ScheduledReportsPage() {
  let data: SchedulesResponse | null = null;
  let runs: RunRow[] = [];
  let error: string | null = null;
  try {
    [data, runs] = await Promise.all([
      api.get<SchedulesResponse>("/reports/schedules"),
      api.get<RunRow[]>("/reports/schedules/runs"),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load scheduled reports.";
  }

  const labelFor = (code: string) => data?.reports.find((r) => r.reportCode === code)?.label ?? code;

  return (
    <div className="space-y-6">
      <DashboardPageHeader title={reportsCopy.title} description={reportsCopy.description} />
      {error || !data ? (
        <DashboardErrorState message={error ?? "Failed to load scheduled reports."} />
      ) : (
        <>
          <div className="space-y-4">
            {data.reports.map((report) => (
              <ReportScheduleForm key={report.reportCode} report={report} roleOptions={data.recipientRoleOptions} />
            ))}
          </div>
          <section className="space-y-2">
            <h2 className="font-medium text-sm">{reportsCopy.runsHeading}</h2>
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{reportsCopy.columns.report}</TableHead>
                    <TableHead>{reportsCopy.columns.period}</TableHead>
                    <TableHead>{reportsCopy.columns.status}</TableHead>
                    <TableHead className="text-right">{reportsCopy.columns.recipients}</TableHead>
                    <TableHead>{reportsCopy.columns.note}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        {reportsCopy.runsEmpty}
                      </TableCell>
                    </TableRow>
                  ) : (
                    runs.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell>{labelFor(run.reportCode)}</TableCell>
                        <TableCell className="tabular-nums">{run.periodKey}</TableCell>
                        <TableCell>{run.status ?? "-"}</TableCell>
                        <TableCell className="text-right tabular-nums">{run.recipientCount ?? "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{run.errorMessage ?? ""}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
