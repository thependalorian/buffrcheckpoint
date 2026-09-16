/**
 * NFR-P06 / §11.8.5 — strip visitor PII from crash payloads before leave-device.
 * Shared shape works for Sentry Event-like objects (extra, contexts, request data).
 */

const PII_KEY_PATTERN =
  /^(notes|photo|photo_reference|phone|phone_number|national_?id|full_?name|visitor_?name|email|message|recipient|contact_reference|visitor_reference)$/i;

export function scrubPiiValue(key: string, value: unknown): unknown {
  if (PII_KEY_PATTERN.test(key)) {
    return "[redacted]";
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => scrubPiiValue(String(index), item));
  }
  if (value && typeof value === "object") {
    return scrubPiiRecord(value as Record<string, unknown>);
  }
  return value;
}

export function scrubPiiRecord(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    out[key] = scrubPiiValue(key, value);
  }
  return out;
}

export function scrubPiiFromSentryEvent<T extends Record<string, unknown>>(event: T): T {
  const next = { ...event } as Record<string, unknown>;

  if (next.extra && typeof next.extra === "object") {
    next.extra = scrubPiiRecord(next.extra as Record<string, unknown>);
  }
  if (next.contexts && typeof next.contexts === "object") {
    next.contexts = scrubPiiRecord(next.contexts as Record<string, unknown>);
  }
  if (next.tags && typeof next.tags === "object") {
    next.tags = scrubPiiRecord(next.tags as Record<string, unknown>);
  }
  if (next.request && typeof next.request === "object") {
    const request = { ...(next.request as Record<string, unknown>) };
    if (request.data && typeof request.data === "object") {
      request.data = scrubPiiRecord(request.data as Record<string, unknown>);
    }
    if (typeof request.query_string === "string") {
      request.query_string = "[redacted]";
    }
    next.request = request;
  }

  return next as T;
}
