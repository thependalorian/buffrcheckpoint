"use client";

import type { SiteOption } from "@/components/features/sites/site-select";
import { unwrap } from "@/lib/actions/result";

import { setupEscalationAndPublish } from "./actions";
import { SiteExperienceFormSheet } from "./site-experience-form-sheet";

interface EscalationSetupSheetProps {
  defaultSiteId?: string;
  sites: readonly SiteOption[];
}

export function EscalationSetupSheet({ defaultSiteId, sites }: EscalationSetupSheetProps) {
  return (
    <SiteExperienceFormSheet
      title="Host escalation policy"
      description="Wait time and action when a host does not respond to an arrival notification."
      triggerLabel="Add escalation policy"
      fields={[
        { name: "siteId", label: "Site", type: "site", sites, defaultValue: defaultSiteId, optional: true },
        { name: "policyName", label: "Policy name", type: "text", defaultValue: "Reception escalation" },
        { name: "waitSeconds", label: "Wait seconds", type: "number", defaultValue: "300" },
        {
          name: "escalationActionCode",
          label: "Action code",
          type: "text",
          defaultValue: "notify_reception",
          placeholder: "notify_reception | notify_site_manager | hold_entry",
        },
        { name: "alternateRecipientReference", label: "Alternate recipient email", type: "text" },
      ]}
      onSubmit={async (values) =>
        unwrap(
          await setupEscalationAndPublish({
            siteId: values.siteId || undefined,
            policyName: values.policyName,
            waitSeconds: Number(values.waitSeconds || 300),
            escalationActionCode: values.escalationActionCode,
            alternateRecipientReference: values.alternateRecipientReference || undefined,
          }),
        )
      }
    />
  );
}
