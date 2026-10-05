// Server actions return this instead of throwing: Next redacts thrown
// server-action messages in production, so users would only ever see a
// generic error instead of the API's real reason.
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; code: string; message: string };

interface ApiErrorBody {
  code?: unknown;
  message?: unknown;
  error?: unknown;
}

/** Reads `code` and `message` from the api client's "API error <status> on <path>: <json>" errors. */
export function apiError(err: unknown, fallback: string): { code: string; message: string } {
  if (!(err instanceof Error)) return { code: "UNKNOWN", message: fallback };
  const status = /API error (\d{3})/.exec(err.message)?.[1];
  const start = err.message.indexOf("{");
  if (start >= 0) {
    try {
      const body = JSON.parse(err.message.slice(start)) as ApiErrorBody;
      const nested =
        typeof body.message === "object" && body.message !== null ? (body.message as ApiErrorBody) : undefined;
      const message = [body.message, nested?.message, body.error].find((value) => typeof value === "string");
      const code = [body.code, nested?.code].find((value) => typeof value === "string");
      if (typeof message === "string") {
        return { code: typeof code === "string" ? code : `HTTP_${status ?? "ERROR"}`, message };
      }
    } catch {
      // Body was not JSON; fall back below.
    }
  }
  return { code: status ? `HTTP_${status}` : "UNKNOWN", message: fallback };
}

/** Back-compat for callers that only need the message text. */
export function apiMessage(err: unknown, fallback: string): string {
  return apiError(err, fallback).message;
}

export function failure(code: string, message: string): { ok: false; code: string; message: string } {
  return { ok: false, code, message };
}

/** Runs an action body and converts any thrown API error into a structured failure. */
export async function runAction<T>(fallback: string, run: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (err) {
    return { ok: false, ...apiError(err, fallback) };
  }
}

/** Client-side: turn a failed result back into an Error for form components that display thrown messages. */
export function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new Error(result.message);
  return result.data;
}
