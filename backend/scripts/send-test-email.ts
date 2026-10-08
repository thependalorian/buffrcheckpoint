#!/usr/bin/env npx ts-node
/**
 * Sends one real branded email through the product's own template pipeline (template, brand layout, outbox, dispatch worker, SMTP)
 * and reports the outbox status. Development databases only.
 *
 * Usage: DATABASE_URL=... ORG_ID=<uuid> TEMPLATE=kyb_needs_info TO=you@example.com \
 *          RETENTION_DISPOSITION_ENABLED=false SCHEDULED_REPORTS_ENABLED=false npx ts-node --transpile-only scripts/send-test-email.ts
 */
import "dotenv/config";

import { NestFactory } from "@nestjs/core";

import { AppModule } from "../src/app.module";
import { TemplatedEmailService } from "../src/modules/notifications/templated-email.service";

const { ORG_ID, TEMPLATE, TO } = process.env;
if (!ORG_ID || !TEMPLATE || !TO) {
  console.error("Usage: ORG_ID=... TEMPLATE=... TO=... ts-node scripts/send-test-email.ts");
  process.exit(2);
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ["error", "warn"] });
  const mail = app.get(TemplatedEmailService);
  await mail.send({
    templateCode: TEMPLATE as string,
    organisationId: ORG_ID as string,
    to: TO as string,
    recipientName: "Test Recipient",
    variables: {
      organisationName: "Sample Trading CC",
      note: "Please confirm the registration number against the stamp on your founding statement, and upload a clearer copy of page 3.",
    },
    fallback: { subject: "Test", body: "Test" },
  });
  console.log("queued; waiting for the dispatch worker");
  await new Promise((resolve) => setTimeout(resolve, 45_000));
  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
