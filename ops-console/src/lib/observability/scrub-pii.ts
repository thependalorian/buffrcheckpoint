const PII_KEY_PATTERN =
  /^(notes|photo|photo_reference|phone|phone_number|national_?id|full_?name|visitor_?name|email|message|recipient|contact_reference|visitor_reference)$/i;

// The ops console shows tenant-confidential data that is not visitor PII but
// must not leave for Sentry either: organisation names, revenue, KYB and
// support-session references.
const TENANT_KEY_PATTERN =
  /^(organisation_?name|legal_?name|trading_?name|org_?label|mrr|arr|revenue|amount|invoice_?number|kyb_?[a-z_]*|registration_?number|vat_?number|support_?session_?id|session_?token|bank_?[a-z_]*)$/i;

export function scrubPiiRecord(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (PII_KEY_PATTERN.test(key) || TENANT_KEY_PATTERN.test(key)) {
      out[key] = "[redacted]";
      continue;
    }
    if (Array.isArray(value)) {
      out[key] = value.map((item, index) =>
        item && typeof item === "object"
          ? scrubPiiRecord(item as Record<string, unknown>)
          : scrubPiiRecord({ [String(index)]: item })[String(index)],
      );
      continue;
    }
    if (value && typeof value === "object") {
      out[key] = scrubPiiRecord(value as Record<string, unknown>);
      continue;
    }
    out[key] = value;
  }
  return out;
}

export function scrubPiiFromSentryEvent<T extends Record<string, unknown>>(event: T): T {
  const next = { ...event } as Record<string, unknown>;
  if (next.extra && typeof next.extra === "object") {
    next.extra = scrubPiiRecord(next.extra as Record<string, unknown>);
  }
  if (next.request && typeof next.request === "object") {
    const request = { ...(next.request as Record<string, unknown>) };
    if (request.data && typeof request.data === "object") {
      request.data = scrubPiiRecord(request.data as Record<string, unknown>);
    }
    next.request = request;
  }
  return next as T;
}
