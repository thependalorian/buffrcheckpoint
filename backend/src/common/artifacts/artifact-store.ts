import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { get, put } from "@vercel/blob";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface ArtifactFile {
  name: string;
  content: Buffer | string;
  contentType?: string;
}

export interface StoredArtifactPackage {
  packageId: string;
  files: Array<{ name: string; sha256: string; bytes: number }>;
  manifestPath: string;
  fileReference: string;
}

export interface ArtifactStore {
  writePackage(namespace: string, files: ArtifactFile[], meta: Record<string, unknown>): Promise<StoredArtifactPackage>;
  readFile(fileReference: string, name: string): Promise<Buffer>;
}

/**
 * Dev-only fallback for local development without durable object storage.
 * Storage does not survive a redeploy — never use in production (Railway's
 * filesystem is ephemeral per-deploy; this silently lost every KYB
 * registration document and payment POP uploaded before durable stores existed).
 */
export class LocalFsArtifactStore implements ArtifactStore {
  constructor(private readonly rootDir = join(process.cwd(), "generated-packages")) {}

  private resolvePath(fileReference: string): string {
    if (fileReference.includes("..")) {
      throw new Error("Invalid artifact reference");
    }
    return join(this.rootDir, fileReference);
  }

  async writePackage(
    namespace: string,
    files: ArtifactFile[],
    meta: Record<string, unknown>,
  ): Promise<StoredArtifactPackage> {
    const packageId = randomUUID();
    const relativeDir = join(namespace, packageId);
    const absoluteDir = join(this.rootDir, relativeDir);
    await mkdir(absoluteDir, { recursive: true });

    const written: Array<{ name: string; sha256: string; bytes: number }> = [];
    for (const file of files) {
      const buf = typeof file.content === "string" ? Buffer.from(file.content, "utf8") : file.content;
      await writeFile(join(absoluteDir, file.name), buf);
      written.push({
        name: file.name,
        sha256: createHash("sha256").update(buf).digest("hex"),
        bytes: buf.length,
      });
    }

    const manifest = {
      packageId,
      generatedAt: new Date().toISOString(),
      ...meta,
      files: written,
      hashAlgorithm: "SHA-256",
    };
    const manifestBody = JSON.stringify(manifest, null, 2);
    await writeFile(join(absoluteDir, "manifest.json"), manifestBody, "utf8");
    written.push({
      name: "manifest.json",
      sha256: createHash("sha256").update(manifestBody).digest("hex"),
      bytes: Buffer.byteLength(manifestBody),
    });

    return {
      packageId,
      files: written,
      manifestPath: join(relativeDir, "manifest.json"),
      fileReference: relativeDir,
    };
  }

  async readFile(fileReference: string, name: string): Promise<Buffer> {
    return readFile(join(this.resolvePath(fileReference), name));
  }
}

/**
 * Production store. Durable object storage (Vercel Blob, private access).
 * `fileReference` is the blob pathname prefix (`<namespace>/<packageId>`);
 * each file lives at `<fileReference>/<name>`.
 */
