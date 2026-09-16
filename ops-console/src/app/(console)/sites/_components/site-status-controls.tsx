"use client";

import { StatusSelect } from "@/components/ui/status-select";

import { updateSiteStatusAction } from "../actions";

// site_status codes, seeded by migration 0029.
const SITE_STATUSES = ["active", "inactive", "maintenance", "closed"];

export function SiteStatusControls({ siteId, organisationId }: { siteId: string; organisationId: string }) {
  return (
    <StatusSelect
      options={SITE_STATUSES.map((s) => ({ value: s, label: s }))}
      placeholder="Change site status…"
      onChange={(next) => updateSiteStatusAction(siteId, organisationId, next)}
    />
  );
}
