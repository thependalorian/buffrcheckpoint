"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";

export async function createHostAction(input: {
  siteId: string;
  name: string;
  department?: string;
  contactReference?: string;
  organisationUnitId?: string;
}) {
  const name = input.name.trim();
  if (!input.siteId) throw new Error("Select a site.");
  if (name.length < 2) throw new Error("Host name is required.");
  await api.post("/hosts", {
    siteId: input.siteId,
    name,
    department: input.department?.trim() || undefined,
    contactReference: input.contactReference?.trim() || undefined,
    organisationUnitId: input.organisationUnitId?.trim() || undefined,
  });
  revalidatePath("/dashboard/hosts");
}
