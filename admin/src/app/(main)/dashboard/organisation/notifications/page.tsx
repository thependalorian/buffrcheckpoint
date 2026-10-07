import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";
import { notificationPrefsCopy as copy } from "@/lib/copy/notifications";

import { PreferencesForm } from "./_components/preferences-form";
import type { EmailPreference } from "./actions";

export default async function NotificationPreferencesPage() {
  let rows: EmailPreference[] = [];
  let error: string | null = null;
  try {
    rows = await api.get<EmailPreference[]>("/notifications/preferences");
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load email settings.";
  }
  return (
    <div className="space-y-6">
      <DashboardPageHeader title={copy.title} description={copy.description} />
      {error ? <DashboardErrorState message={error} /> : <PreferencesForm initial={rows} />}
    </div>
  );
}
