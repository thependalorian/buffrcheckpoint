import { redirect } from "next/navigation";

import { getSessionToken } from "./auth/session";

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    // DashboardErrorState / admin patterns parse `API error <status>`
    super(`API error ${status}: ${message}`);
    this.name = "ApiError";
  }
}

function nestMessage(body: string, fallback: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) return parsed.message.filter(Boolean).join(" ") || fallback;
    if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message;
  } catch {
    /* raw text */
  }
  return body.trim() || fallback;
}

/** Server-side fetch helper — attaches the platform_support session JWT as a Bearer token. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getSessionToken();
  const res = await fetch(`${BACKEND_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (res.status === 401) {
    redirect("/login");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, nestMessage(body, res.statusText));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Load helper for pages — never throw into a generic dead-end boundary. */
export async function loadOrError<T>(loader: () => Promise<T>): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    return { data: await loader(), error: null };
  } catch (err) {
    if (err instanceof ApiError) {
      return { data: null, error: err.message };
    }
    return { data: null, error: err instanceof Error ? err.message : "API error 500: unexpected failure" };
  }
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
