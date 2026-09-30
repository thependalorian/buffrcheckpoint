"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  attachOrganisationAddonAction,
  createOrganisationSubscriptionAction,
  detachOrganisationAddonAction,
  setSubscriptionSiteQuantityAction,
} from "./subscription-actions";

export type CatalogItem = {
  code: string;
  label: string;
  tagline: string;
  monthlyAmount: string;
  currencyCode: string;
  kind: "plan" | "addon";
  includedSites: number;
  extraSiteMonthlyAmount: string | null;
};

/** Plan line for a site count; mirrors planMonthlyForSites in backend billing.service.ts. */
function planMonthlyForSites(plan: CatalogItem | undefined, siteQuantity: number): number {
  if (!plan) return 0;
  const extraSites = Math.max(0, siteQuantity - plan.includedSites);
  const extraPrice = plan.extraSiteMonthlyAmount === null ? 0 : Number(plan.extraSiteMonthlyAmount);
  return Number(plan.monthlyAmount) + extraSites * extraPrice;
}

function siteAllowanceLabel(plan: CatalogItem | undefined): string {
  if (!plan) return "";
  const sites = `${plan.includedSites} site${plan.includedSites === 1 ? "" : "s"} included`;
  return plan.extraSiteMonthlyAmount === null
    ? `${sites}, no extra sites`
    : `${sites}, N$ ${Number(plan.extraSiteMonthlyAmount).toLocaleString("en-NA")}/mo per extra site`;
}

export type SubscriptionAddon = {
  code: string;
  label: string;
  monthlyAmount: string;
  currencyCode: string;
};

export type SubscriptionDetail = {
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
  addons: SubscriptionAddon[];
};

