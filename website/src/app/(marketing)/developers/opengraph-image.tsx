import { ogContentType, ogSize, renderOgImage } from "@/lib/og-image";

export const alt = "Developers | Checkpoint";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOgImage("Developers", "API, authentication and integration boundaries.");
}
