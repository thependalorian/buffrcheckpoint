import { Injectable, Logger } from "@nestjs/common";

import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import type { DetectedFileType } from "./kyb-validation";

const run = promisify(execFile);

const MAX_PAGES = 6;
const STEP_TIMEOUT_MS = 90_000;
const TEXT_LAYER_MIN_CHARS = 200;

export type ReadMethod = "text_layer" | "ocr" | "unavailable" | "failed";

export interface DocumentReadResult {
  method: ReadMethod;
  text: string;
}

/**
 * Reads the text of an uploaded document on this server: the text layer of a digital PDF, or OCR of a scan. Nothing is sent to a third
 * party, so a founding statement (which names members and identity numbers) never leaves the platform. Uses poppler and tesseract
 * through fixed argument lists (no shell). When the tools are not installed the document is simply not read and the person types the
 * details, so a missing tool never blocks verification.
 */
@Injectable()
export class KybDocumentReaderService {
  private readonly logger = new Logger(KybDocumentReaderService.name);
  private available: boolean | null = null;
  // OCR is CPU heavy and the API runs one replica: read one document at a time.
  private queue: Promise<unknown> = Promise.resolve();

  read(buffer: Buffer, type: DetectedFileType): Promise<DocumentReadResult> {
    const job = this.queue.then(() => this.readNow(buffer, type));
    this.queue = job.catch(() => undefined);
    return job;
  }

  private async toolsPresent(): Promise<boolean> {
    if (this.available !== null) return this.available;
    try {
      await run("tesseract", ["--version"], { timeout: 10_000 });
      await run("pdftoppm", ["-v"], { timeout: 10_000 });
      this.available = true;
    } catch {
      this.available = false;
      this.logger.warn("tesseract or poppler is not installed: uploaded documents will not be read automatically");
    }
    return this.available;
  }

  private async readNow(buffer: Buffer, type: DetectedFileType): Promise<DocumentReadResult> {
    if (!(await this.toolsPresent())) return { method: "unavailable", text: "" };
    const dir = await mkdtemp(join(tmpdir(), "kyb-read-"));
    try {
      if (type === "pdf") {
        const pdf = join(dir, "in.pdf");
        await writeFile(pdf, buffer);
        const layer = await run("pdftotext", ["-layout", "-l", String(MAX_PAGES), pdf, "-"], { timeout: STEP_TIMEOUT_MS, maxBuffer: 4_000_000 });
        if (layer.stdout.trim().length >= TEXT_LAYER_MIN_CHARS) return { method: "text_layer", text: layer.stdout };
        // Scans are often huge (a 4 MB file can hold A0-sized pages): bound the longest side (3200 px keeps handwriting legible) so rendering takes a second, not two minutes.
        await run("pdftoppm", ["-scale-to", "3200", "-jpeg", "-jpegopt", "quality=88", "-l", String(MAX_PAGES), pdf, join(dir, "page")], { timeout: STEP_TIMEOUT_MS });
        const pages = (await readdir(dir)).filter((f) => f.startsWith("page") && f.endsWith(".jpg")).sort();
        const texts: string[] = [];
        for (const page of pages) texts.push(await this.ocr(join(dir, page)));
        return { method: "ocr", text: texts.join("\n") };
      }
      const image = join(dir, type === "png" ? "in.png" : "in.jpg");
      await writeFile(image, buffer);
      return { method: "ocr", text: await this.ocr(image) };
    } catch (error) {
      this.logger.warn(`Document read failed: ${error instanceof Error ? error.message : "unknown error"}`);
      return { method: "failed", text: "" };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private async ocr(file: string): Promise<string> {
    const { stdout } = await run("tesseract", [file, "stdout", "-l", "eng"], { timeout: STEP_TIMEOUT_MS, maxBuffer: 4_000_000 });
    return stdout;
  }
}
