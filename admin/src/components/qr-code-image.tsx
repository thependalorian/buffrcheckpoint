"use client";

import { useEffect, useState } from "react";

import QRCode from "qrcode";

interface QrCodeImageProps {
  value: string;
  size?: number;
  alt?: string;
  className?: string;
}

/** Client-side QR renderer — never sends secrets to a third-party image host. */
export function QrCodeImage({ value, size = 192, alt = "QR code", className }: QrCodeImageProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setDataUrl(null);
    QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (failed) {
    return <p className="text-destructive text-sm">Could not render QR code. Use the secret below instead.</p>;
  }

  if (!dataUrl) {
    return <div className="size-48 animate-pulse rounded-md bg-muted" aria-hidden />;
  }

  return (
    <img
      src={dataUrl}
      alt={alt}
      width={size}
      height={size}
      className={className ?? "rounded-md border bg-white p-2"}
    />
  );
}