export function CreateSubscriptionForm({
  organisationId,
  plans,
  addons,
  activeSiteCount,
}: {
  organisationId: string;
  plans: CatalogItem[];
  addons: CatalogItem[];
  activeSiteCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [planCode, setPlanCode] = useState(plans[0]?.code ?? "site");
  const [siteQuantity, setSiteQuantity] = useState(Math.max(1, activeSiteCount));
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const estimate = useMemo(() => {
    const plan = plans.find((p) => p.code === planCode);
    const base = planMonthlyForSites(plan, siteQuantity);
    const addonSum = addons
      .filter((a) => selectedAddons.includes(a.code))
      .reduce((sum, a) => sum + Number(a.monthlyAmount), 0);
    const list = base + addonSum;
    if (billingPeriod === "annual") {
      return Math.round((list * 10) / 12 * 100) / 100;
    }
    return list;
  }, [planCode, billingPeriod, selectedAddons, plans, addons, siteQuantity]);
  const selectedPlan = plans.find((p) => p.code === planCode);

  function toggleAddon(code: string) {
    setSelectedAddons((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  return (
    <form
      className="mt-3 space-y-4 rounded-lg border border-border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createOrganisationSubscriptionAction({
            organisationId,
            planCode,
            billingPeriod,
            addonCodes: selectedAddons,
            siteQuantity,
          });
          if ("error" in result) {
            setError(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      <p className="font-medium text-foreground text-sm">Create subscription</p>

      <label className="block text-sm">
        <span className="text-muted-foreground">Plan</span>
        <select
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
          value={planCode}
          onChange={(e) => setPlanCode(e.target.value)}
        >
          {plans.map((p) => (
            <option key={p.code} value={p.code}>
              {p.label}: N$ {Number(p.monthlyAmount).toLocaleString("en-NA")}/mo
            </option>
          ))}
        </select>
        <span className="mt-1 block text-muted-foreground text-xs">{siteAllowanceLabel(selectedPlan)}</span>
      </label>

      <label className="block text-sm">
        <span className="text-muted-foreground">Licensed sites</span>
        <input
          type="number"
          min={Math.max(1, activeSiteCount)}
          step={1}
          className="mt-1 w-32 rounded-md border border-border bg-background px-3 py-2"
          value={siteQuantity}
          onChange={(e) => setSiteQuantity(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
        />
        <span className="mt-1 block text-muted-foreground text-xs">
          {activeSiteCount} active site{activeSiteCount === 1 ? "" : "s"} today
        </span>
      </label>

      <fieldset>
        <legend className="text-muted-foreground text-sm">Billing period</legend>
        <div className="mt-2 flex gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="billingPeriod"
              checked={billingPeriod === "monthly"}
              onChange={() => setBillingPeriod("monthly")}
            />
            Monthly
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="billingPeriod"
              checked={billingPeriod === "annual"}
              onChange={() => setBillingPeriod("annual")}
            />
            Annual (10× monthly)
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-muted-foreground text-sm">Add-ons (one list, each with its own cost)</legend>
        <ul className="mt-2 space-y-2">
          {addons.map((a) => (
            <li key={a.code}>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedAddons.includes(a.code)}
                  onChange={() => toggleAddon(a.code)}
                />
                <span>
                  <span className="font-medium text-foreground">{a.label}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · N$ {Number(a.monthlyAmount).toLocaleString("en-NA")}/mo
                  </span>
                  {a.tagline ? <span className="mt-0.5 block text-muted-foreground text-xs">{a.tagline}</span> : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <p className="text-foreground text-sm">
        Estimated MRR: <span className="font-medium">N$ {estimate.toLocaleString("en-NA")}</span>
      </p>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <button
        type="submit"
        disabled={pending || plans.length === 0}
        className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create subscription"}
      </button>
    </form>
  );
}

export function SubscriptionAddonsPanel({
  organisationId,
  subscription,
  catalogAddons,
}: {
  organisationId: string;
  subscription: SubscriptionDetail;
  catalogAddons: CatalogItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const attached = new Set(subscription.addons.map((a) => a.code));
  const available = catalogAddons.filter((a) => !attached.has(a.code));

  return (
    <div className="mt-4 space-y-3">
      <p className="font-medium text-foreground text-sm">Add-ons</p>
      {subscription.addons.length === 0 ? (
        <p className="text-muted-foreground text-sm">No add-ons attached.</p>
      ) : (
        <ul className="space-y-2">
          {subscription.addons.map((a) => (
            <li
              key={a.code}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium text-foreground">{a.label}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {a.currencyCode} {a.monthlyAmount}/mo
                </span>
              </span>
              <button
                type="button"
                disabled={pending}
                className="text-destructive text-xs hover:underline disabled:opacity-50"
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    const result = await detachOrganisationAddonAction({
                      organisationId,
                      subscriptionId: subscription.id,
                      addonCode: a.code,
                    });
                    if ("error" in result) setError(result.error);
                    else router.refresh();
                  });
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {available.map((a) => (
            <button
              key={a.code}
              type="button"
              disabled={pending}
              className="inline-flex min-h-9 items-center rounded-md border border-border px-3 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await attachOrganisationAddonAction({
                    organisationId,
                    subscriptionId: subscription.id,
                    addonCode: a.code,
                  });
                  if ("error" in result) setError(result.error);
                  else router.refresh();
                });
              }}
            >
              Add {a.label} (+N$ {Number(a.monthlyAmount).toLocaleString("en-NA")}/mo)
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}

export function SubscriptionSitesPanel({
  organisationId,
  subscription,
}: {
  organisationId: string;
  subscription: SubscriptionDetail;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(subscription.siteQuantity);
  const [error, setError] = useState<string | null>(null);
  const canAddSites = subscription.extraSiteMonthlyAmount !== null;

  return (
    <div className="mt-4 space-y-2">
      <p className="font-medium text-foreground text-sm">Sites</p>
      <p className="text-muted-foreground text-sm">
        {subscription.activeSiteCount} of {subscription.siteQuantity} licensed sites in use ·{" "}
        {subscription.includedSites} included
        {canAddSites
          ? `, N$ ${Number(subscription.extraSiteMonthlyAmount).toLocaleString("en-NA")}/mo per extra site`
          : ", no extra sites on this plan"}
      </p>
      {canAddSites ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              const result = await setSubscriptionSiteQuantityAction({
                organisationId,
                subscriptionId: subscription.id,
                siteQuantity: quantity,
              });
              if ("error" in result) setError(result.error);
              else router.refresh();
            });
          }}
        >
          <input
            type="number"
            min={Math.max(1, subscription.activeSiteCount)}
            step={1}
            aria-label="Licensed sites"
            className="w-24 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
          />
          <button
            type="submit"
            disabled={pending || quantity === subscription.siteQuantity}
            className="inline-flex min-h-9 items-center rounded-md border border-border px-3 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {pending ? "Saving…" : "Update licensed sites"}
          </button>
        </form>
      ) : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
