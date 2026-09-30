import Link from "next/link";

import { TrendChart } from "@/components/charts/TrendChart";
import { Card, StatCard } from "@/components/ui/card";
import { List, ListRow } from "@/components/ui/list";
import { apiFetch } from "@/lib/api";

import { RequestGrantForm } from "../_components/request-grant-form";
import {
  CreateSubscriptionForm,
  SubscriptionAddonsPanel,
  SubscriptionSitesPanel,
  type CatalogItem,
  type SubscriptionDetail,
} from "./_components/subscription-panel";
import { OrgDetailTabs } from "./_components/tabs";

interface OrgRow {
  id: string;
  legalName: string;
  tradingName: string | null;
  lifecycleStage: string | null;
  healthScore: number | null;
  churnRiskBand: string | null;
  mrr: number;
}

interface CrmContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  roleTitle: string | null;
  isPrimary: boolean;
}

interface CrmDeal {
  id: string;
  stageCode: string;
  expectedMrr: string | null;
}

interface CrmActivity {
  id: string;
  activityTypeCode: string;
  occurredAt: string;
  note: string | null;
}

interface Subscription {
  id: string;
  planCode: string;
  planLabel: string;
  siteQuantity: number;
  activeSiteCount: number;
  includedSites: number;
  extraSiteMonthlyAmount: string | null;
  billingPeriod: string;
  mrrAmount: string;
  currencyCode: string;
  statusCode: string;
  kybGatePassed: boolean;
  currentPeriodEnd: string | null;
  addons: Array<{
    code: string;
    label: string;
    monthlyAmount: string;
    currencyCode: string;
  }>;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: string;
  currencyCode: string;
  statusCode: string;
  issuedAt: string;
}

interface KybVerification {
  id: string;
  businessRegistrationNumber: string;
  registeredBusinessName: string;
  registrationDocumentReference: string | null;
  statusCode: string;
  submittedAt: string;
  verifiedAt: string | null;
}

interface KybStatusEvent {
  id: string;
  fromStatusCode: string | null;
  toStatusCode: string;
  occurredAt: string;
  actorId: string | null;
  note: string | null;
}

export default async function OrganisationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "rollup" } = await searchParams;

  const orgs = await apiFetch<OrgRow[]>("/platform/dashboard/organisations");
  const org = orgs.find((o) => o.id === id);
  if (!org) {
    return <p className="text-destructive text-sm">Organisation not found.</p>;
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading font-light text-2xl text-foreground">{org.tradingName ?? org.legalName}</h1>
          <p className="mt-1 text-slate text-sm">
            {org.lifecycleStage ?? "no lifecycle stage"} · health{" "}
            {org.healthScore !== null ? `${org.healthScore.toFixed(0)}/100` : "n/a"} · MRR NAD {org.mrr.toFixed(2)}
          </p>
        </div>
        <Link href="/organisations" className="text-slate text-xs hover:text-foreground">
          ← All organisations
        </Link>
      </div>

      <div className="mt-4">
        <RequestGrantForm organisationId={org.id} />
      </div>

      <div className="mt-6">
        <OrgDetailTabs id={id} active={tab} />
      </div>

      <div className="mt-4">
        {tab === "rollup" ? <RollupTab org={org} /> : null}
        {tab === "devices" ? <DevicesTab organisationId={id} /> : null}
        {tab === "sites" ? <SitesTab organisationId={id} /> : null}
        {tab === "integrations" ? <IntegrationsTab organisationId={id} /> : null}
        {tab === "crm" ? <CrmTab organisationId={id} /> : null}
        {tab === "billing" ? <BillingTab organisationId={id} /> : null}
        {tab === "kyb" ? <KybTab organisationId={id} /> : null}
      </div>
    </div>
  );
}

interface HealthSnapshotRow {
  computedAt: string;
  healthScore: string;
}

