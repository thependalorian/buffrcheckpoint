import Link from "next/link";

import { DashboardErrorState } from "@/components/dashboard-state";
import { List, ListRow } from "@/components/ui/list";
import { apiFetch, loadOrError } from "@/lib/api";
import { loadOrgLabelMap } from "@/lib/orgs";

interface Deal {
  id: string;
  organisationId: string | null;
  prospectName: string | null;
  stageCode: string;
  expectedMrr: string | null;
  currencyCode: string;
  expectedCloseDate: string | null;
  ownerId: string | null;
}

interface StageEvent {
  id: string;
  fromStageCode: string | null;
  toStageCode: string;
  occurredAt: string;
  actorId: string | null;
  note: string | null;
}

interface TypeDefinitionRow {
  id: string;
  code: string;
  label: string;
}

interface ActivityTimeline {
  scope: "organisation" | "deal_has_no_organisation";
  organisationId: string | null;
  activity: {
    id: string;
    activityType: string | null;
    activityLabel: string | null;
    note: string | null;
    actorId: string | null;
    occurredAt: string;
  }[];
}

export default async function DealDetailPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;

  const result = await loadOrError(async () => {
    const [deal, history, stages, orgLabel, timeline] = await Promise.all([
      apiFetch<Deal>(`/platform/crm/deals/${dealId}`),
      apiFetch<StageEvent[]>(`/platform/crm/deals/${dealId}/stage-history`),
      apiFetch<TypeDefinitionRow[]>("/type-definitions?domain=crm_deal_stage"),
      loadOrgLabelMap(),
      apiFetch<ActivityTimeline>(`/platform/crm/deals/${dealId}/activity`),
    ]);
    return { deal, history, stages, orgLabel, timeline };
  });

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">Deal</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { deal, history, stages, orgLabel, timeline } = result.data;
  const stageLabel = new Map(stages.map((s) => [s.id, s.label]));

  return (
    <div>
      <Link href="/crm" className="text-slate text-xs hover:text-foreground">
        ← Pipeline
      </Link>

      <h1 className="mt-2 font-heading font-light text-2xl text-foreground">
        {deal.prospectName ?? (deal.organisationId ? orgLabel[deal.organisationId] : null) ?? "Untitled deal"}
      </h1>
      <p className="mt-1 text-slate text-sm">
        {stageLabel.get(deal.stageCode) ?? "unknown stage"}
        {deal.expectedMrr ? ` · Expected MRR ${deal.currencyCode} ${deal.expectedMrr}` : ""}
        {deal.expectedCloseDate ? ` · expected close ${new Date(deal.expectedCloseDate).toLocaleDateString()}` : ""}
      </p>
      {deal.organisationId ? (
        <Link
          href={`/organisations/${deal.organisationId}`}
          className="mt-1 inline-block text-foreground text-xs hover:underline"
        >
          {orgLabel[deal.organisationId] ?? deal.organisationId} →
        </Link>
      ) : null}

      <div className="mt-6">
        <h2 className="font-medium text-foreground text-sm">Stage history</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-slate text-sm">No stage changes recorded.</p>
        ) : (
          <List className="mt-2">
            {history.map((e) => (
              <ListRow key={e.id}>
                <p className="text-foreground text-sm">
                  {e.fromStageCode ? `${stageLabel.get(e.fromStageCode) ?? e.fromStageCode} → ` : "created at "}
                  {stageLabel.get(e.toStageCode) ?? e.toStageCode}
                </p>
                <span className="text-slate text-xs">
                  {new Date(e.occurredAt).toLocaleString()}
                  {e.note ? ` · ${e.note}` : ""}
                </span>
              </ListRow>
            ))}
          </List>
        )}
      </div>

      <div className="mt-8">
        <h2 className="font-medium text-foreground text-sm">Activity</h2>
        {timeline.scope === "deal_has_no_organisation" ? (
          <p className="mt-2 text-slate text-sm">
            This deal is a prospect with no linked organisation, so it has no logged activity yet. Stage history above is
            its full record.
          </p>
        ) : (
          <>
            <p className="mt-1 text-slate text-xs">
              Activity is logged against the organisation, not the individual deal (crm_activity_log has no deal
              reference), so this is every call, email, and meeting with{" "}
              {timeline.organisationId ? (orgLabel[timeline.organisationId] ?? "this customer") : "this customer"} — not
              only the entries about this deal.
            </p>
            {timeline.activity.length === 0 ? (
              <p className="mt-2 text-slate text-sm">No activity logged for this organisation.</p>
            ) : (
              <List className="mt-2">
                {timeline.activity.map((entry) => (
                  <ListRow key={entry.id}>
                    <div className="min-w-0">
                      <p className="text-foreground text-sm">{entry.activityLabel ?? entry.activityType ?? "Activity"}</p>
                      {entry.note ? <p className="text-slate text-xs">{entry.note}</p> : null}
                    </div>
                    <span className="text-slate text-xs">{new Date(entry.occurredAt).toLocaleString()}</span>
                  </ListRow>
                ))}
              </List>
            )}
          </>
        )}
      </div>
    </div>
  );
}
