import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";
import { siteNoticesAdminCopy as copy } from "@/lib/copy/site-notices";
import { listSiteOptions } from "@/lib/sites/site-options";

import { NoticeEditor } from "./_components/notice-editor";
import type { PublishedNotice } from "./actions";

interface NoticeResponse {
  published: PublishedNotice | null;
}

export default async function SiteNoticesPage() {
  let emergency: PublishedNotice | null = null;
  let induction: PublishedNotice | null = null;
  let error: string | null = null;
  const sites = await listSiteOptions();
  try {
    [emergency, induction] = await Promise.all([
      api.get<NoticeResponse>("/site-notices/emergency").then((r) => r.published),
      api.get<NoticeResponse>("/site-notices/induction").then((r) => r.published),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : copy.loadFailed;
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader title={copy.title} description={copy.description} />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <>
          <NoticeEditor kind="emergency" sites={sites} initial={emergency} />
          <NoticeEditor kind="induction" sites={sites} initial={induction} />
          <p className="text-muted-foreground text-sm">{copy.qrHint}</p>
        </>
      )}
    </div>
  );
}
