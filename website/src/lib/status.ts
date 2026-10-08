import { cache } from "react";

import { apiBaseUrl } from "@/lib/api";
import { ADMIN_REGISTER_URL } from "@/lib/copy/signup";

// The status page reads what is actually running. A service is "Operational" only when a request to it just succeeded; it is never a word
// typed into the page. A check that cannot be made is "Unavailable", not a quiet pass.

export type ServiceState = "operational" | "degraded" | "unavailable";

export interface ServiceRow {
  name: string;
  state: ServiceState;
  note: string;
}

export const STATE_LABEL: Record<ServiceState, string> = {
  operational: "Operational",
  degraded: "Degraded",
  unavailable: "Unavailable",
};

/** The API answers {status, database}: both "ok" is operational, an answer with a failing part is degraded, no answer is unavailable. */
export function classifyApiHealth(response: { ok: boolean; body?: { status?: string; database?: string } | null } | null): ServiceState {
  if (!response?.ok) return "unavailable";
  const { status, database } = response.body ?? {};
  if (status === "ok" && database === "ok") return "operational";
  return "degraded";
}

/** A page that answers (including a redirect to sign-in) is up; a server error is degraded; no answer is unavailable. */
export function classifyReachable(httpStatus: number | null): ServiceState {
  if (httpStatus === null) return "unavailable";
  if (httpStatus >= 500) return "degraded";
  return "operational";
}

async function probe(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { redirect: "manual", next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) });
    return res.status;
  } catch {
    return null;
  }
}

export const fetchServiceHealth = cache(async (): Promise<ServiceRow[]> => {
  let api: { ok: boolean; body?: { status?: string; database?: string } | null } | null = null;
  try {
    const res = await fetch(`${apiBaseUrl()}/health`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) });
    api = { ok: res.ok, body: res.ok ? ((await res.json()) as { status?: string; database?: string }) : null };
  } catch {
    api = null;
  }
  const adminStatus = await probe(new URL(ADMIN_REGISTER_URL).origin);
  return [
    {
      name: "Core API and database",
      state: classifyApiHealth(api),
      note: "Check-in, sign-out, host notifications and the records behind them.",
    },
    {
      name: "Customer admin",
      state: classifyReachable(adminStatus),
      note: "The dashboard for sites, devices, visitor records and settings.",
    },
  ];
});
