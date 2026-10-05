import sharp from "sharp";

export const MAX_LOGO_BYTES = 400_000;
export const LOGO_FILE_NAME = "logo.webp";
const LOGO_MAX_EDGE = 512;

export type LogoImageType = "png" | "jpeg" | "webp";

/** Identifies the image by its leading bytes; the client-declared MIME type is not trusted. */
export function detectLogoType(buffer: Buffer): LogoImageType | null {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

/** Re-encodes to WebP within 512x512, dropping metadata (EXIF, embedded profiles). */
export async function normaliseLogo(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer, { limitInputPixels: 4096 * 4096 })
    .rotate()
    .resize({ width: LOGO_MAX_EDGE, height: LOGO_MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
}

/** `asset:site-branding/<organisationId>/<packageId>/logo.webp` */
export function logoAssetReference(fileReference: string): string {
  return `asset:${fileReference}/${LOGO_FILE_NAME}`;
}

/** True when a logo reference may be saved for this organisation (no inline data URLs, no other tenant's asset). */
export function isAllowedLogoReference(reference: string, organisationId: string): boolean {
  if (reference.startsWith("asset:")) {
    return reference.startsWith(`asset:site-branding/${organisationId}/`);
  }
  return reference.startsWith("https://") || reference.startsWith("/org-assets/") || reference === "/logo.png";
}
