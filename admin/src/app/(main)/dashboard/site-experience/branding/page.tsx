import { BrandingSetupSheet } from "../_components/branding-actions";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState, TableEmptyRow } from "@/components/dashboard-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";

interface BrandingProfileRow {
  id: string;
  profileName: string | null;
  siteId: string | null;
  regionId: string | null;
}

export default async function BrandingPage() {
  let profiles: BrandingProfileRow[] = [];
  let error: string | null = null;
  try {
    profiles = await api.get<BrandingProfileRow[]>("/site-branding");
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load branding profiles.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Organisation Branding"
        description="Version-controlled logos, welcome messages, languages, and channel visibility per site."
        action={<BrandingSetupSheet />}
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="h-11 p-3 font-medium">Profile</TableHead>
                <TableHead className="h-11 p-3 font-medium">Scope</TableHead>
                <TableHead className="h-11 p-3 font-medium">Site ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.length === 0 ? (
                <TableEmptyRow
                  colSpan={3}
                  title="No branding profiles yet"
                  description="Create an organisation default or site override profile, then publish a version for kiosks to sync."
                />
              ) : (
                profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="p-3 font-medium">{profile.profileName ?? "Unnamed profile"}</TableCell>
                    <TableCell className="p-3">
                      {profile.siteId ? "Site override" : profile.regionId ? "Region default" : "Organisation default"}
                    </TableCell>
                    <TableCell className="p-3 font-mono text-xs">{profile.siteId ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
