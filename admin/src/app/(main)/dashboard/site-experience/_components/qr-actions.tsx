"use client";

import { useTransition } from "react";

import { useRouter } from "next/navigation";

import type { SiteOption } from "@/components/features/sites/site-select";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/actions/result";
import { ISSUABLE_QR_TYPES } from "@/lib/copy/site-notices";

import { createQrReferenceAndRotate, rotateQrReference } from "./actions";
import { SiteExperienceFormSheet } from "./site-experience-form-sheet";

interface QrSetupSheetProps {
  defaultSiteId?: string;
  sites: readonly SiteOption[];
}

export function QrSetupSheet({ defaultSiteId, sites }: QrSetupSheetProps) {
  return (
    <SiteExperienceFormSheet
      title="Site QR reference"
      description="Creates a QR code for a site and issues its first token. Check-in is for visitors, emergency information opens to anyone, and the contractor induction is read and confirmed by contractors. Publish the notice text under Site Notices."
      triggerLabel="Add QR reference"
      fields={[
        { name: "siteId", label: "Site", type: "site", sites, defaultValue: defaultSiteId },
        {
          name: "qrTypeCode",
          label: "QR type",
          type: "select",
          defaultValue: "public_site_checkin",
          options: ISSUABLE_QR_TYPES.map((t) => ({ value: t.value, label: t.label })),
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
