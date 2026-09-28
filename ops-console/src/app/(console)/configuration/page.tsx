import { DashboardErrorState, EmptyState } from "@/components/dashboard-state";
import { List, ListRow } from "@/components/ui/list";
import { apiFetch, loadOrError } from "@/lib/api";

import { HealthWeightsForm, TemplateForm, type WeightsPayload } from "./_components/configuration-forms";
import { groupTemplates, type TemplateRow } from "./_components/template-groups";

interface ChangeLogRow {
  id: string;
  occurredAt: string;
  actorId: string | null;
  note: string | null;
  beforeValue: unknown;
  afterValue: unknown;
}

// Platform-wide settings: the copy customers receive, and the weights behind
// the churn score. Both were string/number literals in service files before
// migration 0029; both now write an append-only before/after log entry on
// every change, which is why this screen shows that log next to the forms.
export default async function ConfigurationPage() {
  const result = await loadOrError(async () => {
    const [templates, weights, changes] = await Promise.all([
      apiFetch<TemplateRow[]>("/platform/configuration/notification-templates"),
      apiFetch<WeightsPayload>("/platform/configuration/health-score-weights"),
      apiFetch<ChangeLogRow[]>("/platform/configuration/changes"),
    ]);
    return { templates, weights, changes };
  });

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">Configuration</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { templates, weights, changes } = result.data;

  return (
    <div>
      <h1 className="font-heading font-light text-2xl text-foreground">Configuration</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        Platform-wide notification copy and churn-score weights. Every change is recorded with its before and after
        value.
      </p>

      <section className="mt-8">
        <h2 className="font-medium text-sm">Notification templates</h2>
        <p className="mt-1 text-muted-foreground text-xs">
          {"{{token}}"} placeholders are substituted at send time. An unknown token is left visible rather than sent
          blank, so a typo shows up in a test email instead of in a customer&apos;s inbox.
        </p>
        {templates.length === 0 ? (
          <EmptyState
            title="No templates seeded"
            description="Migration 0038 seeds the branded template catalog. Until it runs, send paths use their built-in fallback copy."
          />
        ) : (
          <div className="mt-3 space-y-8">
            {groupTemplates(templates).map((group) => (
              <div key={group.category}>
                <h3 className="mb-3 font-medium text-foreground text-xs uppercase tracking-wide">
                  {group.category}
                </h3>
                <div className="space-y-4">
                  {group.items.map((template) => (
                    <TemplateForm key={template.id} template={template} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-medium text-sm">Churn-score weights</h2>
        <p className="mt-1 text-muted-foreground text-xs">
          Consumed by the nightly organisation-health run. Edits apply at the next run, not retroactively to existing
          snapshots.
          {weights.seeded ? "" : " Not yet seeded — the values shown are the code defaults."}
          {weights.updatedAt ? ` Last changed ${new Date(weights.updatedAt).toLocaleString()}.` : ""}
        </p>
        <div className="mt-3">
          <HealthWeightsForm payload={weights} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-medium text-sm">Weight change log</h2>
        {changes.length === 0 ? (
          <p className="mt-2 text-muted-foreground text-sm">No weight changes recorded yet.</p>
        ) : (
          <List className="mt-3">
            {changes.map((change) => (
              <ListRow key={change.id}>
                <div className="min-w-0">
                  <p className="text-foreground text-sm">{change.note ?? "No note given"}</p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(change.occurredAt).toLocaleString()}
                    {change.actorId ? ` · ${change.actorId.slice(0, 8)}` : ""}
                  </p>
                </div>
              </ListRow>
            ))}
          </List>
        )}
      </section>
    </div>
  );
}
