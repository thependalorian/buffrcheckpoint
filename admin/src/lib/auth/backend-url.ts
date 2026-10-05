// Server-side only — the admin app's Route Handlers, server components and
// proxy call the NestJS API directly (server-to-server), never from the
// browser, so no CORS configuration on the backend is needed for auth.
// One resolution order for every caller; BACKEND_API_URL is canonical,
// API_URL / NEXT_PUBLIC_API_URL are accepted for older deployments.
// Defaults to the backend's own default port (backend/src/main.ts: PORT ?? 3001).
export function backendBaseUrl(): string {
  const base =
    process.env.BACKEND_API_URL ?? process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  return base.replace(/\/$/, "");
}

export function backendUrl(path: string): string {
  return `${backendBaseUrl()}${path}`;
}
