#!/usr/bin/env npx ts-node
/**
 * Runs the business-verification pipeline end to end against a database: upload a registration document, wait for it to be read,
 * check the suggestions, submit, send it back for information, resubmit, accept the document and approve.
 *
 * Usage (a development database only, never production):
 *   DATABASE_URL=... ARTIFACT_STORE=local ORG_ID=<uuid> USER_ID=<uuid> OPS_USER_ID=<uuid> [DOC_TYPE=amended_founding_statement] \
 *     npx ts-node --transpile-only scripts/kyb-pipeline-check.ts /path/to/founding-statement.pdf
 *
 * It sends no email (the mail service is replaced by a recorder) and prints a PASS or FAIL line per check, exiting non-zero on any FAIL.
 */
import "dotenv/config";

import { readFileSync } from "node:fs";

import { PersonalDataProtectionService } from "../src/common/data-protection/personal-data-protection.service";
import type { AuthenticatedUser } from "../src/common/decorators/current-user.decorator";
import { db } from "../src/db/client";
import { TypeDefinitionLookupService } from "../src/db/type-definition-lookup.service";
import { KybDocumentReaderService } from "../src/modules/kyb/kyb-document-reader.service";
import { KybService } from "../src/modules/kyb/kyb.service";

const [file] = process.argv.slice(2);
const { ORG_ID, USER_ID, OPS_USER_ID } = process.env;
if (!file || !ORG_ID || !USER_ID || !OPS_USER_ID) {
  console.error("Usage: ORG_ID=... USER_ID=... OPS_USER_ID=... ts-node scripts/kyb-pipeline-check.ts <file>");
  process.exit(2);
}
if (/neon\.tech/.test(process.env.DATABASE_URL ?? "") && !process.env.ALLOW_NEON_HOST) {
  // Neon hosts every branch, so this is a reminder rather than a guard: the caller must pass a development branch.
  console.warn("Using a Neon database: make sure this is a development branch, not production.");
}

const sent: Array<{ templateCode: string; to: string }> = [];
const mail = { send: async (input: { templateCode: string; to: string }) => void sent.push({ templateCode: input.templateCode, to: input.to }) };

const service = new KybService(
  db as never,
  new TypeDefinitionLookupService(db as never),
  new PersonalDataProtectionService(),
  mail as never,
  new KybDocumentReaderService(),
);

