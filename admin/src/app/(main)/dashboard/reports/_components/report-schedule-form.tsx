"use client";

import { useState, useTransition } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { reportsCopy } from "@/lib/copy/reports";

import { saveReportScheduleAction } from "../actions";

export interface ReportSchedule {
  reportCode: string;
  label: string;
  cadenceLabel: string;
  formatLabel: string;
  enabled: boolean;
  recipientRoles: string[];
}

export function ReportScheduleForm({
  report,
  roleOptions,
}: {
  report: ReportSchedule;
  roleOptions: { code: string; label: string }[];
}) {
  const [enabled, setEnabled] = useState(report.enabled);
  const [roles, setRoles] = useState<string[]>(report.recipientRoles);
  const [pending, startTransition] = useTransition();

  function toggleRole(code: string, checked: boolean) {
    setRoles((current) => (checked ? [...new Set([...current, code])] : current.filter((r) => r !== code)));
  }

  function save() {
    startTransition(async () => {
      const result = await saveReportScheduleAction(report.reportCode, { enabled, recipientRoles: roles });
      if (result.error) toast.error(result.error);
      else toast.success(reportsCopy.saved);
    });
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{report.label}</p>
          <p className="text-muted-foreground text-sm">
            {report.cadenceLabel} · {report.formatLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch id={`${report.reportCode}-on`} checked={enabled} onCheckedChange={setEnabled} />
          <Label htmlFor={`${report.reportCode}-on`}>{reportsCopy.enabled}</Label>
        </div>
      </div>
      <fieldset className="space-y-2">
        <legend className="font-medium text-sm">{reportsCopy.recipients}</legend>
        <div className="flex flex-wrap gap-4">
          {roleOptions.map((role) => {
            const id = `${report.reportCode}-${role.code}`;
            return (
              <div key={role.code} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={roles.includes(role.code)}
                  onCheckedChange={(checked) => toggleRole(role.code, checked === true)}
                />
                <Label htmlFor={id}>{role.label}</Label>
              </div>
            );
          })}
        </div>
      </fieldset>
      <Button size="sm" onClick={save} disabled={pending}>
        {reportsCopy.save}
      </Button>
    </div>
  );
}
