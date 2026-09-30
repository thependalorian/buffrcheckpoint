"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";

/** Pull the API's `message` out of "API error <status> on <path>: <json>" so the sheet shows it. */
function apiMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const json = err.message.slice(err.message.indexOf("{"));
  try {
    const body = JSON.parse(json) as { message?: unknown };
    if (typeof body.message === "string") return body.message;
  } catch {
    // not JSON; fall through
  }
  return fallback;
}

// Returns the error instead of throwing: Next redacts thrown server-action messages in production,
// and the site-licence limit message must reach the admin.
export async function createSiteAction(input: { name: string; timezone?: string }): Promise<{ ok: true } | { error: string }> {
  const name = input.name.trim();
  if (name.length < 2) return { error: "Site name is required." };
  try {
    await api.post("/sites", { name });
  } catch (err) {
    return { error: apiMessage(err, "Could not create site.") };
  }
  revalidatePath("/dashboard/sites");
  revalidatePath("/dashboard/hosts");
  return { ok: true };
}
