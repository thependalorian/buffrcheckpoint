// Server-side only — the admin app's Route Handlers call the NestJS API
// directly (server-to-server), never from the browser, so no CORS
// configuration on the backend is needed for auth. Defaults to the
// backend's own default port (backend/src/main.ts: PORT ?? 3001).
export function backendUrl(path: string): string {
  const base = process.env.BACKEND_API_URL ?? "http://localhost:3001";
  return `${base.replace(/\/$/, "")}${path}`;
}
