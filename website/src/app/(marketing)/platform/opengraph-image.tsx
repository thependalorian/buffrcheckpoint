import { ogContentType, ogSize, renderOgImage } from "@/lib/og-image";

export const alt = "Platform | Checkpoint";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOgImage("Platform", "Every way in, one encrypted visitor record.");
}
