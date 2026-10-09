import { BadRequestException } from "@nestjs/common";

import { VisitorDataMinimisationService } from "./visitor-data-minimisation.service";

describe("publish gate: purpose note per field (PR-2)", () => {
  const service = new VisitorDataMinimisationService();

  it("passes core and basic fields with no note", () => {
    expect(() =>
      service.assertPublishAllowed(
        [
          { dataClassificationCode: "core", fieldCode: "full_name" },
          { dataClassificationCode: "basic", fieldCode: "company" },
        ],
        null,
      ),
    ).not.toThrow();
  });

  it("refuses a sensitive field with no note and names the field", () => {
    expect(() =>
      service.assertPublishAllowed([{ dataClassificationCode: "sensitive", fieldCode: "vehicle_registration" }], null),
    ).toThrow(/vehicle_registration/);
  });

  it("refuses a note that is too short or only spaces", () => {
    for (const purposeNote of ["", "   ", "short"]) {
      expect(() =>
        service.assertPublishAllowed([{ dataClassificationCode: "sensitive", fieldCode: "x", purposeNote }], null),
      ).toThrow(BadRequestException);
    }
  });

  it("accepts a sensitive field with a note, and still needs the approval reference for high risk", () => {
    const note = "Needed to match the vehicle at the gate";
    expect(() =>
      service.assertPublishAllowed([{ dataClassificationCode: "sensitive", fieldCode: "x", purposeNote: note }], null),
    ).not.toThrow();
    expect(() =>
      service.assertPublishAllowed([{ dataClassificationCode: "high_risk", fieldCode: "id", purposeNote: note }], null),
    ).toThrow(/approval reference/);
    expect(() =>
      service.assertPublishAllowed(
        [{ dataClassificationCode: "high_risk", fieldCode: "id", purposeNote: note }],
        "REF-1",
      ),
    ).not.toThrow();
  });
});
