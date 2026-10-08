import { parseRegistrationText, toSuggestions } from "./founding-statement-parser";

// Synthetic text shaped like OCR output of a CC1 scan (including its typical errors). No real person or business appears here.
const OCR = `REPUBLIC OF NAMIBIA
BUSINESS AND INTELLECTUAL PROPERTY AUTHORITY - BIPA
CLOSE CORPORATIONS ACT, 1988
Founding Statement

REGISTRATION NUMBER OF CORPORATION DATE OF RECEIPT
24109999

Full name of corporation SAMPLE TRADING CC
Literal translation of name (if applicable) NONE
SOFTWARE AND SERVICES,
Description of principal business _CONSULTING AND SUPPORT
Date of end of financial year 28 FEBRUARY EACH YEAR
SAMPLE STREET 12, ERF 100,
Address of registered office (not post office box) _EXAMPLE PARK UNIT 4
Email address: OWNER@SAMPLE.EXAMPLE
-3- CC1
NAME OF CORPORATION SAMPLE TRADING CC
REGISTRATION NUMBER 2024101234
PART C
MEMBERS ONE (1)
Full names and surname ANNA MARIA EXAMPLE
Percentage of interest 100% Particulars of contribution N$100.00
Full names and surname
Percentage of interest
-4-
REGISTRATION NUMBER CC/2024/01234
`;

describe("parseRegistrationText", () => {
  const out = parseRegistrationText(OCR);

  it("recognises a founding statement and a close corporation", () => {
    expect(out.looksLikeFoundingStatement).toBe(true);
    expect(out.entityType?.value).toBe("close_corporation");
  });

  it("repairs a registration number whose slash was read as a digit and prefers the one seen most often", () => {
    expect(out.registrationNumber?.value).toBe("CC/2024/01234");
    expect(out.registrationNumber?.confidence).toBe("medium");
  });

  it("joins an address printed above its label", () => {
    expect(out.registeredAddress?.value).toBe("SAMPLE STREET 12, ERF 100, EXAMPLE PARK UNIT 4");
  });

  it("joins the business description across two lines and reads the year end", () => {
    expect(out.principalBusiness?.value).toBe("SOFTWARE AND SERVICES, CONSULTING AND SUPPORT");
    expect(out.financialYearEnd?.value).toBe("28 FEBRUARY EACH YEAR");
  });

  it("reads the name and the member with a percentage, skipping the empty member block", () => {
    expect(out.businessName?.value).toBe("SAMPLE TRADING CC");
    expect(out.members).toEqual([{ fullName: "ANNA MARIA EXAMPLE", percentage: 100 }]);
  });

  it("marks the email as low confidence so a person checks it", () => {
    expect(out.contactEmail?.confidence).toBe("low");
  });

  it("returns nothing it cannot read, rather than guessing", () => {
    const empty = parseRegistrationText("a photograph of a cat");
    expect(empty.looksLikeFoundingStatement).toBe(false);
    expect(empty.registrationNumber).toBeUndefined();
    expect(empty.members).toEqual([]);
    expect(toSuggestions(empty)).toEqual({});
  });
});

// Shaped like OCR of a CC2 amended founding statement: a four-digit sequence, a description split over three lines, stamps next to a name.
const CC2 = `CLIENT
AMENDED FOUNDING STATEMENT
SAMPLE HOLDINGS TWO CC
REGISTRATION NUMBER OF CC
CC/2006/0278
PART A
Full name of corporation SAMPLE HOLDINGS TWO CC
Previous name of corporation (if applicable)* we
TO BE INVOLVED IN INVESTMENTS AND
PROPERTY HOLDING AND RELATED
Description of principal business* ACTIVITIES
Date of end of financial year* LAST DAY OF JUNE OF EACH YEAR
PART B
Postal address* _P O BOX 1 SAMPLETOWN, NAMIBIA
Address of registered office (not post office box)* _ERF 55 SAMPLETOWN, NAMIBIA
REGISTRATION NUMBER CC/2006/0278
PART C
MEMBERS
Full names and surname _ANNA MARIA EXAMPLE p 7 APR 2023
Percentage of interest 100% Particulars of contribution N$100.00
`;

