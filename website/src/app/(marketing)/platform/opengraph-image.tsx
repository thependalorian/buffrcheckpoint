import { ogContentType, ogSize, renderOgImage } from "@/lib/og-image";

export const alt = "Platform | Checkpoint";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOgImage("Platform", "Six check-in channels, one encrypted visitor record.");
}
