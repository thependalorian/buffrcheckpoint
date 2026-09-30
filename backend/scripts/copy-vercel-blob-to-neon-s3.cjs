#!/usr/bin/env node
/**
 * One-shot copy: Vercel Blob → Neon Object Storage (S3-compatible).
 *
 * Required env:
 *   BLOB_READ_WRITE_TOKEN
 *   NEON_STORAGE_ENDPOINT   (e.g. https://br-….storage.c-5.eu-central-1.aws.neon.tech)
 *   NEON_STORAGE_BUCKET     (e.g. buffr-checkpoint-artifacts)
 *   NEON_STORAGE_REGION     (eu-central-1)
 *   NEON_STORAGE_ACCESS_KEY_ID
 *   NEON_STORAGE_SECRET_ACCESS_KEY
 *
 * Optional:
 *   BLOB_PREFIX             (limit source listing; default copies all)
 *   DRY_RUN=1               (list only, no puts)
 *
 * Usage (from buffrcheckpoint/backend):
 *   node scripts/copy-vercel-blob-to-neon-s3.cjs
 */
"use strict";

const { list } = require("@vercel/blob");
const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

async function main() {
  const endpoint = process.env.NEON_STORAGE_ENDPOINT;
  const bucket = process.env.NEON_STORAGE_BUCKET;
  const region = process.env.NEON_STORAGE_REGION || "eu-central-1";
  const accessKeyId = process.env.NEON_STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.NEON_STORAGE_SECRET_ACCESS_KEY;
  const dryRun = process.env.DRY_RUN === "1";
  const prefix = process.env.BLOB_PREFIX || undefined;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required");
  }
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("NEON_STORAGE_ENDPOINT, BUCKET, ACCESS_KEY_ID, and SECRET_ACCESS_KEY are required");
  }

  const client = new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });

  let cursor;
  let copied = 0;
  let skipped = 0;
  let failed = 0;

  do {
    const page = await list({ cursor, limit: 100, prefix, token: process.env.BLOB_READ_WRITE_TOKEN });
    for (const blob of page.blobs) {
      const key = blob.pathname.replace(/^\//, "");
      try {
        try {
          await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
          skipped += 1;
          continue;
        } catch {
          // missing — copy
        }
        if (dryRun) {
          console.log(`[dry-run] would copy ${key} (${blob.size} bytes)`);
          copied += 1;
          continue;
        }
        const res = await fetch(blob.url);
        if (!res.ok) {
          throw new Error(`fetch ${blob.url} → ${res.status}`);
        }
        const body = Buffer.from(await res.arrayBuffer());
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: blob.contentType || undefined,
          }),
        );
        copied += 1;
        console.log(`copied ${key}`);
      } catch (err) {
        failed += 1;
        console.error(`failed ${key}:`, err instanceof Error ? err.message : err);
      }
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  console.log(JSON.stringify({ copied, skipped, failed, dryRun }, null, 2));
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
