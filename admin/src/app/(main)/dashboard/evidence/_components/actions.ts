"use server";

import { api } from "@/lib/api/client";

export async function generateEvidencePack(): Promise<void> {
  await api.post("/evidence/generate");
}
