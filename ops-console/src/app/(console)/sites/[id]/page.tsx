import Link from "next/link";

import { DashboardErrorState } from "@/components/dashboard-state";
import { List, ListRow } from "@/components/ui/list";
import { apiFetch, loadOrError } from "@/lib/api";

import { RequestGrantForm } from "../../organisations/_components/request-grant-form";
import { SiteStatusControls } from "../_components/site-status-controls";

interface Site {
  id: string;
  organisationId: string;
  name: string;
  siteCode: string | null;
  physicalAddress: string | null;
  timezone: string;
}

interface Device {
  id: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
}

// Reached from the organisation detail Sites tab
// (organisations/[id]/page.tsx's SitesTab) — the drill-down into one site
// (its own devices) the flat tab list didn't have.
export default async function SiteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ organisationId?: string }>;
}) {
  const { id } = await params;
  const { organisationId } = await searchParams;

  if (!organisationId) {
    return <DashboardErrorState message="Missing organisationId — open this site from an organisation's Sites tab." />;
  }

  const result = await loadOrError(async () => {
    const [site, devices] = await Promise.all([
      apiFetch<Site>(`/platform/dashboard/sites/${id}?organisationId=${organisationId}`),
      apiFetch<Device[]>(`/platform/dashboard/sites/${id}/devices?organisationId=${organisationId}`),
    ]);
    return { site, devices };
  });

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">Site</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { site, devices } = result.data;

  return (
    <div>
      <Link
        href={`/organisations/${site.organisationId}?tab=sites`}
        className="text-slate text-xs hover:text-foreground"
      >
        ← Back to organisation
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading font-light text-2xl text-foreground">{site.name}</h1>
          <p className="mt-1 text-slate text-sm">
            {site.siteCode ? `${site.siteCode} · ` : ""}
            {site.physicalAddress ?? "no address on file"} · {site.timezone}
          </p>
        </div>
        <SiteStatusControls siteId={site.id} organisationId={site.organisationId} />
      </div>

      <div className="mt-4">
        <RequestGrantForm organisationId={site.organisationId} />
      </div>

      <div className="mt-6">
        <h2 className="font-medium text-foreground text-sm">Devices at this site</h2>
        {devices.length === 0 ? (
          <p className="mt-2 text-slate text-sm">No devices registered at this site.</p>
        ) : (
          <List className="mt-2">
            {devices.map((d) => (
              <ListRow key={d.id}>
                <Link
                  href={`/devices/${d.id}?organisationId=${site.organisationId}`}
                  className="text-foreground text-sm hover:underline"
                >
                  {d.manufacturer} {d.model}
                </Link>
                <span className="text-slate text-xs">Serial {d.serialNumber}</span>
              </ListRow>
            ))}
          </List>
        )}
      </div>
    </div>
  );
}
