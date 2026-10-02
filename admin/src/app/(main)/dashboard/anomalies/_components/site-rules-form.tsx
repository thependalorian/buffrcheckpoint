"use client";

import { useState, useTransition } from "react";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { anomaliesCopy } from "@/lib/copy/anomalies";

import { saveAnomalyRuleAction } from "../actions";

export interface AnomalyRule {
  ruleCode: string;
  label: string;
  enabled: boolean;
  thresholdInt: number;
  windowMinutes: number | null;
  windowStartLocal: string | null;
  windowEndLocal: string | null;
  isDefault: boolean;
}

function RuleRow({ siteId, rule }: { siteId: string; rule: AnomalyRule }) {
  const [enabled, setEnabled] = useState(rule.enabled);
  const [threshold, setThreshold] = useState(String(rule.thresholdInt));
  const [windowMinutes, setWindowMinutes] = useState(String(rule.windowMinutes ?? 30));
  const [start, setStart] = useState(rule.windowStartLocal ?? "07:00");
  const [end, setEnd] = useState(rule.windowEndLocal ?? "18:00");
  const [pending, startTransition] = useTransition();
  const isRepeat = rule.ruleCode === "repeat_phone_window";

  function save() {
    startTransition(async () => {
      const result = await saveAnomalyRuleAction(siteId, rule.ruleCode, {
        enabled,
        thresholdInt: Number(threshold),
        ...(isRepeat ? { windowMinutes: Number(windowMinutes) } : { windowStartLocal: start, windowEndLocal: end }),
      });
      if (result.error) toast.error(result.error);
      else toast.success(anomaliesCopy.saved);
    });
  }

  const id = `${siteId}-${rule.ruleCode}`;
  return (
    <div className="flex flex-wrap items-end gap-4 border-border border-b py-3 last:border-0">
      <div className="min-w-56 flex-1">
        <p className="font-medium text-sm">{rule.label}</p>
        {rule.isDefault ? (
          <Badge variant="secondary" className="mt-1">
            {anomaliesCopy.defaultBadge}
          </Badge>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Switch id={`${id}-on`} checked={enabled} onCheckedChange={setEnabled} />
        <Label htmlFor={`${id}-on`}>{anomaliesCopy.enabled}</Label>
      </div>
      {isRepeat ? (
        <>
          <div className="space-y-1">
            <Label htmlFor={`${id}-n`}>{anomaliesCopy.threshold}</Label>
            <Input
              id={`${id}-n`}
              type="number"
              min={1}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-24"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-m`}>{anomaliesCopy.window}</Label>
            <Input
              id={`${id}-m`}
              type="number"
              min={5}
              max={1440}
              value={windowMinutes}
              onChange={(e) => setWindowMinutes(e.target.value)}
              className="w-28"
            />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-1">
            <Label htmlFor={`${id}-s`}>{anomaliesCopy.hoursFrom}</Label>
            <Input
              id={`${id}-s`}
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-32"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-e`}>{anomaliesCopy.hoursTo}</Label>
            <Input id={`${id}-e`} type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-32" />
          </div>
        </>
      )}
      <Button size="sm" onClick={save} disabled={pending}>
        {anomaliesCopy.save}
      </Button>
    </div>
  );
}

export function SiteRulesForm({ siteId, siteName, rules }: { siteId: string; siteName: string; rules: AnomalyRule[] }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="font-medium">{siteName}</p>
      {rules.map((rule) => (
        <RuleRow key={rule.ruleCode} siteId={siteId} rule={rule} />
      ))}
    </div>
  );
}
