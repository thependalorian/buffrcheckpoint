"use client";

import { createQrReferenceAndRotate, rotateQrReference } from "./actions";
import { SiteExperienceFormSheet } from "./site-experience-form-sheet";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface QrSetupSheetProps {
  defaultSiteId?: string;
}

/** Only types with a live kiosk/website journey. Keep in sync with backend allowlist. */
const ISSUABLE_SITE_QR_TYPES = [
  {
    value: "public_site_checkin",
    label: "Public site check-in (phone QR)",
  },
] as const;

export function QrSetupSheet({ defaultSiteId }: QrSetupSheetProps) {
  return (
    <SiteExperienceFormSheet
      title="Site QR reference"
      description="Creates a public check-in QR and issues the first rotation token. Other QR types stay hidden until their journeys ship."
      triggerLabel="Add QR reference"
      fields={[
        { name: "siteId", label: "Site ID", type: "text", defaultValue: defaultSiteId ?? "" },
        {
          name: "qrTypeCode",
          label: "QR type",
          type: "select",
          defaultValue: "public_site_checkin",
          options: ISSUABLE_SITE_QR_TYPES.map((t) => ({ value: t.value, label: t.label })),
        },
        { name: "label", label: "Label", type: "text", defaultValue: "Main entrance check-in" },
      ]}
      onSubmit={(values) =>
        createQrReferenceAndRotate({
          siteId: values.siteId,
          qrTypeCode: values.qrTypeCode || "public_site_checkin",
          label: values.label,
        })
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
          await rotateQrReference(referenceId);
          router.refresh();
        })
      }
    >
      {isPending ? "Rotating…" : "Rotate token"}
    </Button>
  );
}
