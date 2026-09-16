"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";

export async function setDirectoryModeAction(modeCode: "custom" | "bian_aligned" | "hybrid") {
  await api.post("/organisation-directory/mode", { modeCode });
  revalidatePath("/dashboard/organisation-directory");
}

export async function seedBianTemplateAction() {
  await api.post("/organisation-directory/seed/bian-template", {});
  revalidatePath("/dashboard/organisation-directory");
  revalidatePath("/dashboard/hosts");
}

export async function seedCustomStarterAction() {
  await api.post("/organisation-directory/seed/custom-starter", {});
  revalidatePath("/dashboard/organisation-directory");
  revalidatePath("/dashboard/hosts");
}

export async function createDirectoryUnitAction(input: {
  parentId?: string | null;
  unitKindCode: string;
  bianAreaCode?: string | null;
  code: string;
  name: string;
  description?: string;
}) {
  const name = input.name.trim();
  const code = input.code.trim();
  if (name.length < 1) throw new Error("Name is required.");
  if (code.length < 1) throw new Error("Code is required.");
  await api.post("/organisation-directory/units", {
    parentId: input.parentId || undefined,
    unitKindCode: input.unitKindCode,
    bianAreaCode: input.bianAreaCode || undefined,
    code,
    name,
    description: input.description?.trim() || undefined,
  });
  revalidatePath("/dashboard/organisation-directory");
}

export async function archiveDirectoryUnitAction(unitId: string) {
  await api.patch(`/organisation-directory/units/${unitId}`, { archived: true });
  revalidatePath("/dashboard/organisation-directory");
}
