import { CreateUnitSheet, DirectoryToolbar, UnitTree } from "./_components/directory-controls";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";

type DirectoryResponse = {
  mode: string;
  modeLabel: string;
  units: Array<{
    id: string;
    parentId: string | null;
    unitKindCode: string;
    unitKindLabel: string;
    bianAreaCode: string | null;
    bianAreaLabel: string | null;
    code: string;
    name: string;
    description: string | null;
    sortOrder: number;
    children: DirectoryResponse["units"];
  }>;
  flat: Array<{ id: string; name: string; code: string }>;
  availableKinds: Array<{ code: string; label: string }>;
  availableBianAreas: Array<{ code: string; label: string }>;
  availableModes: Array<{ code: string; label: string }>;
};

export default async function OrganisationDirectoryPage() {
  let directory: DirectoryResponse | null = null;
  let error: string | null = null;

  try {
    directory = await api.get<DirectoryResponse>("/organisation-directory");
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load organisation directory.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Organisation Directory"
        description="Populate your organisation structure. Use a custom tree, an optional BIAN Service Landscape template, or both."
        action={
          directory ? (
            <CreateUnitSheet
              flatUnits={directory.flat}
              availableKinds={directory.availableKinds}
              availableBianAreas={directory.availableBianAreas}
            />
          ) : null
        }
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : directory ? (
        <>
          <DirectoryToolbar mode={directory.mode} availableModes={directory.availableModes} />
          <div className="rounded-lg border bg-card p-4">
            <p className="mb-3 text-sm font-medium">Current mode: {directory.modeLabel}</p>
            <UnitTree units={directory.units} />
          </div>
        </>
      ) : null}
    </div>
  );
}
