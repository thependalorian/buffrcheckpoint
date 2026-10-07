/**
 * Canonical check-in form visibility / requiredIf contracts.
 * Keep in sync with buffrcheckpoint.md §8.2 and kiosk Kotlin port.
 */

export type VisibilityCondition = {
  fieldCode: string;
  equals?: string;
  in?: string[];
  notEmpty?: boolean;
};

export type VisibilityRule = {
  op?: "and" | "or";
  conditions?: VisibilityCondition[];
};

export type FormValidationSchema = {
  maxLength?: number;
  pattern?: string;
  options?: string[];
  requiredIf?: VisibilityRule;
  [key: string]: unknown;
};

export function answerScalar(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object" && value !== null && "value" in value) {
    return answerScalar((value as { value: unknown }).value);
  }
  if (Array.isArray(value)) return value.map(answerScalar).filter(Boolean).join(",");
  return "";
}

function conditionMatches(condition: VisibilityCondition, answers: Record<string, unknown>): boolean {
  const raw = answers[condition.fieldCode];
  const scalar = answerScalar(raw);

  if (condition.notEmpty === true) {
    return scalar.length > 0;
  }
  if (condition.equals !== undefined) {
    return scalar === condition.equals;
  }
  if (condition.in !== undefined) {
    return condition.in.includes(scalar);
  }
  return true;
}

/** Empty / missing rule => always visible (or requiredIf inactive). */
export function evaluateVisibilityRule(
  rule: VisibilityRule | Record<string, unknown> | null | undefined,
  answers: Record<string, unknown>,
): boolean {
  if (rule == null || typeof rule !== "object") return true;
  const conditions = (rule as VisibilityRule).conditions;
  if (!Array.isArray(conditions) || conditions.length === 0) return true;

  const op = (rule as VisibilityRule).op === "or" ? "or" : "and";
  if (op === "or") {
    return conditions.some((c) => conditionMatches(c, answers));
  }
  return conditions.every((c) => conditionMatches(c, answers));
}

export function isFieldVisible(
  visibilityRule: VisibilityRule | Record<string, unknown> | null | undefined,
  answers: Record<string, unknown>,
): boolean {
  return evaluateVisibilityRule(visibilityRule, answers);
}

export function isFieldRequired(
  required: boolean,
  validationSchema: FormValidationSchema | Record<string, unknown> | null | undefined,
  answers: Record<string, unknown>,
): boolean {
  if (required) return true;
  const schema = (validationSchema ?? {}) as FormValidationSchema;
  if (schema.requiredIf && typeof schema.requiredIf === "object") {
    return evaluateVisibilityRule(schema.requiredIf, answers);
  }
  return false;
}

export function validateAnswerValue(
  value: unknown,
  validationSchema: FormValidationSchema | Record<string, unknown> | null | undefined,
): string | null {
  const schema = (validationSchema ?? {}) as FormValidationSchema;
  const scalar = answerScalar(value);

  if (schema.maxLength != null && scalar.length > schema.maxLength) {
    return `Exceeds max length ${schema.maxLength}`;
  }
  if (schema.pattern && scalar.length > 0) {
    try {
      if (!new RegExp(schema.pattern).test(scalar)) {
        return "Does not match required pattern";
      }
    } catch {
      return "Invalid validation pattern";
    }
  }
  if (Array.isArray(schema.options) && schema.options.length > 0 && scalar.length > 0) {
    const values = scalar.includes(",") ? scalar.split(",").map((s) => s.trim()) : [scalar];
    for (const v of values) {
      if (!schema.options.includes(v)) {
        return `Value must be one of: ${schema.options.join(", ")}`;
      }
    }
  }
  return null;
}
