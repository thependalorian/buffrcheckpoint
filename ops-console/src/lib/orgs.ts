import { apiFetch } from "@/lib/api";

import type { OrgOption } from "@/components/org-select";

interface OrgRow {
  id: string;
  legalName: string;
  tradingName: string | null;
}

export async function loadOrgOptions(): Promise<OrgOption[]> {
  const orgs = await apiFetch<OrgRow[]>("/platform/dashboard/organisations");
  return orgs.map((o) => ({
    id: o.id,
    label: o.tradingName?.trim() || o.legalName,
  }));
}

export async function loadOrgLabelMap(): Promise<Record<string, string>> {
  const orgs = await loadOrgOptions();
  return Object.fromEntries(orgs.map((o) => [o.id, o.label]));
}
