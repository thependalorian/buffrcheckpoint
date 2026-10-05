import { BadRequestException } from "@nestjs/common";

import { evaluateVisibilityRule, isFieldRequired, isFieldVisible, validateAnswerValue } from "./form-rules";
import { VisitorDataMinimisationService } from "./visitor-data-minimisation.service";

describe("form-rules", () => {
  it("treats empty visibility_rule as always visible", () => {
    expect(isFieldVisible({}, {})).toBe(true);
    expect(evaluateVisibilityRule(undefined, {})).toBe(true);
  });

  it("evaluates equals / in / notEmpty conditions", () => {
    const rule = {
      op: "and" as const,
      conditions: [{ fieldCode: "purpose_category", equals: "vehicle" }],
    };
    expect(isFieldVisible(rule, { purpose_category: { value: "vehicle" } })).toBe(true);
    expect(isFieldVisible(rule, { purpose_category: { value: "meeting" } })).toBe(false);

    expect(isFieldVisible({ op: "or", conditions: [{ fieldCode: "a", in: ["x", "y"] }] }, { a: "y" })).toBe(true);

    expect(isFieldVisible({ conditions: [{ fieldCode: "a", notEmpty: true }] }, { a: "" })).toBe(false);
  });

  it("applies requiredIf when base required is false", () => {
    const schema = {
      requiredIf: { conditions: [{ fieldCode: "purpose_category", equals: "vehicle" }] },
    };
    expect(isFieldRequired(false, schema, { purpose_category: "vehicle" })).toBe(true);
    expect(isFieldRequired(false, schema, { purpose_category: "meeting" })).toBe(false);
    expect(isFieldRequired(true, schema, { purpose_category: "meeting" })).toBe(true);
  });

  it("validates maxLength, pattern, and options", () => {
    expect(validateAnswerValue({ value: "abc" }, { maxLength: 2 })).toMatch(/max length/i);
    expect(validateAnswerValue({ value: "ab" }, { maxLength: 2 })).toBeNull();
    expect(validateAnswerValue({ value: "12" }, { pattern: "^[A-Z]+$" })).toMatch(/pattern/i);
    expect(validateAnswerValue({ value: "meeting" }, { options: ["vehicle"] })).toMatch(/one of/i);
    expect(validateAnswerValue({ value: "vehicle" }, { options: ["vehicle"] })).toBeNull();
  });
});

describe("VisitorDataMinimisationService", () => {
  const service = new VisitorDataMinimisationService();

  it("blocks publish of high_risk without approval reference", () => {
    expect(() => service.assertPublishAllowed([{ dataClassificationCode: "high_risk" }], null)).toThrow(
      BadRequestException,
    );
    expect(() => service.assertPublishAllowed([{ dataClassificationCode: "high_risk" }], "  ")).toThrow(
      BadRequestException,
    );
    expect(() => service.assertPublishAllowed([{ dataClassificationCode: "high_risk" }], "DPIA-1")).not.toThrow();
    expect(() => service.assertPublishAllowed([{ dataClassificationCode: "basic" }], null)).not.toThrow();
  });

  it("rejects unknown field codes and mismatched form versions", () => {
    const form = {
      formVersionId: "v1",
      fields: [
        {
          fieldCode: "visitor_name",
          fieldLabel: "Name",
          required: true,
          dataClassificationCode: "core",
          visibilityRule: {},
          validationSchema: {},
        },
      ],
    };
    expect(() =>
      service.validateCheckInAnswers({
        form,
        formAnswers: [
          {
            formVersionId: "v1",
            fieldCode: "secret_field",
            answerValue: { value: "x" },
          },
        ],
      }),
    ).toThrow(/Unknown form field/);

    expect(() =>
      service.validateCheckInAnswers({
        form,
        formAnswers: [
          {
            formVersionId: "other",
            fieldCode: "visitor_name",
            answerValue: { value: "Ada" },
          },
        ],
      }),
    ).toThrow(/formVersionId/);
  });

  it("enforces required and requiredIf for visible fields only", () => {
    const form = {
      formVersionId: "v1",
      fields: [
        {
          fieldCode: "purpose_category",
          fieldLabel: "Purpose",
          required: true,
          dataClassificationCode: "basic",
          visibilityRule: {},
          validationSchema: { options: ["vehicle", "meeting"] },
        },
        {
          fieldCode: "vehicle_registration",
          fieldLabel: "Vehicle",
          required: false,
          dataClassificationCode: "basic",
          visibilityRule: {
            op: "and",
            conditions: [{ fieldCode: "purpose_category", equals: "vehicle" }],
          },
          validationSchema: {
            requiredIf: {
              op: "and",
              conditions: [{ fieldCode: "purpose_category", equals: "vehicle" }],
            },
          },
        },
      ],
    };

    expect(() =>
      service.validateCheckInAnswers({
        form,
        formAnswers: [
          {
            formVersionId: "v1",
            fieldCode: "purpose_category",
            answerValue: { value: "vehicle" },
          },
        ],
      }),
    ).toThrow(/vehicle_registration/);

    const ok = service.validateCheckInAnswers({
      form,
      formAnswers: [
        {
          formVersionId: "v1",
          fieldCode: "purpose_category",
          answerValue: { value: "meeting" },
        },
      ],
    });
    expect(ok.map((a) => a.fieldCode)).toEqual(["purpose_category"]);
  });

  it("rejects formAnswers when no published form exists", () => {
    expect(() =>
      service.validateCheckInAnswers({
        form: null,
        formAnswers: [
          {
            formVersionId: "v1",
            fieldCode: "visitor_name",
            answerValue: { value: "Ada" },
          },
        ],
      }),
    ).toThrow(/No published check-in form/);
    expect(service.validateCheckInAnswers({ form: null, formAnswers: undefined })).toEqual([]);
  });
});
