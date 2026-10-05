import sharp from "sharp";

import { resolvePublicAssetUrl } from "../../common/assets/public-asset-url";
import { detectLogoType, isAllowedLogoReference, logoAssetReference, normaliseLogo } from "./branding-logo";

const ORG = "b51f0704-12a7-45d4-8b0d-3642785b6e77";

async function png(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 226, g: 166, b: 3 } } })
    .png()
    .toBuffer();
}

describe("branding logo", () => {
  it("identifies PNG, JPEG and WebP by magic bytes and rejects anything else", async () => {
    const source = await png(8, 8);
    expect(detectLogoType(source)).toBe("png");
    expect(detectLogoType(await sharp(source).jpeg().toBuffer())).toBe("jpeg");
    expect(detectLogoType(await sharp(source).webp().toBuffer())).toBe("webp");
    expect(detectLogoType(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
  });

  it("re-encodes to WebP no larger than 512 px on the long edge", async () => {
    const out = await normaliseLogo(await png(1200, 600));
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(256);
  });

  it("accepts only this organisation's uploaded assets and never data URLs", () => {
    const reference = logoAssetReference(`site-branding/${ORG}/7b0c7c9e-5d7c-4f7e-9d3c-1d2e3f4a5b6c`);
    expect(isAllowedLogoReference(reference, ORG)).toBe(true);
    expect(isAllowedLogoReference(reference, "00000000-0000-0000-0000-000000000000")).toBe(false);
    expect(isAllowedLogoReference("data:image/png;base64,AAAA", ORG)).toBe(false);
  });

  it("resolves an uploaded asset to the public API read route", () => {
    const reference = logoAssetReference(`site-branding/${ORG}/7b0c7c9e-5d7c-4f7e-9d3c-1d2e3f4a5b6c`);
    expect(resolvePublicAssetUrl(reference)).toBe(
      `https://api.buffrcheckpoint.com/site-branding/assets/${ORG}/7b0c7c9e-5d7c-4f7e-9d3c-1d2e3f4a5b6c/logo.webp`,
    );
  });
});
