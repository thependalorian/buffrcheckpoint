import {
  createArtifactStore,
  LocalFsArtifactStore,
  NeonS3ArtifactStore,
  VercelBlobArtifactStore,
} from "./artifact-store";

describe("createArtifactStore", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("uses local store in non-production when no durable backend is configured", () => {
    process.env.NODE_ENV = "development";
    delete process.env.ARTIFACT_STORE;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.NEON_STORAGE_ENDPOINT;
    delete process.env.NEON_STORAGE_BUCKET;
    delete process.env.NEON_STORAGE_ACCESS_KEY_ID;
    delete process.env.NEON_STORAGE_SECRET_ACCESS_KEY;
    expect(createArtifactStore()).toBeInstanceOf(LocalFsArtifactStore);
  });

  it("fails closed in production without durable credentials", () => {
    process.env.NODE_ENV = "production";
    delete process.env.ARTIFACT_STORE;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.NEON_STORAGE_ENDPOINT;
    delete process.env.NEON_STORAGE_BUCKET;
    delete process.env.NEON_STORAGE_ACCESS_KEY_ID;
    delete process.env.NEON_STORAGE_SECRET_ACCESS_KEY;
    expect(() => createArtifactStore()).toThrow(/No durable artifact store/);
  });

  it("selects NeonS3 when ARTIFACT_STORE=neon_s3 and env is complete", () => {
    process.env.ARTIFACT_STORE = "neon_s3";
    process.env.NEON_STORAGE_ENDPOINT = "https://storage.example.neon.tech";
    process.env.NEON_STORAGE_BUCKET = "buffr-checkpoint-artifacts";
    process.env.NEON_STORAGE_ACCESS_KEY_ID = "key";
    process.env.NEON_STORAGE_SECRET_ACCESS_KEY = "secret";
    expect(createArtifactStore()).toBeInstanceOf(NeonS3ArtifactStore);
  });

  it("selects Vercel Blob when ARTIFACT_STORE=vercel_blob", () => {
    process.env.ARTIFACT_STORE = "vercel_blob";
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_token";
    expect(createArtifactStore()).toBeInstanceOf(VercelBlobArtifactStore);
  });
});