describe("parseRegistrationText on an amended founding statement", () => {
  const out = parseRegistrationText(CC2);
  it("keeps a four-digit sequence and the number seen most often", () => {
    expect(out.registrationNumber?.value).toBe("CC/2006/0278");
  });
  it("joins a description split over lines above its label", () => {
    expect(out.principalBusiness?.value).toBe("TO BE INVOLVED IN INVESTMENTS AND PROPERTY HOLDING AND RELATED ACTIVITIES");
  });
  it("reads the registered office, not the postal address", () => {
    expect(out.registeredAddress?.value).toBe("ERF 55 SAMPLETOWN, NAMIBIA");
  });
  it("ignores stamps after a member's name", () => {
    expect(out.members).toEqual([{ fullName: "ANNA MARIA EXAMPLE", percentage: 100 }]);
  });
});

describe("parseRegistrationText with a handwritten number", () => {
  const noisy = `Founding Statement
CLOSE CORPORATIONS ACT, 1988
REGISTRATION NUMBER OF CORPORATION DATE OF RECEIPT

24109322
Full name of corporation SAMPLE TRADING CC
REGISTRATION NUMBER 2409322 |
Full names and surmame ANNA MARIA EXAMPLE
Percentage of interest 100%
`;
  it("rebuilds the number from OCR that lost its slash and century, as a low-confidence suggestion", () => {
    const out = parseRegistrationText(noisy);
    expect(out.registrationNumber?.value).toBe("CC/2024/09322");
    expect(out.registrationNumber?.confidence).toBe("medium");
  });
  it("tolerates a misread label", () => {
    expect(parseRegistrationText(noisy).members[0]?.fullName).toBe("ANNA MARIA EXAMPLE");
  });
});

describe("parseRegistrationText with two readings", () => {
  const first = `CLOSE CORPORATIONS ACT, 1988
Amended Founding Statement
REGISTRATION NUMBER OF CORPORATION
CC/2006/0278
Full name of corporation SAMPLE HOLDINGS TWO CC
REGISTRATION NUMBER CC/2006/0278
`;
  it("never lets the digit repair override an explicit four-digit number, even when the second reading drops the slashes", () => {
    const out = parseRegistrationText(first, "REGISTRATIONNUMBER 20060278\nCC/2006/0278\nREGISTRATIONNUMBER CC20060278");
    expect(out.registrationNumber?.value).toBe("CC/2006/0278");
  });
  it("repairs from the second reading when the first has nothing usable", () => {
    const out = parseRegistrationText("Founding Statement\nCLOSE CORPORATIONS ACT, 1988\nREGISTRATION NUMBER OF CORPORATION\n\n2409322", "REGISTRATIONNUMBER 202409322");
    expect(out.registrationNumber?.value).toBe("CC/2024/09322");
  });
  it("takes the email and an 11-digit identity number from the second reading, and ignores a number with a digit missing", () => {
    const text = `Full names and surname ANNA MARIA EXAMPLE\nPercentage of interest 100%\nEmail address: OWNER@SAMPLE.EXAMPLE`;
    const good = parseRegistrationText(text, "Identitynumberordateofbirth 9 1 0 1 2 4 0 0 4 5 7\nEmail address: owner@sample.example");
    expect(good.members[0]?.identityNumber).toBe("91012400457");
    expect(good.contactEmail).toEqual({ value: "owner@sample.example", confidence: "medium" });
    const short = parseRegistrationText(text, "Identitynumberordateofbirth 9 1 0 2 4 0 0 4 5 7");
    expect(short.members[0]?.identityNumber).toBeUndefined();
  });
});
