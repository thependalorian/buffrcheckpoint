import Link from "next/link";

import { DashboardErrorState, EmptyState } from "@/components/dashboard-state";
import { List, ListRow } from "@/components/ui/list";
import { apiFetch, loadOrError } from "@/lib/api";

interface SearchHit {
  category: "organisation" | "ticket" | "incident" | "deal" | "device";
  id: string;
  title: string;
  subtitle: string | null;
  status: string | null;
  organisationId: string | null;
  href: string;
}

interface SearchResponse {
  term: string;
  hits: SearchHit[];
  skipped: string[];
}

const CATEGORY_LABELS: Record<SearchHit["category"], string> = {
  organisation: "Organisations",
  ticket: "Tickets",
  incident: "Incidents",
  deal: "Deals",
  device: "Devices",
};

const CATEGORY_ORDER: SearchHit["category"][] = ["organisation", "ticket", "incident", "deal", "device"];

// One box across the registers an operator actually jumps between. Deliberately
// a page, not a command palette: the result set is the answer often enough
// ("which orgs match this name") that it deserves a URL you can share.
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const term = q?.trim() ?? "";

  const result =
    term.length >= 2
      ? await loadOrError(() => apiFetch<SearchResponse>(`/platform/search?q=${encodeURIComponent(term)}`))
      : null;

  return (
    <div>
      <h1 className="font-heading font-light text-2xl text-foreground">Search</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        Organisations, tickets, incidents, deals, and devices. Only the registers your role can open are searched.
      </p>

      <form className="mt-6 flex flex-wrap gap-3" method="get">
        <input
          name="q"
          defaultValue={term}
          placeholder="Name, serial number, subject…"
          aria-label="Search term"
          className="min-w-64 flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        />
        <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
          Search
        </button>
      </form>

      {term.length > 0 && term.length < 2 ? (
        <p className="mt-6 text-muted-foreground text-sm">Enter at least two characters.</p>
      ) : null}

      {result?.error ? (
        <div className="mt-6">
          <DashboardErrorState message={result.error} />
        </div>
      ) : null}

      {result?.data ? (
        result.data.hits.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title={`Nothing matches "${result.data.term}"`}
              description="Search covers names, serial numbers, ticket subjects, and incident titles — not visitor records."
            />
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            {CATEGORY_ORDER.map((category) => {
              const hits = result.data.hits.filter((hit) => hit.category === category);
              if (hits.length === 0) return null;
              return (
                <section key={category}>
                  <h2 className="mb-2 font-medium text-sm">
                    {CATEGORY_LABELS[category]} ({hits.length})
                  </h2>
                  <List>
                    {hits.map((hit) => (
                      <ListRow key={`${hit.category}-${hit.id}`}>
                        <div className="min-w-0">
                          <Link href={hit.href} className="font-medium text-foreground text-sm hover:underline">
                            {hit.title}
                          </Link>
                          {hit.subtitle ? <p className="text-muted-foreground text-xs">{hit.subtitle}</p> : null}
                        </div>
                        {hit.status ? <span className="text-muted-foreground text-xs">{hit.status}</span> : null}
                      </ListRow>
                    ))}
                  </List>
                </section>
              );
            })}
          </div>
        )
      ) : null}
    </div>
  );
}
