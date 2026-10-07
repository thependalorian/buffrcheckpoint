import Link from "next/link";

import { DashboardErrorState, EmptyState } from "@/components/dashboard-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { List, ListRow } from "@/components/ui/list";
import { apiFetch, loadOrError } from "@/lib/api";

import { RequestGrantForm } from "./_components/request-grant-form";

interface SectorOption {
  code: string;
  label: string;
}

interface OrgRow {
  id: string;
  legalName: string;
  tradingName: string | null;
  sectorCode: string | null;
  sectorLabel: string | null;
  lifecycleStage: string | null;
  healthScore: number | null;
  churnRiskBand: string | null;
  mrr: number;
}

function churnRiskBadgeVariant(band: string): "destructive" | "outline" | "secondary" {
  if (band === "high") return "destructive";
  if (band === "medium") return "outline";
  return "secondary";
}

export default async function OrganisationsPage({ searchParams }: { searchParams: Promise<{ sector?: string }> }) {
  const sector = (await searchParams).sector?.trim() || undefined;
  const result = await loadOrError(async () => {
    const [orgs, sectors] = await Promise.all([
      apiFetch<OrgRow[]>("/platform/dashboard/organisations"),
      // The filter list is the configured sector list; if it cannot load the page still works without the filter.
      apiFetch<SectorOption[]>("/public/organisation-sectors").catch(() => [] as SectorOption[]),
    ]);
    return { orgs, sectors };
  });

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">Organisations</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { orgs: allOrgs, sectors } = result.data;
  // Exact sector code only: sectors are never merged or grouped, so this matches what analytics count.
  const orgs = sector ? allOrgs.filter((org) => org.sectorCode === sector) : allOrgs;
  const countBySector = new Map<string, number>();
  for (const org of allOrgs)
    if (org.sectorCode) countBySector.set(org.sectorCode, (countBySector.get(org.sectorCode) ?? 0) + 1);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading font-light text-2xl text-foreground">Organisations</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Aggregate rollup only — visitor PII requires a customer-approved support grant.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/support-access">Support access</Link>
        </Button>
      </div>

      {sectors.length > 0 ? (
        <form className="mt-4 flex flex-wrap gap-3" method="get">
          <select
            name="sector"
            defaultValue={sector ?? ""}
            aria-label="Sector"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="">All sectors ({allOrgs.length})</option>
            {sectors.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label} ({countBySector.get(option.code) ?? 0})
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
            Filter
          </button>
        </form>
      ) : null}

      <div className="mt-6">
        {orgs.length === 0 && sector ? (
          <EmptyState
            title="No organisations in this sector"
            description="Choose another sector, or show all sectors."
            actionHref="/organisations"
            actionLabel="Show all sectors"
          />
        ) : orgs.length === 0 ? (
          <EmptyState
            title="No organisations on the platform yet"
            description="Customer orgs appear here after onboarding. Until then CRM prospects and capability status still work."
            actionHref="/crm"
            actionLabel="Open CRM"
          />
        ) : (
          <List>
            {orgs.map((org) => (
              <ListRow key={org.id}>
                <div className="min-w-0">
                  <Link href={`/organisations/${org.id}`} className="font-medium text-foreground hover:underline">
                    {org.tradingName ?? org.legalName}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {org.sectorLabel ?? "no sector"} · {org.lifecycleStage ?? "no lifecycle stage"} · MRR NAD{" "}
                    {org.mrr.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {org.churnRiskBand ? (
                    <Badge variant={churnRiskBadgeVariant(org.churnRiskBand)}>{org.churnRiskBand} risk</Badge>
                  ) : null}
                  <span className="text-foreground text-sm tabular-nums">
                    {org.healthScore !== null ? `${org.healthScore.toFixed(0)}/100` : "no score yet"}
                  </span>
                  <RequestGrantForm organisationId={org.id} />
                </div>
              </ListRow>
            ))}
          </List>
        )}
      </div>
    </div>
  );
}