const customer = { userId: USER_ID, organisationId: ORG_ID, permissions: [] } as unknown as AuthenticatedUser;
const ops = { userId: OPS_USER_ID, organisationId: ORG_ID, permissions: [] } as unknown as AuthenticatedUser;

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${detail ? ` (${detail})` : ""}`);
}

async function main() {
  const buffer = readFileSync(file);

  // 1. A bad file is refused before anything is stored.
  await service
    .uploadDocument(ORG_ID as string, customer, { buffer: Buffer.from("MZ not a document ".repeat(200)), originalname: "x.pdf" }, "founding_statement")
    .then(() => check("rejects a non-document file", false))
    .catch((e) => check("rejects a non-document file", /PDF, PNG and JPEG/.test(JSON.stringify(e.getResponse?.() ?? e.message))));

  // 2. Upload the real document and wait for it to be read.
  const uploaded = await service.uploadDocument(ORG_ID as string, customer, { buffer, originalname: file.split("/").pop() as string }, process.env.DOC_TYPE ?? "founding_statement");
  check("stores the document", uploaded.status === "received" && uploaded.sizeBytes === buffer.length, `${uploaded.sizeBytes} bytes`);
  let view = uploaded;
  for (let i = 0; i < 90 && view.reading === "reading"; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    view = await service.documentView(uploaded.id, ORG_ID as string);
  }
  check("reads the document", view.reading === "read", `reading=${view.reading}`);
  console.log("  suggestions:", JSON.stringify(view.suggestions));
  console.log("  members:", JSON.stringify(view.members));
  check("suggests a business name", Boolean(view.suggestions.registeredBusinessName?.value));
  check("suggests a registered address", Boolean(view.suggestions.registeredAddress?.value));

  // 3. Bad details are refused with field messages; good details go through.
  const good = {
    entityType: "close_corporation",
    businessRegistrationNumber: view.suggestions.businessRegistrationNumber?.value ?? "CC/2024/09322",
    registeredBusinessName: view.suggestions.registeredBusinessName?.value ?? "",
    registeredAddress: view.suggestions.registeredAddress?.value ?? "",
    authorizedSignatoryName: view.members[0]?.fullName ?? process.env.SIGNATORY ?? "Test Signatory",
    principalBusiness: view.suggestions.principalBusiness?.value,
    financialYearEnd: view.suggestions.financialYearEnd?.value,
    members: view.members.map((m) => ({ fullName: m.fullName, role: "member", percentage: m.percentage ?? undefined, phone: "+264 81 123 4567", email: m.email ?? "owner@example.example" })),
    fieldSources: { registeredBusinessName: "document" },
  };
  await service
    .submit({ ...good, registeredAddress: "PO BOX 90022 ONGWEDIVA" }, customer)
    .then(() => check("refuses a post office box as registered office", false))
    .catch((e) => check("refuses a post office box as registered office", /post office box/i.test(JSON.stringify(e.getResponse?.() ?? e.message))));

  // The pack is incomplete until every required document is uploaded.
  await service
    .submit(good, customer)
    .then(() => check("refuses a submission missing the bank letter, owner identity and proof of address", false))
    .catch((e) => check("refuses a submission missing the bank letter, owner identity and proof of address", /Still needed: Bank confirmation letter/.test(JSON.stringify(e.getResponse?.() ?? e.message))));
  const filler = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(2048, 32)]);
  const extra: Record<string, string> = {};
  for (const type of ["bank_confirmation_letter", "certified_id_copy", "proof_of_address"]) {
    extra[type] = (await service.uploadDocument(ORG_ID as string, customer, { buffer: filler, originalname: `${type}.pdf` }, type)).id;
  }
  const first = await service.submit(good, customer);
  check("accepts a valid submission", Boolean(first.id));

  // 4. Cannot approve before a document is accepted.
  await service
    .decide(first.id, "verified", ops, undefined, undefined, true)
    .then(() => check("blocks approval before any document is accepted", false))
    .catch((e) => check("blocks approval before any document is accepted", /Cannot approve yet\. Accept: Proof of registration/.test(e.message)));

  // 5. Send it back naming a field, then the organisation resubmits and the old one is replaced.
  await service.decide(first.id, "needs_info", ops, "Please confirm the registration number against the stamp.", ["businessRegistrationNumber"]);
  const afterAsk = await service.mine(ORG_ID as string);
  check("shows the organisation what was asked", afterAsk.request?.kind === "needs_info" && afterAsk.request.flaggedFields.includes("businessRegistrationNumber"));
  const second = await service.submit({ ...good, businessRegistrationNumber: "CC/2024/09322" }, customer);
  const review1 = await service.review(first.id);
  check("replaces the open submission on resubmit", review1.status === "superseded");
  await service
    .decide(first.id, "verified", ops)
    .then(() => check("cannot decide a replaced submission", false))
    .catch((e) => check("cannot decide a replaced submission", /already been decided or replaced/.test(e.message)));

  // 6. Review shows the comparison; accept the document; approve.
  const review2 = await service.review(second.id);
  console.log("  comparison:", JSON.stringify(review2.comparison.map((c) => `${c.field}:${c.result}`)));
  check("review shows how the details compare with the document", review2.comparison.length === 3);
  await service.decideDocument(uploaded.id, "accepted", ops);
  await service
    .decide(second.id, "verified", ops, undefined, undefined, true)
    .then(() => check("blocks approval until every required document is accepted", false))
    .catch((e) => check("blocks approval until every required document is accepted", /Accept: .*Bank confirmation letter/.test(e.message), e.message.slice(0, 120)));
  for (const id of Object.values(extra)) await service.decideDocument(id, "accepted", ops);
  await service
    .decide(second.id, "verified", ops)
    .then(() => check("requires the registry check to be confirmed", false))
    .catch((e) => check("requires the registry check to be confirmed", /BIPA register/.test(e.message)));
  const verified = await service.decide(second.id, "verified", ops, undefined, undefined, true);
  check("approves once a document is accepted", Boolean(verified?.verifiedAt));
  check("organisation counts as verified", await service.isVerified(ORG_ID as string));
  // Decision emails go to the organisation's owners; a test organisation may have none, so only the acknowledgement is certain.
  check("acknowledged each submission", sent.filter((m) => m.templateCode === "kyb_submitted_ack").length === 2, sent.map((m) => m.templateCode).join(","));

  // 7. An accepted document cannot be removed.
  await service
    .deleteDocument(uploaded.id, ORG_ID as string)
    .then(() => check("keeps an accepted document", false))
    .catch(() => check("keeps an accepted document", true));

  console.log(failures === 0 ? "kyb-pipeline-check: OK" : `kyb-pipeline-check: ${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
