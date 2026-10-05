"use client";

import { useEffect, useState } from "react";

import QRCode from "qrcode";

import { Button } from "@/components/ui/button";

export function PrintableQrPanel({
  siteId,
  referenceId,
  label,
}: {
  siteId: string;
  referenceId: string;
  label: string;
}) {
  const base = process.env.NEXT_PUBLIC_VISITOR_CHECKIN_BASE_URL ?? "https://buffrcheckpoint.com";
  const url = `${base.replace(/\/$/, "")}/check-in?site=${siteId}&ref=${referenceId}`;
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    void QRCode.toDataURL(url, { margin: 1, width: 280 })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [url]);

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3 print:border-0">
      <p className="font-medium text-sm">{label}</p>
      <p className="break-all font-mono text-xs text-muted-foreground">{url}</p>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt={`QR for ${label}`} className="size-40" />
      ) : (
        <p className="text-muted-foreground text-xs">Generating QR…</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(url);
          }}
        >
          Copy URL
        </Button>
        {dataUrl ? (
          <Button size="sm" variant="secondary" type="button" asChild>
            <a href={dataUrl} download={`buffr-qr-${referenceId}.png`}>
              Download PNG
            </a>
          </Button>
        ) : null}
        <Button size="sm" type="button" onClick={() => window.print()}>
          Print
        </Button>
      </div>
    </div>
  );
}
