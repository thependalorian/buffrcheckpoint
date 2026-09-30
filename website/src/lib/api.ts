const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:3001" : "https://api.buffrcheckpoint.com")
).replace(/\/$/, "");

function resolvedApiBase(): string {
  const isLocal = !API_BASE || API_BASE.includes("localhost") || API_BASE.includes("127.0.0.1");
  if (process.env.NODE_ENV !== "development" && isLocal) {
    return "https://api.buffrcheckpoint.com";
  }
  return API_BASE || "http://localhost:3001";
}

export function apiBaseUrl(): string {
  return resolvedApiBase();
}

export async function publicFetch<T>(
  path: string,
  init?: RequestInit & { revalidateSeconds?: number },
): Promise<T | null> {
  const { revalidateSeconds, ...rest } = init ?? {};
  try {
    const res = await fetch(`${resolvedApiBase()}${path}`, {
      ...rest,
      next: revalidateSeconds ? { revalidate: revalidateSeconds } : undefined,
      signal: rest.signal ?? AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function newClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
