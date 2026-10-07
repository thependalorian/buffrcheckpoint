import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";
import { loadOrganisationSectors } from "@/lib/sectors";

import { OrganisationProfileForm } from "./_components/organisation-profile-form";

interface OrganisationRow {
  id: string;
  legalName: string;
  tradingName: string | null;
  defaultTimezone: string;
  sectorCode: string | null;
}

export default async function OrganisationPage() {
  const sectors = await loadOrganisationSectors();
  let organisation: OrganisationRow | null = null;
  let error: string | null = null;
  try {
    organisation = await api.get<OrganisationRow>("/organisations/me");
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load organisation.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Organisation profile"
        description="Legal name, trading name, timezone, and sector used across invoices and compliance surfaces."
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : organisation ? (
        <OrganisationProfileForm
          legalName={organisation.legalName}
          tradingName={organisation.tradingName ?? organisation.legalName}
          defaultTimezone={organisation.defaultTimezone}
          sectorCode={organisation.sectorCode}
          sectors={sectors}
        />
      ) : null}
    </div>
  );
}