export class VercelBlobArtifactStore implements ArtifactStore {
  async writePackage(
    namespace: string,
    files: ArtifactFile[],
    meta: Record<string, unknown>,
  ): Promise<StoredArtifactPackage> {
    const packageId = randomUUID();
    const fileReference = `${namespace}/${packageId}`;

    const written: Array<{ name: string; sha256: string; bytes: number }> = [];
    for (const file of files) {
      const buf = typeof file.content === "string" ? Buffer.from(file.content, "utf8") : file.content;
      await put(`${fileReference}/${file.name}`, buf, {
        access: "private",
        addRandomSuffix: false,
        contentType: file.contentType,
      });
      written.push({
        name: file.name,
        sha256: createHash("sha256").update(buf).digest("hex"),
        bytes: buf.length,
      });
    }

    const manifest = {
      packageId,
      generatedAt: new Date().toISOString(),
      ...meta,
      files: written,
      hashAlgorithm: "SHA-256",
    };
    const manifestBody = JSON.stringify(manifest, null, 2);
    await put(`${fileReference}/manifest.json`, manifestBody, {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    written.push({
      name: "manifest.json",
      sha256: createHash("sha256").update(manifestBody).digest("hex"),
      bytes: Buffer.byteLength(manifestBody),
    });

    return {
      packageId,
      files: written,
      manifestPath: `${fileReference}/manifest.json`,
      fileReference,
    };
  }

  async readFile(fileReference: string, name: string): Promise<Buffer> {
    const result = await get(`${fileReference}/${name}`, { access: "private" });
    if (!result || result.statusCode !== 200) {
      throw new Error(`Artifact not found: ${fileReference}/${name}`);
    }
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }
}

/**
 * Neon Object Storage (S3-compatible). Available only in aws-eu-central-1 /
 * aws-us-east-2 — not on the primary DB project (aws-us-west-2). Same
 * fileReference layout as Vercel Blob for dual-read / future migration.
 */
export class NeonS3ArtifactStore implements ArtifactStore {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(opts?: {
    endpoint?: string;
    region?: string;
    bucket?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  }) {
    const endpoint = opts?.endpoint ?? process.env.NEON_STORAGE_ENDPOINT;
    const region = opts?.region ?? process.env.NEON_STORAGE_REGION ?? "eu-central-1";
    const bucket = opts?.bucket ?? process.env.NEON_STORAGE_BUCKET;
    const accessKeyId = opts?.accessKeyId ?? process.env.NEON_STORAGE_ACCESS_KEY_ID;
    const secretAccessKey = opts?.secretAccessKey ?? process.env.NEON_STORAGE_SECRET_ACCESS_KEY;

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "NeonS3ArtifactStore requires NEON_STORAGE_ENDPOINT, NEON_STORAGE_BUCKET, NEON_STORAGE_ACCESS_KEY_ID, and NEON_STORAGE_SECRET_ACCESS_KEY",
      );
    }

    this.bucket = bucket;
    this.client = new S3Client({
      endpoint,
      region,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  private objectKey(fileReference: string, name: string): string {
    if (fileReference.includes("..") || name.includes("..") || name.includes("/")) {
      throw new Error("Invalid artifact reference");
    }
    return `${fileReference}/${name}`;
  }

  async writePackage(
    namespace: string,
    files: ArtifactFile[],
    meta: Record<string, unknown>,
  ): Promise<StoredArtifactPackage> {
    const packageId = randomUUID();
    const fileReference = `${namespace}/${packageId}`;

    const written: Array<{ name: string; sha256: string; bytes: number }> = [];
    for (const file of files) {
      const buf = typeof file.content === "string" ? Buffer.from(file.content, "utf8") : file.content;
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: this.objectKey(fileReference, file.name),
          Body: buf,
          ContentType: file.contentType,
        }),
      );
      written.push({
        name: file.name,
        sha256: createHash("sha256").update(buf).digest("hex"),
        bytes: buf.length,
      });
    }

    const manifest = {
      packageId,
      generatedAt: new Date().toISOString(),
      ...meta,
      files: written,
      hashAlgorithm: "SHA-256",
    };
    const manifestBody = JSON.stringify(manifest, null, 2);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.objectKey(fileReference, "manifest.json"),
        Body: manifestBody,
        ContentType: "application/json",
      }),
    );
    written.push({
      name: "manifest.json",
      sha256: createHash("sha256").update(manifestBody).digest("hex"),
      bytes: Buffer.byteLength(manifestBody),
    });

    return {
      packageId,
      files: written,
      manifestPath: `${fileReference}/manifest.json`,
      fileReference,
    };
  }

  async readFile(fileReference: string, name: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: this.objectKey(fileReference, name),
      }),
    );
    if (!result.Body) {
      throw new Error(`Artifact not found: ${fileReference}/${name}`);
    }
    const bytes = await result.Body.transformToByteArray();
    return Buffer.from(bytes);
  }
}

function neonS3Configured(): boolean {
  return Boolean(
    process.env.NEON_STORAGE_ENDPOINT &&
      process.env.NEON_STORAGE_BUCKET &&
      process.env.NEON_STORAGE_ACCESS_KEY_ID &&
      process.env.NEON_STORAGE_SECRET_ACCESS_KEY,
  );
}

/**
 * Selection order:
 *   ARTIFACT_STORE=neon_s3     → Neon Object Storage (requires eu/us-east-2 env)
 *   ARTIFACT_STORE=vercel_blob → Vercel Blob
 *   (auto) neon env set        → Neon
 *   (auto) BLOB_READ_WRITE_TOKEN → Vercel Blob
 *   production without either  → throw (fail-closed)
 *   development                → LocalFsArtifactStore
 */
export function createArtifactStore(): ArtifactStore {
  const preferred = (process.env.ARTIFACT_STORE ?? "").trim().toLowerCase();

  if (preferred === "neon_s3") {
    return new NeonS3ArtifactStore();
  }
  if (preferred === "vercel_blob") {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("ARTIFACT_STORE=vercel_blob but BLOB_READ_WRITE_TOKEN is not set");
    }
    return new VercelBlobArtifactStore();
  }
  if (preferred === "local") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ARTIFACT_STORE=local is not allowed in production");
    }
    return new LocalFsArtifactStore();
  }

  if (neonS3Configured()) {
    return new NeonS3ArtifactStore();
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return new VercelBlobArtifactStore();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "No durable artifact store configured — set ARTIFACT_STORE=neon_s3 (with NEON_STORAGE_*) or BLOB_READ_WRITE_TOKEN. Refusing ephemeral local-disk fallback in production.",
    );
  }
  return new LocalFsArtifactStore();
}

export const ARTIFACT_STORE = Symbol("ARTIFACT_STORE");
