import { readFileSync } from "node:fs";
import { join } from "node:path";

import { KYB_REQUIREMENTS, summariseCoverage } from "./kyb-requirements";
import { KYB_RULES_DEFAULT } from "./kyb-rules";
import * as validation from "./kyb-validation";

const dtoSource = readFileSync(join(__dirname, "dto", "kyb.dto.ts"), "utf8");
const migration = ["0071_kyb_pipeline.sql", "0072_kyb_required_documents.sql"]
  .map((file) => readFileSync(join(__dirname, "..", "..", "..", "db", "migrations", file), "utf8"))
  .join("\n");
const schema = readFileSync(join(__dirname, "..", "..", "db", "schema", "kyb.ts"), "utf8");

describe("KYB requirements register", () => {
  it("meets every captured field with a real property in the submission contract", () => {
    const missing = KYB_REQUIREMENTS.filter((r) => r.coverage === "field" && !new RegExp(`\\b${r.where}[?!]?:`).test(dtoSource)).map((r) => r.id);
    expect(missing).toEqual([]);
  });

  it("stores every captured field, not only accepts it", () => {
    const stored = ["registeredBusinessName", "businessRegistrationNumber", "entityTypeCode", "principalBusiness", "financialYearEnd", "postalAddressProtected", "contactEmail", "contactPhone", "tinProtected", "incorporatedOn"];
    expect(stored.filter((name) => !schema.includes(name))).toEqual([]);
  });

  it("meets every document requirement with a seeded document type", () => {
    const missing = KYB_REQUIREMENTS.filter((r) => r.coverage === "document" && !migration.includes(`'kyb_document_type', '${r.where}'`)).map((r) => r.id);
    expect(missing).toEqual([]);
  });

  it("meets every configuration requirement with a setting that has a default", () => {
    const missing = KYB_REQUIREMENTS.filter((r) => r.coverage === "config" && !(r.where! in KYB_RULES_DEFAULT)).map((r) => r.id);
    expect(missing).toEqual([]);
  });

  it("meets every validation requirement with a function that exists", () => {
    const missing = KYB_REQUIREMENTS.filter((r) => r.coverage === "validation" && typeof (validation as Record<string, unknown>)[r.where!] !== "function").map((r) => r.id);
    expect(missing).toEqual([]);
  });

  it("explains every requirement left out of scope", () => {
    const unexplained = KYB_REQUIREMENTS.filter((r) => r.coverage === "out_of_scope" && (r.reason ?? "").length < 40).map((r) => r.id);
    expect(unexplained).toEqual([]);
  });

  it("reports the coverage as a number, so it can be tracked and not just asserted", () => {
    const s = summariseCoverage();
    expect(s.covered + s.outOfScope).toBe(s.total);
    expect(s.coveredPercent).toBeGreaterThan(60);
    console.log(JSON.stringify(s));
  });
});
