"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";
import { backendUrl } from "@/lib/auth/backend-url";
import { getCurrentUser } from "@/lib/auth/me";
import { getSessionToken } from "@/lib/auth/session";

export interface KybIssue {
  field: string;
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface KybDocumentView {
  id: string;
  documentType: string;
  documentTypeLabel: string;
  status: string;
  statusLabel: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
  reading: "not_applicable" | "reading" | "read" | "not_read";
  suggestions: Record<string, { value: string; confidence: string }>;
  members: Array<{ fullName: string; percentage: number | null }>;
}

export interface KybMemberValue {
  fullName: string;
  identityNumber?: string;
  percentage?: number;
}

export interface KybValues {
  entityType: string;
  businessRegistrationNumber: string;
  registeredBusinessName: string;
  registeredAddress: string;
  authorizedSignatoryName: string;
  principalBusiness?: string;
  financialYearEnd?: string;
  members?: KybMemberValue[];
  fieldSources?: Record<string, string>;
}

/** The API answers a refused request with JSON ({ message, issues }) after the status text. Pull it out for the form. */
function readFailure(error: unknown): { error: string; issues: KybIssue[] } {
  const text = error instanceof Error ? error.message : "Something went wrong";
  const start = text.indexOf("{");
  if (start >= 0) {
    try {
      const body = JSON.parse(text.slice(start)) as { message?: string | string[]; issues?: KybIssue[] };
      const message = Array.isArray(body.message) ? body.message.join(" ") : (body.message ?? text);
      return { error: message, issues: body.issues ?? [] };
    } catch {
      /* not JSON */
    }
  }
  return { error: text, issues: [] };
}

export async function validateKybAction(values: KybValues): Promise<{ issues: KybIssue[] }> {
  try {
    return { issues: (await api.post<{ issues: KybIssue[] }>("/platform/kyb/validate", values)).issues };
  } catch {
    return { issues: [] };
  }
}

export async function uploadKybDocumentAction(
  formData: FormData,
): Promise<{ document?: KybDocumentView; error?: string; issues?: KybIssue[] }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };
  const file = formData.get("file") as File | null;
  const documentType = String(formData.get("documentType") ?? "");
  if (!file || file.size === 0) return { error: "Choose a file to upload." };
  if (!documentType) return { error: "Choose what kind of document this is." };

  const token = await getSessionToken();
  const body = new FormData();
  body.append("documentType", documentType);
  body.append("file", file, file.name);
  const response = await fetch(backendUrl("/platform/kyb/documents"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
    cache: "no-store",
  });
  if (!response.ok) return readFailure(new Error(`API error ${response.status}: ${await response.text()}`));
  revalidatePath("/dashboard/kyb");
  return { document: (await response.json()) as KybDocumentView };
}

export async function listKybDocumentsAction(): Promise<KybDocumentView[]> {
  try {
    return await api.get<KybDocumentView[]>("/platform/kyb/documents/mine");
  } catch {
    return [];
  }
}

export async function removeKybDocumentAction(documentId: string): Promise<{ error?: string }> {
  try {
    await api.delete(`/platform/kyb/documents/${encodeURIComponent(documentId)}`);
    revalidatePath("/dashboard/kyb");
    return {};
  } catch (err) {
    return { error: readFailure(err).error };
  }
}

export async function submitKybAction(values: KybValues): Promise<{ error?: string; issues?: KybIssue[] }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };
  try {
    await api.post("/platform/kyb/submissions", values);
  } catch (err) {
    return readFailure(err);
  }
  revalidatePath("/dashboard/kyb");
  return {};
}
