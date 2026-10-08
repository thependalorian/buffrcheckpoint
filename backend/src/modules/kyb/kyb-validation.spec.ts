import {
  crossCheck,
  detectFileType,
  inferEntityType,
  normaliseRegistrationNumber,
  safeFileName,
  validateAddress,
  validateDocumentFile,
  validateKybFields,
  validateMembers,
  validateNamibianId,
  validateRegistrationNumber,
} from "./kyb-validation";

const NOW = new Date("2026-10-08T00:00:00Z");

describe("registration numbers", () => {
  it.each([
    ["cc 2024 09322", "CC/2024/09322"],
    ["CC2024/09322", "CC/2024/09322"],
    ["CC-2024-09322", "CC/2024/09322"],
    ["2013/0456", "2013/0456"],
  ])("normalises %s", (input, expected) => expect(normaliseRegistrationNumber(input)).toBe(expected));

  it("infers the entity type from the format", () => {
    expect(inferEntityType("CC/2024/09322")).toBe("close_corporation");
    expect(inferEntityType("2013/0456")).toBe("private_company");
    expect(inferEntityType("hello")).toBeNull();
  });

  it("rejects an unknown format, a future year and a type mismatch", () => {
    expect(validateRegistrationNumber("banana", "close_corporation", NOW)[0]?.code).toBe("registrationFormat");
    expect(validateRegistrationNumber("CC/2031/00001", "close_corporation", NOW)[0]?.code).toBe("registrationYear");
    expect(validateRegistrationNumber("2013/0456", "close_corporation", NOW)[0]?.code).toBe("registrationEntityMismatch");
    expect(validateRegistrationNumber("CC/2024/09322", "close_corporation", NOW)).toEqual([]);
  });

  it("accepts a plausible token for bodies that register differently", () => {
    expect(validateRegistrationNumber("NPO-2020-77", "non_profit", NOW)).toEqual([]);
  });
});

describe("addresses and names", () => {
  it("refuses a post office box as the registered office", () => {
    expect(validateAddress("PO BOX 90022 ONGWEDIVA, NAMIBIA")[0]?.code).toBe("addressPoBox");
    expect(validateAddress("Unit 4, Example Park, Windhoek")).toEqual([]);
    expect(validateAddress("Windhoek")[0]?.code).toBe("addressShort");
  });

  it("warns, not errors, when the business name lacks the expected suffix", () => {
    const issues = validateKybFields(
      {
        entityType: "close_corporation",
        businessRegistrationNumber: "CC/2024/09322",
        registeredBusinessName: "Sample Trading",
        registeredAddress: "Sample Street 12, Example Park, Windhoek",
        authorizedSignatoryName: "Anna Example",
      },
      NOW,
    );
    expect(issues).toEqual([expect.objectContaining({ field: "registeredBusinessName", severity: "warning" })]);
  });
});

describe("identity numbers", () => {
  it("accepts 11 digits with a real date and derives the date of birth", () => {
    expect(validateNamibianId("91012400457", "id", NOW)).toEqual({ issues: [], dateOfBirth: "1991-01-24" });
  });
  it("rejects wrong length and impossible dates", () => {
    expect(validateNamibianId("1234", "id", NOW).issues[0]?.code).toBe("idLength");
    expect(validateNamibianId("91023100457", "id", NOW).issues[0]?.code).toBe("idDate");
  });
});

describe("members", () => {
  it("warns when a close corporation's shares do not total 100", () => {
    const issues = validateMembers(
      [
        { fullName: "Anna Example", percentage: 60 },
        { fullName: "Ben Example", percentage: 30 },
      ],
      "close_corporation",
    );
    expect(issues).toEqual([expect.objectContaining({ field: "members", code: "percentageTotal", severity: "warning" })]);
  });
});

describe("document files", () => {
  const pdf = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(2048)]);
  it("decides the type from the first bytes, not the name", () => {
    expect(detectFileType(pdf)).toBe("pdf");
    expect(detectFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2]))).toBe("jpeg");
    expect(detectFileType(Buffer.from("MZ executable pretending to be a pdf"))).toBeNull();
  });
  it("refuses empty, tiny, huge and unknown files", () => {
    expect(validateDocumentFile(Buffer.alloc(0)).issues[0]?.code).toBe("documentEmpty");
    expect(validateDocumentFile(Buffer.from("%PDF-1.7")).issues[0]?.code).toBe("documentSize");
    expect(validateDocumentFile(Buffer.alloc(2048, 1)).issues[0]?.code).toBe("documentType");
    expect(validateDocumentFile(pdf).type).toBe("pdf");
  });
  it("cleans a file name for storage", () => {
    expect(safeFileName('../../etc/pass"wd<script>.exe', "pdf")).toBe("etcpasswdscript.pdf");
  });
});

describe("cross check", () => {
  it("compares typed values with the document, ignoring case and punctuation", () => {
    const rows = crossCheck(
      { businessRegistrationNumber: "cc 2024 09322", registeredBusinessName: "Sample Trading cc", registeredAddress: "Unit 4, Example Park" },
      { registrationNumber: "CC/2024/09322", businessName: "SAMPLE TRADING CC", registeredAddress: "Unit 5 Example Park" },
    );
    expect(rows.map((r) => r.result)).toEqual(["match", "match", "mismatch"]);
    expect(crossCheck({ businessRegistrationNumber: "x", registeredBusinessName: "y", registeredAddress: "z" }, null).every((r) => r.result === "not_read")).toBe(true);
  });
});
