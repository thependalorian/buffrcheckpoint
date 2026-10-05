import Link from "next/link";

import { onboardingCopy } from "@/lib/copy/onboarding";

export interface SiteOption {
  id: string;
  name: string;
}

/**
 * Site picker for setup forms. Replaces raw Site ID text inputs; with no
 * sites it explains what to do instead of accepting an id that cannot exist.
 */
export function SiteSelect({
  id,
  name,
  sites,
  optional = false,
  defaultValue,
}: {
  id: string;
  name: string;
  sites: readonly SiteOption[];
  optional?: boolean;
  defaultValue?: string;
}) {
  const copy = onboardingCopy.sitePicker;
  if (sites.length === 0 && !optional) {
    return (
      <p className="text-muted-foreground text-sm">
        {copy.noSites}.{" "}
        <Link href="/dashboard/sites" prefetch={false} className="underline underline-offset-4">
          {copy.createSite}
        </Link>
      </p>
    );
  }
  return (
    <select
      id={id}
      name={name}
      required={!optional}
      defaultValue={defaultValue ?? initialSite(sites, optional)}
      className="flex h-9 min-h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {optional ? (
        <option value="">{copy.orgDefault}</option>
      ) : (
        <option value="" disabled>
          {copy.placeholder}
        </option>
      )}
      {sites.map((site) => (
        <option key={site.id} value={site.id}>
          {site.name}
        </option>
      ))}
    </select>
  );
}

/** A single site is preselected when a site is mandatory; otherwise the placeholder or org default shows. */
function initialSite(sites: readonly SiteOption[], optional: boolean): string {
  if (optional || sites.length !== 1) return "";
  return sites[0].id;
}
