"use server";

import { revalidatePath } from "next/cache";

import { type ActionResult, failure, runAction } from "@/lib/actions/result";
import { api } from "@/lib/api/client";

export interface EmailPreference {
  templateCode: string;
  /** How the message is sent. Older API responses omit it, which means email. */
  channel?: "email" | "sms";
  trigger: string;
  audience: string;
  enabled: boolean;
}

/** Saves only what changed, so an unchanged email is never rewritten and the change log stays meaningful. */
export async function savePreferencesAction(
  changes: Array<{ templateCode: string; enabled: boolean }>,
): Promise<ActionResult<EmailPreference[]>> {
  if (changes.length === 0) return failure("NO_CHANGES", "Nothing to save.");
  return runAction("Could not save your choices.", async () => {
    const rows = await api.put<EmailPreference[]>("/notifications/preferences", { changes });
    revalidatePath("/dashboard/organisation/notifications");
    return rows;
  });
}
