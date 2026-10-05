"use server";

import { revalidatePath } from "next/cache";

import { type ActionResult, failure, runAction } from "@/lib/actions/result";
import { api } from "@/lib/api/client";

export async function createSiteAction(input: { name: string; timezone?: string }): Promise<ActionResult> {
  const name = input.name.trim();
  if (name.length < 2) return failure("SITE_NAME_REQUIRED", "Site name is required.");
  return runAction("Could not create site.", async () => {
    await api.post("/sites", { name });
    revalidatePath("/dashboard/sites");
    revalidatePath("/dashboard/hosts");
    revalidatePath("/onboarding");
  });
}