async function RollupTab({ org }: { org: OrgRow }) {
  const history = await apiFetch<HealthSnapshotRow[]>(`/platform/dashboard/organisations/${org.id}/health-history`);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Health score" value={org.healthScore !== null ? `${org.healthScore.toFixed(0)}/100` : "n/a"} />
        <StatCard label="Churn risk" value={org.churnRiskBand ?? "n/a"} />
        <StatCard label="MRR" value={`NAD ${org.mrr.toFixed(2)}`} />
        <StatCard label="Lifecycle stage" value={org.lifecycleStage ?? "n/a"} />
      </div>
      {history.length > 1 ? (
        <TrendChart
          title="Health score over time"
          finding="Whether this account's engagement signal is improving or declining."
          data={history.map((h) => ({
            period: new Date(h.computedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
            value: Number(h.healthScore),
          }))}
        />
      ) : null}
    </div>
  );
}

interface DeviceRow {
  id: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  cranComplianceStatusCode: string | null;
}

interface TypeDefinitionRow {
  id: string;
  code: string;
  label: string;
}

async function DevicesTab({ organisationId }: { organisationId: string }) {
  const [devices, statuses] = await Promise.all([
    apiFetch<DeviceRow[]>(`/platform/dashboard/organisations/${organisationId}/devices`),
    apiFetch<TypeDefinitionRow[]>("/type-definitions?domain=cran_compliance_status"),
  ]);
  const statusLabel = new Map(statuses.map((s) => [s.id, s.label]));

  return (
    <div>
      {devices.length === 0 ? (
        <p className="text-slate text-sm">No devices registered for this organisation.</p>
      ) : (
        <List>
          {devices.map((d) => (
            <ListRow key={d.id}>
              <Link
                href={`/devices/${d.id}?organisationId=${organisationId}`}
                className="text-foreground text-sm hover:underline"
              >
                {d.manufacturer} {d.model} · {d.serialNumber}
              </Link>
              <span className="text-slate text-xs">
                {d.cranComplianceStatusCode ? (statusLabel.get(d.cranComplianceStatusCode) ?? "unknown") : "n/a"}
              </span>
            </ListRow>
          ))}
        </List>
      )}
    </div>
  );
}

interface SiteRow {
  id: string;
  name: string;
  siteCode: string | null;
  physicalAddress: string | null;
}

async function SitesTab({ organisationId }: { organisationId: string }) {
  const orgSites = await apiFetch<SiteRow[]>(`/platform/dashboard/organisations/${organisationId}/sites`);
  return (
    <div>
      {orgSites.length === 0 ? (
        <p className="text-slate text-sm">No sites registered for this organisation.</p>
      ) : (
        <List>
          {orgSites.map((s) => (
            <ListRow key={s.id}>
              <Link
                href={`/sites/${s.id}?organisationId=${organisationId}`}
                className="text-foreground text-sm hover:underline"
              >
                {s.name} {s.siteCode ? <span className="text-slate text-xs">({s.siteCode})</span> : null}
              </Link>
              {s.physicalAddress ? <span className="text-slate text-xs">{s.physicalAddress}</span> : null}
            </ListRow>
          ))}
        </List>
      )}
    </div>
  );
}

interface PmsConnectionRow {
  id: string;
  siteId: string;
  siteName: string | null;
  statusCode: string;
  siteExternalId: string | null;
  enabledInterfaceTypes: number[];
  tcpHost: string | null;
  tcpPort: number | null;
  tlsEnabled: boolean;
  clientLoginId: string | null;
  credentialsSecretRef: string | null;
  defaultHostId: string | null;
  lastSyncAt: string | null;
  lastErrorCode: string | null;
  credentialsConfigured?: boolean;
}

async function IntegrationsTab({ organisationId }: { organisationId: string }) {
  const connections = await apiFetch<PmsConnectionRow[]>(
    `/platform/dashboard/organisations/${organisationId}/pms-integrations`,
  ).catch(() => [] as PmsConnectionRow[]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-medium text-foreground text-sm">CiMSO INNterchange</h2>
        <p className="mt-1 text-slate text-xs">
          Non-secret TCP settings and sync posture. Passwords live in env vars named by{" "}
          <code className="text-xs">credentials_secret_ref</code>. Org must enable{" "}
          <code className="text-xs">cimso_innterchange</code> under admin Capabilities, then connect
          sites.
        </p>
      </div>
      {connections.length === 0 ? (
        <p className="text-slate text-sm">
          No PMS connections. Organisation must enable CiMSO under Capability enablement, then connect
          sites in admin Site Experience.
        </p>
      ) : (
        <List>
          {connections.map((c) => (
            <ListRow key={c.id}>
              <div className="flex flex-col gap-0.5">
                <span className="text-foreground text-sm">
                  {c.siteName ?? c.siteId} · {c.statusCode.replaceAll("_", " ")}
                </span>
                <span className="text-slate text-xs">
                  {c.tcpHost ? `${c.tcpHost}:${c.tcpPort ?? "—"}` : "no tcp"}
                  {c.tlsEnabled ? " tls" : ""} · login {c.clientLoginId ?? "—"} · secretRef{" "}
                  {c.credentialsSecretRef ?? "—"} · host {c.defaultHostId ?? "—"} · external{" "}
                  {c.siteExternalId ?? "—"} · last sync{" "}
                  {c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleString() : "never"}
                  {c.lastErrorCode ? ` · error ${c.lastErrorCode}` : ""}
                </span>
              </div>
            </ListRow>
          ))}
        </List>
      )}
    </div>
  );
}

