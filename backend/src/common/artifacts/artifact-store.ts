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
 * Dev-only fallback for local development without a BLOB_READ_WRITE_TOKEN.
 * Storage does not survive a redeploy — never use in production (Railway's
 * filesystem is ephemeral per-deploy; this silently lost every KYB
 * registration document and payment POP uploaded before the Vercel Blob
 * store existed).
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
 * Production store. Durable object storage (Vercel Blob, private access) —
 * replaces LocalFsArtifactStore, which lost every uploaded artifact on each
 * Railway redeploy. `fileReference` is the blob pathname prefix
 * (`<namespace>/<packageId>`); each file lives at `<fileReference>/<name>`.
 * Private access means blobs are not reachable via a public URL — retrieval
 * goes through the SDK's `get()`, which requires BLOB_READ_WRITE_TOKEN
 * server-side, never a client-exposed URL.
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
 * Single instance shared across modules (kyb, billing, dsar) — same
 * selection logic used everywhere so a missing BLOB_READ_WRITE_TOKEN never
 * silently falls back to ephemeral storage in production.
 */
export function createArtifactStore(): ArtifactStore {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return new VercelBlobArtifactStore();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set — refusing to fall back to ephemeral local-disk storage in production.",
    );
  }
  return new LocalFsArtifactStore();
}

export const ARTIFACT_STORE = Symbol("ARTIFACT_STORE");
