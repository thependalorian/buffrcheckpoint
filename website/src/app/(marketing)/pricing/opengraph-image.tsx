import { ogContentType, ogSize, renderOgImage } from "@/lib/og-image";

export const alt = "Pricing | Checkpoint";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOgImage("Pricing", "Plans in NAD, priced per site.");
}
