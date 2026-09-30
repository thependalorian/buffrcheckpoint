import Link from "next/link";

import { ShareBars } from "@/components/charts/ShareBars";
import { DashboardErrorState, EmptyState } from "@/components/dashboard-state";
import { apiFetch, loadOrError } from "@/lib/api";
import { loadOrgLabelMap, loadOrgOptions } from "@/lib/orgs";

import { CreateDealForm, DealStageControls } from "./_components/deal-controls";

interface Deal {
  id: string;
  organisationId: string | null;
  prospectName: string | null;
  stageCode: string;
  expectedMrr: string | null;
}

interface StageRow {
  id: string;
  code: string;
  label: string;
}

interface PipelineValueRow {
  stageId: string;
  stageCode: string;
  stageLabel: string;
  dealCount: number;
  expectedMrr: number;
  currencyCode: string;
}

export default async function CrmPage() {
  const result = await loadOrError(async () => {
    const [deals, orgs, orgLabel, stages, pipelineValue] = await Promise.all([
      apiFetch<Deal[]>("/platform/crm/deals"),
      loadOrgOptions(),
      loadOrgLabelMap(),
      apiFetch<StageRow[]>("/type-definitions?domain=crm_deal_stage"),
      apiFetch<PipelineValueRow[]>("/platform/crm/pipeline-value"),
    ]);
    return { deals, orgs, orgLabel, stages, pipelineValue };
  });

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">CRM</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { deals, orgs, orgLabel, stages, pipelineValue } = result.data;
  const dealsByStage = new Map<string, Deal[]>();
  for (const stage of stages) dealsByStage.set(stage.id, []);
  for (const deal of deals) dealsByStage.get(deal.stageCode)?.push(deal);

  // Summed in SQL by CrmService.pipelineValueByStage() rather than reduced over
  // the deal list here — the same total stays correct once this list is paged.
  const pipelineBars = pipelineValue
    .filter((row) => row.expectedMrr > 0)
    .map((row) => ({ label: row.stageLabel, value: row.expectedMrr }));
  const totalPipeline = pipelineValue.reduce((sum, row) => sum + row.expectedMrr, 0);

  return (
    <div>
      <h1 className="font-heading font-light text-2xl text-foreground">CRM</h1>
      <p className="mt-1 text-muted-foreground text-sm">Deal pipeline across organisations and prospects.</p>

      <div className="mt-6">
        <h2 className="mb-2 font-medium text-sm">New deal</h2>
        <CreateDealForm orgs={orgs} />
      </div>

      {pipelineBars.length > 0 ? (
        <div className="mt-8">
          <ShareBars
            title="Pipeline value by stage"
            finding={`NAD ${totalPipeline.toFixed(0)} of expected MRR in the funnel — this is where it is sitting.`}
            data={pipelineBars}
            valuePrefix="NAD "
          />
        </div>
      ) : null}

      <div className="mt-8">
        <h2 className="mb-2 font-medium text-sm">Pipeline</h2>
        {deals.length === 0 ? (
          <EmptyState
            title="No deals in the pipeline"
            description="Add a prospect or link an existing organisation above. Won deals feed Expected-Value ranking on Analytics."
          />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {stages.map((stage) => (
              <div key={stage.id} className="bc-surface w-72 shrink-0 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-medium text-foreground text-sm">{stage.label}</h3>
                  <span className="text-muted-foreground text-xs">{(dealsByStage.get(stage.id) ?? []).length}</span>
                </div>
                <div className="space-y-2">
                  {(dealsByStage.get(stage.id) ?? []).map((deal) => (
                    <div key={deal.id} className="bc-surface-inset space-y-2 p-3">
                      <Link href={`/crm/${deal.id}`} className="font-medium text-foreground text-sm hover:underline">
                        {deal.prospectName ??
                          (deal.organisationId ? orgLabel[deal.organisationId] : null) ??
                          "Untitled deal"}
                      </Link>
                      {deal.expectedMrr ? (
                        <p className="text-muted-foreground text-xs">Expected MRR NAD {deal.expectedMrr}</p>
                      ) : null}
                      <DealStageControls dealId={deal.id} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
