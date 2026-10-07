"use client";

import { useEffect, useState } from "react";

import QRCode from "qrcode";

import { Button } from "@/components/ui/button";
import { deviceSupportCopy as copy } from "@/lib/copy/site-notices";

export function DeviceSupportQr({ url, caption }: { url: string; caption: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void QRCode.toDataURL(url, { margin: 1, width: 320 })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [url]);

  return (
    <div className="space-y-3">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt={`Support QR code for ${caption}`} className="size-48 rounded-md border bg-white p-2" />
      ) : (
        <p className="text-muted-foreground text-xs">Generating QR...</p>
      )}
      <p className="text-sm">{caption}</p>
      <p className="break-all font-mono text-muted-foreground text-xs">{url}</p>
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button type="button" size="sm" onClick={() => window.print()}>
          {copy.print}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            void navigator.clipboard.writeText(url).then(() => setCopied(true));
          }}
        >
          {copied ? copy.copied : copy.copy}
        </Button>
      </div>
    </div>
  );
}