async function CrmTab({ organisationId }: { organisationId: string }) {
  const [contacts, deals, activity, stages] = await Promise.all([
    apiFetch<CrmContact[]>(`/platform/crm/contacts?organisationId=${organisationId}`),
    apiFetch<CrmDeal[]>(`/platform/crm/deals?organisationId=${organisationId}`),
    apiFetch<CrmActivity[]>(`/platform/crm/activity?organisationId=${organisationId}`),
    apiFetch<TypeDefinitionRow[]>("/type-definitions?domain=crm_deal_stage"),
  ]);
  const stageLabel = new Map(stages.map((s) => [s.id, s.label]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-medium text-foreground text-sm">Contacts</h2>
        {contacts.length === 0 ? (
          <p className="mt-2 text-slate text-sm">No contacts recorded.</p>
        ) : (
          <List className="mt-2">
            {contacts.map((c) => (
              <ListRow key={c.id}>
                <Link href={`/crm/contacts/${c.id}`} className="min-w-0 hover:underline">
                  <p className="font-medium text-foreground text-sm">
                    {c.name} {c.isPrimary ? <span className="text-sodium-yellow-ink text-xs">primary</span> : null}
                  </p>
                  <p className="text-slate text-xs">
                    {c.roleTitle ?? ""} {c.email ? `· ${c.email}` : ""} {c.phone ? `· ${c.phone}` : ""}
                  </p>
                </Link>
              </ListRow>
            ))}
          </List>
        )}
      </div>

      <div>
        <h2 className="font-medium text-foreground text-sm">Deals</h2>
        {deals.length === 0 ? (
          <p className="mt-2 text-slate text-sm">No deals for this organisation.</p>
        ) : (
          <List className="mt-2">
            {deals.map((d) => (
              <ListRow key={d.id}>
                <Link href={`/crm/${d.id}`} className="text-foreground text-sm hover:underline">
                  {stageLabel.get(d.stageCode) ?? d.stageCode}
                </Link>
                {d.expectedMrr ? <span className="text-slate text-xs">Expected MRR NAD {d.expectedMrr}</span> : null}
              </ListRow>
            ))}
          </List>
        )}
      </div>

      <div>
        <h2 className="font-medium text-foreground text-sm">Activity log</h2>
        {activity.length === 0 ? (
          <p className="mt-2 text-slate text-sm">No activity recorded.</p>
        ) : (
          <List className="mt-2">
            {activity.map((a) => (
              <ListRow key={a.id}>
                <p className="text-foreground text-sm">{a.note ?? a.activityTypeCode}</p>
                <span className="text-slate text-xs">{new Date(a.occurredAt).toLocaleString()}</span>
              </ListRow>
            ))}
          </List>
        )}
      </div>
    </div>
  );
}

async function BillingTab({ organisationId }: { organisationId: string }) {
  const [subscription, invoices, catalog, orgSites] = await Promise.all([
    apiFetch<Subscription | null>(`/platform/billing/subscriptions/organisation?organisationId=${organisationId}`),
    apiFetch<Invoice[]>(`/platform/billing/invoices/organisation?organisationId=${organisationId}`),
    apiFetch<CatalogItem[]>("/platform/billing/catalog"),
    apiFetch<SiteRow[]>(`/platform/dashboard/organisations/${organisationId}/sites`),
  ]);

  const plans = catalog.filter((c) => c.kind === "plan");
  const addons = catalog.filter((c) => c.kind === "addon");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-medium text-foreground text-sm">Subscription</h2>
        {subscription ? (
          <Card className="mt-2 p-3 text-sm">
            <p className="text-foreground">
              {subscription.planLabel} · {subscription.billingPeriod} · {subscription.currencyCode}{" "}
              {subscription.mrrAmount}/mo MRR
            </p>
            <p className="text-slate text-xs">
              Status: {subscription.statusCode} · KYB gate {subscription.kybGatePassed ? "passed" : "not passed"}
            </p>
            <SubscriptionSitesPanel organisationId={organisationId} subscription={subscription as SubscriptionDetail} />
            <SubscriptionAddonsPanel
              organisationId={organisationId}
              subscription={subscription as SubscriptionDetail}
              catalogAddons={addons}
            />
          </Card>
        ) : (
          <>
            <p className="mt-2 text-slate text-sm">No subscription yet.</p>
            <CreateSubscriptionForm
              organisationId={organisationId}
              plans={plans}
              addons={addons}
              activeSiteCount={orgSites.length}
            />
          </>
        )}
      </div>

      <div>
        <h2 className="font-medium text-foreground text-sm">Invoices</h2>
        {invoices.length === 0 ? (
          <p className="mt-2 text-slate text-sm">No invoices.</p>
        ) : (
          <List className="mt-2">
            {invoices.map((inv) => (
              <ListRow key={inv.id}>
                <Link href={`/billing/${inv.id}`} className="text-foreground text-sm hover:underline">
                  {inv.invoiceNumber}
                </Link>
                <span className="text-slate text-sm">
                  {inv.currencyCode} {inv.amount} · {inv.statusCode}
                </span>
              </ListRow>
            ))}
          </List>
        )}
      </div>
      <Link href="/billing" className="text-sodium-yellow-ink text-xs hover:underline">
        Go to POP review queue →
      </Link>
    </div>
  );
}

