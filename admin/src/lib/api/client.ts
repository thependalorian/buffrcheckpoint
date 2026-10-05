import { backendUrl } from "@/lib/auth/backend-url";
import { getRequestId } from "@/lib/auth/me";
import { getSessionToken } from "@/lib/auth/session";
import { REQUEST_ID_HEADER } from "@/lib/auth/session-gate";

// Server-only typed client for every dashboard page's data fetch.
// Previously this read NEXT_PUBLIC_API_URL and sent no auth header — wrong
// for this app's own documented pattern: the admin app never calls the
// backend from the browser, and every backend route requires the session
// JWT as a Bearer token (see lib/auth/me.ts, which established this
// pattern correctly). This client now follows that same pattern so every
// dashboard page can use one typed client instead of hand-rolling fetch +
// auth-header plumbing per page.
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const [token, requestId] = await Promise.all([getSessionToken(), getRequestId()]);
  const url = backendUrl(path);

  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(requestId ? { [REQUEST_ID_HEADER]: requestId } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status} on ${path}: ${text}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "DELETE", body: body === undefined ? undefined : JSON.stringify(body) }),
};
