#!/usr/bin/env npx ts-node
/**
 * Runs the payment reconciliation once and prints the break count (MP-4). The same check runs daily inside the API; this is the
 * on-demand form for a month-end close or a release check. Exits 1 when any break is found. Prints counts and kinds only.
 *
 * Usage: DATABASE_URL=... npx ts-node --transpile-only scripts/run-payment-reconciliation.ts
 */
import "dotenv/config";

import { NestFactory } from "@nestjs/core";

import { AppModule } from "../src/app.module";
import { PaymentReconciliationService } from "../src/modules/billing/payment-reconciliation.service";

async function main(): Promise<void> {
  process.env.PAYMENT_RECONCILIATION_ENABLED = "false";
  process.env.AUDIT_CHAIN_VERIFY_ENABLED = "false";
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ["error"] });
  const summary = await app.get(PaymentReconciliationService).reconcileAll();
  const kinds: Record<string, number> = {};
  for (const b of summary.breaks) kinds[b.kind] = (kinds[b.kind] ?? 0) + 1;
  process.stdout.write(
    `${JSON.stringify({ organisations: summary.organisations, breaks: summary.breaks.length, kinds })}\n`,
  );
  await app.close();
  process.exit(summary.breaks.length === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(2);
});
