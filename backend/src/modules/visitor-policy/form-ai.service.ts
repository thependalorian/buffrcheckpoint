import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";

export type SuggestedFormField = {
  fieldCode: string;
  fieldLabel: string;
  fieldTypeCode: string;
  helpText?: string;
  dataClassificationCode: string;
  required: boolean;
  displayOrder: number;
  visibilityRule?: Record<string, unknown>;
  validationSchema?: Record<string, unknown>;
};

export type SuggestFieldsInput = {
  visitorTypeCode: string;
  intentText: string;
  siteId?: string;
  existingFieldCodes?: string[];
};

export type TranslateFieldInput = {
  languageCode: string;
  fieldLabel: string;
  helpText?: string | null;
};

/** Upper bound on one completion, so a single request cannot run up cost (AIG-11). The request carries no tools (AI-1). */
export const FORM_AI_MAX_TOKENS = 1_200;

const ALLOWED_FIELD_TYPES = new Set([
  "text",
  "phone",
  "email",
  "single_choice",
  "multi_choice",
  "boolean",
  "date",
  "number",
]);

const ALLOWED_CLASSIFICATIONS = new Set([
  "core",
  "basic",
  "sensitive",
  "high_risk",
  "verification_evidence",
  "operational",
]);

/**
 * Admin-only AI assist for form definitions via Neon AI Gateway.
 * Never accepts or forwards visitor PII — only field labels, help text,
 * and free-text admin intent about form shape.
 */
@Injectable()
export class FormAiService {
  isEnabled(): boolean {
    return (
      process.env.FORM_AI_ENABLED === "true" &&
      Boolean(process.env.NEON_AI_GATEWAY_BASE_URL) &&
      Boolean(process.env.NEON_AI_GATEWAY_API_KEY)
    );
  }

  async suggestFields(input: SuggestFieldsInput): Promise<{
    fields: SuggestedFormField[];
    warnings: string[];
    model: string;
  }> {
    this.assertEnabled();
    const intentText = input.intentText?.trim() ?? "";
    if (intentText.length < 8) {
      throw new BadRequestException("intentText must be at least 8 characters");
    }
    if (intentText.length > 2000) {
      throw new BadRequestException("intentText must be at most 2000 characters");
    }

    const model = process.env.NEON_AI_GATEWAY_MODEL ?? "openai/gpt-4.1-mini";
    const system = [
      "You design Buffr Checkpoint visitor check-in form fields.",
      'Return ONLY valid JSON: {"fields":[...],"warnings":[string]}.',
      "Each field: fieldCode (snake_case), fieldLabel, fieldTypeCode,",
      "dataClassificationCode (core|basic|sensitive|high_risk|verification_evidence|operational),",
      "required (boolean), displayOrder (number), optional helpText,",
      "optional visibilityRule {op,conditions:[{fieldCode,equals}]},",
      "optional validationSchema {options?,requiredIf?,maxLength?,pattern?}.",
      "Prefer data minimisation: do not invent high_risk or verification_evidence",
      "unless the admin intent clearly requires identity verification evidence.",
      "Do not include visitor PII examples. Do not invent host or site secrets.",
      `Visitor type code: ${input.visitorTypeCode}.`,
      input.existingFieldCodes?.length
        ? `Existing field codes to avoid duplicating: ${input.existingFieldCodes.join(", ")}.`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    const raw = await this.chatJson(model, system, intentText);
    const fields = this.sanitizeSuggestedFields(raw.fields);
    const warnings = Array.isArray(raw.warnings)
      ? raw.warnings.filter((w): w is string => typeof w === "string").slice(0, 20)
      : [];

    const highRisk = fields.filter((f) => ["high_risk", "verification_evidence"].includes(f.dataClassificationCode));
    if (highRisk.length > 0) {
      warnings.push(
        "Suggested fields include high-risk or verification-evidence classifications — publishing will require an approval reference.",
      );
    }

    return { fields, warnings, model };
  }

  async translateField(input: TranslateFieldInput): Promise<{
    languageCode: string;
    fieldLabel: string;
    helpText: string | null;
    model: string;
  }> {
    this.assertEnabled();
    const languageCode = input.languageCode?.trim();
    const fieldLabel = input.fieldLabel?.trim();
    if (!languageCode || !fieldLabel) {
      throw new BadRequestException("languageCode and fieldLabel are required");
    }

    const model = process.env.NEON_AI_GATEWAY_MODEL ?? "openai/gpt-4.1-mini";
    const system = [
      "Translate visitor check-in form UI copy.",
      'Return ONLY JSON: {"fieldLabel":string,"helpText":string|null}.',
      `Target language code: ${languageCode}.`,
      "Do not add PII. Keep labels short and operational.",
    ].join(" ");
    const user = JSON.stringify({
      fieldLabel,
      helpText: input.helpText ?? null,
    });
    const raw = await this.chatJson(model, system, user);
    return {
      languageCode,
      fieldLabel: typeof raw.fieldLabel === "string" ? raw.fieldLabel.trim() : fieldLabel,
      helpText: typeof raw.helpText === "string" ? raw.helpText.trim() : null,
      model,
    };
  }

  private assertEnabled(): void {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException(
        "Form AI is disabled. Set FORM_AI_ENABLED=true plus NEON_AI_GATEWAY_BASE_URL and NEON_AI_GATEWAY_API_KEY.",
      );
    }
  }