async function KybTab({ organisationId }: { organisationId: string }) {
  const [kyb, history, statuses] = await Promise.all([
    apiFetch<KybVerification | null>(`/platform/kyb/organisation?organisationId=${organisationId}`),
    apiFetch<KybStatusEvent[]>(`/platform/kyb/organisation/history?organisationId=${organisationId}`),
    apiFetch<TypeDefinitionRow[]>("/type-definitions?domain=kyb_status"),
  ]);
  const statusLabel = new Map(statuses.map((s) => [s.id, s.label]));

  return (
    <div className="space-y-6">
      {kyb ? (
        <Card className="p-4 text-sm">
          <p className="font-medium text-foreground">{kyb.registeredBusinessName}</p>
          <p className="text-slate text-xs">
            Reg #{kyb.businessRegistrationNumber} · status {statusLabel.get(kyb.statusCode) ?? kyb.statusCode} ·
            submitted {new Date(kyb.submittedAt).toLocaleDateString()}
            {kyb.verifiedAt ? ` · verified ${new Date(kyb.verifiedAt).toLocaleDateString()}` : ""}
          </p>
          {kyb.registrationDocumentReference ? (
            <a
              href={`/api/kyb-documents/${kyb.id}`}
              className="mt-2 inline-block text-sodium-yellow-ink text-xs hover:underline"
            >
              Download registration document →
            </a>
          ) : null}
        </Card>
      ) : (
        <p className="text-slate text-sm">No KYB submission yet.</p>
      )}

      {history.length > 0 ? (
        <div>
          <h2 className="font-medium text-foreground text-sm">Verification history</h2>
          <List className="mt-2">
            {history.map((e) => (
              <ListRow key={e.id}>
                <p className="text-foreground text-sm">
                  {e.fromStatusCode ? `${statusLabel.get(e.fromStatusCode) ?? e.fromStatusCode} → ` : ""}
                  {statusLabel.get(e.toStatusCode) ?? e.toStatusCode}
                </p>
                <span className="text-slate text-xs">
                  {new Date(e.occurredAt).toLocaleString()}
                  {e.note ? ` · ${e.note}` : ""}
                </span>
              </ListRow>
            ))}
          </List>
        </div>
      ) : null}

      <Link href="/kyb" className="inline-block text-sodium-yellow-ink text-xs hover:underline">
        Go to KYB review queue →
      </Link>
    </div>
  );
}
