import { BrandingSetupSheet } from "../_components/branding-actions";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState, TableEmptyRow } from "@/components/dashboard-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { getSessionGate } from "@/lib/auth/me";
import { brandingCopy } from "@/lib/copy/branding";
import { listSiteOptions } from "@/lib/sites/site-options";

interface BrandingProfileRow {
  id: string;
  profileName: string | null;
  siteId: string | null;
  regionId: string | null;
}

function scopeLabel(profile: BrandingProfileRow): string {
  const scope = brandingCopy.page.scope;
  if (profile.siteId) return scope.site;
  return profile.regionId ? scope.region : scope.organisation;
}

export default async function BrandingPage() {
  const copy = brandingCopy.page;
  const [sites, gate] = await Promise.all([listSiteOptions(), getSessionGate()]);
  const siteName = (id: string | null) => (id ? (sites.find((site) => site.id === id)?.name ?? "") : copy.allSites);
  let profiles: BrandingProfileRow[] = [];
  let error: string | null = null;
  try {
    profiles = await api.get<BrandingProfileRow[]>("/site-branding");
  } catch (err) {
    error = err instanceof Error ? err.message : copy.loadFailed;
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={copy.title}
        description={copy.description}
        action={<BrandingSetupSheet sites={sites} showReturnToReadiness={gate ? !gate.onboardingComplete : false} />}
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="h-11 p-3 font-medium">{copy.columns.profile}</TableHead>
                <TableHead className="h-11 p-3 font-medium">{copy.columns.scope}</TableHead>
                <TableHead className="h-11 p-3 font-medium">{copy.columns.site}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.length === 0 ? (
                <TableEmptyRow colSpan={3} title={copy.emptyTitle} description={copy.emptyDescription} />
              ) : (
                profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="p-3 font-medium">{profile.profileName ?? copy.unnamed}</TableCell>
                    <TableCell className="p-3">{scopeLabel(profile)}</TableCell>
                    <TableCell className="p-3">{siteName(profile.siteId)}</TableCell>
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
