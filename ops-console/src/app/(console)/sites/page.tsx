import Link from "next/link";

import { DashboardErrorState, EmptyState } from "@/components/dashboard-state";
import { List, ListRow } from "@/components/ui/list";
import { apiFetch, loadOrError } from "@/lib/api";
import { loadOrgLabelMap } from "@/lib/orgs";

interface SiteRow {
  id: string;
  organisationId: string;
  name: string;
  siteCode: string | null;
  physicalAddress: string | null;
  timezone: string;
  statusCode: string | null;
}

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{ organisationId?: string }>;
}) {
  const params = await searchParams;
  const organisationId = params.organisationId?.trim() || undefined;
  const qs = organisationId ? `?organisationId=${organisationId}` : "";

  const result = await loadOrError(async () => {
    const [sites, orgLabel] = await Promise.all([
      apiFetch<SiteRow[]>(`/platform/dashboard/sites${qs}`),
      loadOrgLabelMap(),
    ]);
    return { sites, orgLabel };
  });

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">Sites</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { sites, orgLabel } = result.data;
  const orgOptions = Object.entries(orgLabel).sort((a, b) => a[1].localeCompare(b[1]));

  return (
    <div>
      <h1 className="font-heading font-light text-2xl text-foreground">Sites</h1>
      <p className="mt-1 text-muted-foreground text-sm">Cross-organisation site register and operational status.</p>

      <form className="mt-4 flex flex-wrap gap-3" method="get">
        <select
          name="organisationId"
          defaultValue={organisationId ?? ""}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        >
          <option value="">All organisations</option>
          {orgOptions.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
          Filter
        </button>
      </form>

      <div className="mt-6">
        {sites.length === 0 ? (
          <EmptyState
            title="No sites yet"
            description="Sites appear here after a customer configures locations under their organisation."
            actionHref="/organisations"
            actionLabel="Organisations"
          />
        ) : (
          <List>
            {sites.map((s) => (
              <ListRow key={s.id}>
                <Link
                  href={`/sites/${s.id}?organisationId=${s.organisationId}`}
                  className="min-w-0 hover:underline"
                >
                  <p className="text-foreground text-sm">{s.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {orgLabel[s.organisationId] ?? s.organisationId}
                    {s.siteCode ? ` · ${s.siteCode}` : ""}
                  </p>
                </Link>
                <span className="text-muted-foreground text-xs">{s.statusCode ?? "unset"}</span>
              </ListRow>
            ))}
          </List>
        )}
      </div>
    </div>
  );
}
