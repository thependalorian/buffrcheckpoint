"use client";

import { useTransition } from "react";

import { useRouter } from "next/navigation";

import type { SiteOption } from "@/components/features/sites/site-select";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/actions/result";

import { createQrReferenceAndRotate, rotateQrReference } from "./actions";
import { SiteExperienceFormSheet } from "./site-experience-form-sheet";

interface QrSetupSheetProps {
  defaultSiteId?: string;
  sites: readonly SiteOption[];
}

/** Only types with a live kiosk/website journey. Keep in sync with backend allowlist. */
const ISSUABLE_SITE_QR_TYPES = [
  {
    value: "public_site_checkin",
    label: "Public site check-in (phone QR)",
  },
] as const;

export function QrSetupSheet({ defaultSiteId, sites }: QrSetupSheetProps) {
  return (
    <SiteExperienceFormSheet
      title="Site QR reference"
      description="Creates a public check-in QR and issues the first rotation token. Other QR types stay hidden until their journeys ship."
      triggerLabel="Add QR reference"
      fields={[
        { name: "siteId", label: "Site", type: "site", sites, defaultValue: defaultSiteId },
        {
          name: "qrTypeCode",
          label: "QR type",
          type: "select",
          defaultValue: "public_site_checkin",
          options: ISSUABLE_SITE_QR_TYPES.map((t) => ({ value: t.value, label: t.label })),
        },
        { name: "label", label: "Label", type: "text", defaultValue: "Main entrance check-in" },
      ]}
      onSubmit={async (values) =>
        unwrap(
          await createQrReferenceAndRotate({
            siteId: values.siteId,
            qrTypeCode: values.qrTypeCode || "public_site_checkin",
            label: values.label,
          }),
        )
      }
    />
  );
}

export function QrRotateButton({ referenceId }: { referenceId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          unwrap(await rotateQrReference(referenceId));
          router.refresh();
        })
      }
    >
      {isPending ? "Rotating…" : "Rotate token"}
    </Button>
  );
}
