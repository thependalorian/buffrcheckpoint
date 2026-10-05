"use client";

import type { SiteOption } from "@/components/features/sites/site-select";
import { unwrap } from "@/lib/actions/result";

import { setupKioskExperienceAndPublish } from "./actions";
import { SiteExperienceFormSheet } from "./site-experience-form-sheet";

interface KioskSetupSheetProps {
  defaultSiteId?: string;
  sites: readonly SiteOption[];
}

export function KioskSetupSheet({ defaultSiteId, sites }: KioskSetupSheetProps) {
  return (
    <SiteExperienceFormSheet
      title="Kiosk experience"
      description="Idle timeout, maintenance mode, and channel enablement for a site."
      triggerLabel="Add kiosk config"
      fields={[
        { name: "siteId", label: "Site", type: "site", sites, defaultValue: defaultSiteId },
        { name: "configName", label: "Configuration name", type: "text", defaultValue: "Site default" },
        { name: "idleTimeoutSeconds", label: "Idle timeout (seconds)", type: "number", defaultValue: "120" },
        { name: "idleWarningSeconds", label: "Idle warning (seconds)", type: "number", defaultValue: "30" },
        { name: "maintenanceMessage", label: "Maintenance message (optional)", type: "textarea" },
      ]}
      onSubmit={async (values) =>
        unwrap(
          await setupKioskExperienceAndPublish({
            siteId: values.siteId,
            configName: values.configName,
            idleTimeoutSeconds: Number(values.idleTimeoutSeconds || 120),
            idleWarningSeconds: Number(values.idleWarningSeconds || 30),
            maintenanceMessage: values.maintenanceMessage || undefined,
          }),
        )
      }
    />
  );
}
