"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";

export async function createSiteAction(input: { name: string; timezone?: string }) {
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Site name is required.");
  await api.post("/sites", {
    name,
  });
  revalidatePath("/dashboard/sites");
  revalidatePath("/dashboard/hosts");
}
