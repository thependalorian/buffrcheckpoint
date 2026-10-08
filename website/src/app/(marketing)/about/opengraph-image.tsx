import { ogContentType, ogSize, renderOgImage } from "@/lib/og-image";

export const alt = "About | Checkpoint";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOgImage("About", "An independent visitor platform from Windhoek, Namibia.");
}
