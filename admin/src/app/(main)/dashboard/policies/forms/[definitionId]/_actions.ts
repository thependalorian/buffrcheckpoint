"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";

function revalidateForm(definitionId: string) {
  revalidatePath(`/dashboard/policies/forms/${definitionId}`);
  revalidatePath("/dashboard/policies/forms");
}

export async function loadFormVersionAction(versionId: string) {
  return api.get<{
    id: string;
    approvalReference: string | null;
    fields: Array<Record<string, unknown>>;
  }>(`/visitor-policy/forms/versions/${versionId}`);
}

export async function listFormVersionsAction(definitionId: string) {
  return api.get<
    Array<{
      id: string;
      versionNumber: number;
      status?: string;
      approvalReference: string | null;
    }>
  >(`/visitor-policy/forms/${definitionId}/versions`);
}

export async function createDraftVersionAction(definitionId: string) {
  const created = await api.post<{ id: string }>(`/visitor-policy/forms/${definitionId}/versions`);
  revalidateForm(definitionId);
  return created;
}

export async function cloneVersionAction(definitionId: string, versionId: string) {
  const created = await api.post<{ id: string }>(`/visitor-policy/forms/versions/${versionId}/clone`);
  revalidateForm(definitionId);
  return created;
}

export async function addFormFieldAction(
  definitionId: string,
  versionId: string,
  body: Record<string, unknown>,
) {
  const created = await api.post(`/visitor-policy/forms/versions/${versionId}/fields`, body);
  revalidateForm(definitionId);
  return created;
}

export async function updateFormFieldAction(
  definitionId: string,
  fieldId: string,
  body: Record<string, unknown>,
) {
  const updated = await api.patch(`/visitor-policy/forms/fields/${fieldId}`, body);
  revalidateForm(definitionId);
  return updated;
}

export async function deleteFormFieldAction(definitionId: string, fieldId: string) {
  await api.delete(`/visitor-policy/forms/fields/${fieldId}`);
  revalidateForm(definitionId);
}

export async function reorderFormFieldsAction(
  definitionId: string,
  versionId: string,
  fieldIds: string[],
) {
  const result = await api.patch(`/visitor-policy/forms/versions/${versionId}/fields/reorder`, {
    fieldIds,
  });
  revalidateForm(definitionId);
  return result;
}

export async function upsertFieldTranslationAction(
  definitionId: string,
  fieldId: string,
  body: { languageCode: string; fieldLabel?: string; helpText?: string },
) {
  const result = await api.post(`/visitor-policy/forms/fields/${fieldId}/translations`, body);
  revalidateForm(definitionId);
  return result;
}

export async function publishFormVersionAction(
  definitionId: string,
  versionId: string,
  approvalReference?: string,
) {
  const result = await api.post(`/visitor-policy/forms/versions/${versionId}/publish`, {
    approvalReference: approvalReference || undefined,
  });
  revalidateForm(definitionId);
  return result;
}

export async function suggestFormFieldsAction(body: {
  visitorTypeCode: string;
  intentText: string;
  siteId?: string | null;
  existingFieldCodes?: string[];
}) {
  return api.post<{
    fields: Array<{
      fieldCode: string;
      fieldLabel: string;
      fieldTypeCode: string;
      helpText?: string;
      dataClassificationCode: string;
      required: boolean;
      displayOrder: number;
      visibilityRule?: Record<string, unknown>;
      validationSchema?: Record<string, unknown>;
    }>;
    warnings: string[];
    model: string;
  }>("/visitor-policy/forms/ai/suggest-fields", {
    visitorTypeCode: body.visitorTypeCode,
    intentText: body.intentText,
    siteId: body.siteId || undefined,
    existingFieldCodes: body.existingFieldCodes,
  });
}
