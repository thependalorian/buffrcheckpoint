import { BadRequestException, Injectable } from "@nestjs/common";

import {
  answerScalar,
  type FormValidationSchema,
  isFieldRequired,
  isFieldVisible,
  type VisibilityRule,
  validateAnswerValue,
} from "./form-rules";

export type MinimisationFormField = {
  fieldCode: string;
  fieldLabel: string;
  required: boolean;
  dataClassificationCode: string;
  visibilityRule: VisibilityRule | Record<string, unknown>;
  validationSchema: FormValidationSchema | Record<string, unknown>;
};

export type FormAnswerInput = {
  formVersionId: string;
  fieldCode: string;
  answerValue?: Record<string, unknown> | null;
  fieldLabelSnapshot?: string | null;
};

export type ValidatedFormAnswer = {
  formVersionId: string;
  fieldCode: string;
  answerValue: Record<string, unknown>;
  fieldLabelSnapshot: string | null;
};

const HIGH_RISK_CLASSES = new Set(["high_risk", "verification_evidence"]);
/** Classes that need no field-by-field justification: the details every visit already needs. */
const NO_NOTE_CLASSES = new Set(["core", "basic"]);
const MIN_PURPOSE_NOTE_LENGTH = 10;

@Injectable()
export class VisitorDataMinimisationService {
  /**
   * Publish gate: high-risk / verification_evidence fields require
   * a non-empty approval_reference (compliance justification).
   */
  assertPublishAllowed(
    fields: Array<{ dataClassificationCode: string; fieldCode?: string; purposeNote?: string | null }>,
    approvalReference: string | null | undefined,
  ): void {
    const missing = fields.filter(
      (f) =>
        !NO_NOTE_CLASSES.has(f.dataClassificationCode) && (f.purposeNote?.trim().length ?? 0) < MIN_PURPOSE_NOTE_LENGTH,
    );
    if (missing.length > 0) {
      throw new BadRequestException(
        `Each field above the basic class needs a purpose note of at least ${MIN_PURPOSE_NOTE_LENGTH} characters: ${missing
          .map((f) => f.fieldCode ?? "unnamed field")
          .join(", ")}`,
      );
    }
    const needsJustification = fields.some((f) => HIGH_RISK_CLASSES.has(f.dataClassificationCode));
    if (needsJustification && !approvalReference?.trim()) {
      throw new BadRequestException(
        "Publishing high-risk or verification-evidence fields requires an approval reference (justification)",
      );
    }
  }

  /**
   * Check-in gate: only answers allowed by the published effective form.
   * When no form exists, returns empty (clients use static fallback; server
   * does not invent an allow-list).
   */
  validateCheckInAnswers(input: {
    form: {
      formVersionId: string;
      fields: MinimisationFormField[];
    } | null;
    formAnswers: FormAnswerInput[] | undefined;
  }): ValidatedFormAnswer[] {
    const { form, formAnswers } = input;
    if (!form) {
      if (formAnswers?.length) {
        throw new BadRequestException("No published check-in form; formAnswers are not accepted");
      }
      return [];
    }

    const answers = formAnswers ?? [];
    for (const answer of answers) {
      if (answer.formVersionId !== form.formVersionId) {
        throw new BadRequestException(
          `formAnswers formVersionId must match effective form version ${form.formVersionId}`,
        );
      }
    }

    const answerMap: Record<string, unknown> = {};
    for (const answer of answers) {
      answerMap[answer.fieldCode] = answer.answerValue ?? {};
    }

    const byCode = new Map(form.fields.map((f) => [f.fieldCode, f]));
    for (const answer of answers) {
      if (!byCode.has(answer.fieldCode)) {
        throw new BadRequestException(`Unknown form field: ${answer.fieldCode}`);
      }
    }

    const validated: ValidatedFormAnswer[] = [];

    for (const field of form.fields) {
      const visible = isFieldVisible(field.visibilityRule, answerMap);
      if (!visible) continue;

      const raw = answerMap[field.fieldCode];
      const scalar = answerScalar(raw);
      const required = isFieldRequired(field.required, field.validationSchema, answerMap);

      if (required && scalar.length === 0) {
        throw new BadRequestException(`Required field missing: ${field.fieldCode}`);
      }

      if (scalar.length > 0) {
        const err = validateAnswerValue(raw, field.validationSchema);
        if (err) {
          throw new BadRequestException(`Invalid value for ${field.fieldCode}: ${err}`);
        }
      }

      if (raw !== undefined) {
        const incoming = answers.find((a) => a.fieldCode === field.fieldCode);
        validated.push({
          formVersionId: form.formVersionId,
          fieldCode: field.fieldCode,
          answerValue: (incoming?.answerValue ?? {}) as Record<string, unknown>,
          fieldLabelSnapshot: incoming?.fieldLabelSnapshot ?? field.fieldLabel,
        });
      }
    }

    return validated;
  }
}
