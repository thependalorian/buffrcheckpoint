import { PayloadTooLargeException, UnsupportedMediaTypeException } from "@nestjs/common";
import sharp from "sharp";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { SiteBrandingService } from "./site-branding.service";

const user = { userId: "u1", organisationId: "b51f0704-12a7-45d4-8b0d-3642785b6e77" } as AuthenticatedUser;

function build() {
  const writePackage = jest.fn(async (namespace: string) => ({
    packageId: "p1",
    files: [],
    manifestPath: `${namespace}/p1/manifest.json`,
    fileReference: `${namespace}/7b0c7c9e-5d7c-4f7e-9d3c-1d2e3f4a5b6c`,
  }));
  const batch = jest.fn(async () => []);
  const insert = jest.fn(() => ({ values: jest.fn(() => ({ kind: "insert" })) }));
  const update = jest.fn(() => ({ set: jest.fn(() => ({ where: jest.fn(() => ({ kind: "update" })) })) }));
  const db = {
    batch,
    insert,
    update,
    query: {
      siteBrandingProfiles: { findFirst: jest.fn(async () => undefined) },
      siteBrandingProfileVersions: {
        findFirst: jest.fn(async () => ({ id: "v1", logoArtifactId: null })),
        findMany: jest.fn(async () => []),
      },
      sites: { findFirst: jest.fn(async () => ({ id: "s1" })) },
    },
  };
  const typeDefs = { id: jest.fn(async (_domain: string, code: string) => `status-${code}`) };
  const service = new SiteBrandingService(db as never, typeDefs as never);
  (service as unknown as { artifacts: { writePackage: typeof writePackage } }).artifacts = { writePackage } as never;
  return { service, writePackage, batch, insert };
}

describe("SiteBrandingService", () => {
  it("rejects a logo over 400 KB with LOGO_TOO_LARGE", async () => {
    const { service } = build();
    const error = await service.uploadLogo({ buffer: Buffer.alloc(600_000, 1), size: 600_000 }, user).catch((e) => e);
    expect(error).toBeInstanceOf(PayloadTooLargeException);
    expect(error.getResponse()).toMatchObject({ code: "LOGO_TOO_LARGE" });
  });

  it("rejects a non-image by content, not by declared type", async () => {
    const { service } = build();
    const svg = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>");
    await expect(service.uploadLogo({ buffer: svg, size: svg.length }, user)).rejects.toBeInstanceOf(
      UnsupportedMediaTypeException,
    );
  });

  it("stores a re-encoded WebP under the organisation and returns an asset reference", async () => {
    const { service, writePackage } = build();
    const source = await sharp({ create: { width: 900, height: 300, channels: 3, background: "#e2a603" } })
      .png()
      .toBuffer();
    const result = await service.uploadLogo({ buffer: source, size: source.length }, user);
    expect(writePackage).toHaveBeenCalledWith(
      `site-branding/${user.organisationId}`,
      [expect.objectContaining({ name: "logo.webp", contentType: "image/webp" })],
      expect.any(Object),
    );
    expect(result.logoArtifactId).toBe(
      `asset:site-branding/${user.organisationId}/7b0c7c9e-5d7c-4f7e-9d3c-1d2e3f4a5b6c/logo.webp`,
    );
  });

  it("writes profile, retirement and published version in a single transaction", async () => {
    const { service, batch, insert } = build();
    await service.setupAndPublish({ brandColourToken: "#e2a603" }, user);
    expect(batch).toHaveBeenCalledTimes(1);
    const statements = (batch.mock.calls[0] as unknown[][])[0];
    expect(statements).toHaveLength(3);
    expect(insert).toHaveBeenCalledTimes(2);
  });

  it("leaves the previous published version serving when the publish fails", async () => {
    const { service, batch } = build();
    batch.mockRejectedValueOnce(new Error("connection reset"));
    await expect(service.setupAndPublish({ brandColourToken: "#e2a603" }, user)).rejects.toThrow("connection reset");
    // Retirement of the old version only exists inside the failed batch, so nothing was applied.
    expect(batch).toHaveBeenCalledTimes(1);
    const statements = (batch.mock.calls[0] as unknown[][])[0] as Array<{ kind: string }>;
    expect(statements.map((statement) => statement.kind)).toEqual(["insert", "update", "insert"]);
  });

  it("refuses inline data URLs as logo references", async () => {
    const { service, batch } = build();
    await expect(service.setupAndPublish({ logoArtifactId: "data:image/png;base64,AAAA" }, user)).rejects.toMatchObject(
      {
        response: { code: "LOGO_REFERENCE_INVALID" },
      },
    );
    expect(batch).not.toHaveBeenCalled();
  });
});