  private async chatJson(model: string, system: string, user: string): Promise<Record<string, unknown>> {
    const base = (process.env.NEON_AI_GATEWAY_BASE_URL ?? "").replace(/\/$/, "");
    const apiKey = process.env.NEON_AI_GATEWAY_API_KEY ?? "";
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: FORM_AI_MAX_TOKENS,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new ServiceUnavailableException(`Neon AI Gateway error ${res.status}: ${body.slice(0, 300)}`);
    }

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new ServiceUnavailableException("Neon AI Gateway returned an empty response");
    }

    try {
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      throw new ServiceUnavailableException("Neon AI Gateway returned non-JSON content");
    }
  }

  private sanitizeSuggestedFields(raw: unknown): SuggestedFormField[] {
    if (!Array.isArray(raw)) return [];
    const out: SuggestedFormField[] = [];
    for (const [index, item] of raw.entries()) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const fieldCode = typeof row.fieldCode === "string" ? row.fieldCode.trim() : "";
      const fieldLabel = typeof row.fieldLabel === "string" ? row.fieldLabel.trim() : "";
      const fieldTypeCode = typeof row.fieldTypeCode === "string" ? row.fieldTypeCode.trim() : "text";
      const dataClassificationCode =
        typeof row.dataClassificationCode === "string" ? row.dataClassificationCode.trim() : "basic";
      if (!/^[a-z][a-z0-9_]{1,63}$/.test(fieldCode) || !fieldLabel) continue;
      if (!ALLOWED_FIELD_TYPES.has(fieldTypeCode)) continue;
      if (!ALLOWED_CLASSIFICATIONS.has(dataClassificationCode)) continue;

      out.push({
        fieldCode,
        fieldLabel: fieldLabel.slice(0, 160),
        fieldTypeCode,
        helpText: typeof row.helpText === "string" ? row.helpText.slice(0, 500) : undefined,
        dataClassificationCode,
        required: Boolean(row.required),
        displayOrder:
          typeof row.displayOrder === "number" && Number.isFinite(row.displayOrder)
            ? Math.max(0, Math.floor(row.displayOrder))
            : index + 1,
        visibilityRule:
          row.visibilityRule && typeof row.visibilityRule === "object"
            ? (row.visibilityRule as Record<string, unknown>)
            : undefined,
        validationSchema:
          row.validationSchema && typeof row.validationSchema === "object"
            ? (row.validationSchema as Record<string, unknown>)
            : undefined,
      });
      if (out.length >= 24) break;
    }
    return out;
  }
}
