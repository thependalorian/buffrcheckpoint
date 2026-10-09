"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formBuilderCopy, needsPurposeNote, purposeNoteIsValid } from "@/lib/copy/form-builder";

import {
  addFormFieldAction,
  cloneVersionAction,
  createDraftVersionAction,
  deleteFormFieldAction,
  listFormVersionsAction,
  loadFormVersionAction,
  publishFormVersionAction,
  reorderFormFieldsAction,
  suggestFormFieldsAction,
  updateFormFieldAction,
  upsertFieldTranslationAction,
} from "../_actions";

type Library = {
  fieldCodes: Array<{ code: string; label: string }>;
  fieldTypes: Array<{ code: string; label: string }>;
  fieldClasses: Array<{ code: string; label: string }>;
  languages: Array<{ code: string; label: string }>;
};

type FormVersion = {
  id: string;
  versionNumber: number;
  status?: string;
  statusCode?: string;
  approvalReference: string | null;
};

type FieldTranslation = {
  id?: string;
  languageCode: string;
  fieldLabel: string | null;
  helpText: string | null;
};

type FormField = {
  id: string;
  fieldCode: string;
  fieldLabel: string | null;
  helpText: string | null;
  purposeNote?: string | null;
  fieldTypeCode: string;
  dataClassificationCode: string;
  required: boolean;
  displayOrder: number;
  visibilityRule: Record<string, unknown>;
  validationSchema: Record<string, unknown>;
  translations?: FieldTranslation[];
};

type Definition = { id: string; formName: string | null; siteId: string | null };

function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function SortableFieldRow({
  field,
  index,
  selected,
  disabled,
  onSelect,
}: {
  field: FormField;
  index: number;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const { ref, handleRef, isDragging } = useSortable({ id: field.id, index, disabled });
  return (
    <li
      ref={ref}
      className={`flex items-center gap-2 rounded-md border px-2 py-2 text-sm ${
        selected ? "border-primary bg-muted/40" : "bg-card"
      } ${isDragging ? "opacity-60" : ""}`}
    >
      <button
        type="button"
        ref={handleRef}
        className="cursor-grab px-1 text-muted-foreground disabled:cursor-not-allowed"
        disabled={disabled}
        aria-label="Drag to reorder"
      >
        ::
      </button>
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onSelect}>
        <div className="truncate font-medium">{field.fieldLabel?.trim() || field.fieldCode}</div>
        <div className="truncate text-xs text-muted-foreground">
          {field.fieldCode} · {field.fieldTypeCode} · {field.dataClassificationCode}
          {field.required ? " · required" : ""}
        </div>
      </button>
    </li>
  );
}

export function FormBuilder({
  definition,
  initialVersions,
  library,
}: {
  definition: Definition;
  initialVersions: FormVersion[];
  library: Library;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState(initialVersions);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(initialVersions[0]?.id ?? null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [approvalReference, setApprovalReference] = useState("");
  const [libraryCode, setLibraryCode] = useState(library.fieldCodes[0]?.code ?? "visitor_name");
  const [customCode, setCustomCode] = useState("");
  const [aiIntent, setAiIntent] = useState("");
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);

  const activeVersion = versions.find((v) => v.id === activeVersionId) ?? null;
  const isDraft = (activeVersion?.status ?? "") === "draft";
  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;

  const needsJustification = useMemo(
    () =>
      fields.some(
        (f) => f.dataClassificationCode === "high_risk" || f.dataClassificationCode === "verification_evidence",
      ),
    [fields],
  );

  const loadVersion = useCallback(async (versionId: string) => {
    const data = await loadFormVersionAction(versionId);
    const loaded = (data.fields ?? []) as unknown as FormField[];
    setFields(loaded);
    setApprovalReference(data.approvalReference ?? "");
    setSelectedFieldId(loaded[0]?.id ?? null);
  }, []);

  useEffect(() => {
    if (!activeVersionId) return;
    startTransition(async () => {
      try {
        setError(null);
        await loadVersion(activeVersionId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load version");
      }
    });
  }, [activeVersionId, loadVersion]);

  async function refreshVersions(selectId?: string) {
    const rows = await listFormVersionsAction(definition.id);
    setVersions(rows);
    if (selectId) setActiveVersionId(selectId);
  }

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        setError(null);
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      }
    });
  }

  const updateSelected = (patch: Partial<FormField>) => {
    if (!selectedField) return;
    const next = { ...selectedField, ...patch };
    setFields((prev) => prev.map((f) => (f.id === next.id ? next : f)));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr_320px]">
      <aside className="space-y-3 rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Versions</h2>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const created = await createDraftVersionAction(definition.id);
                await refreshVersions(created.id);
              })
            }
          >
            New draft
          </Button>
        </div>
        <ul className="space-y-1">
          {versions.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                  v.id === activeVersionId ? "bg-muted font-medium" : "hover:bg-muted/50"
                }`}
                onClick={() => setActiveVersionId(v.id)}
              >
                v{v.versionNumber} · {v.status ?? "?"}
              </button>
            </li>
          ))}
        </ul>
        {activeVersion && (activeVersion.status === "published" || activeVersion.status === "archived") ? (
          <Button
            size="sm"
            className="w-full"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const cloned = await cloneVersionAction(definition.id, activeVersion.id);
                await refreshVersions(cloned.id);
              })
            }
          >
            Clone to draft
          </Button>
        ) : null}
      </aside>

      <section className="space-y-4 rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium">Fields</h2>
          <span className="text-xs text-muted-foreground">
            {isDraft ? "Drag to reorder · draft editable" : "Read-only published/archived version"}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            {isDraft ? (
              <>
                <select
                  className="h-9 rounded-md border px-2 text-sm"
                  value={libraryCode}
                  onChange={(e) => setLibraryCode(e.target.value)}
                >
                  {library.fieldCodes.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      if (!activeVersionId) return;
                      const meta = library.fieldCodes.find((c) => c.code === libraryCode);
                      await addFormFieldAction(definition.id, activeVersionId, {
                        fieldCode: libraryCode,
                        fieldLabel: meta?.label ?? libraryCode,
                        fieldTypeCode:
                          libraryCode === "visitor_phone"
                            ? "phone"
                            : libraryCode === "visitor_email"
                              ? "email"
                              : libraryCode === "purpose_category"
                                ? "single_choice"
                                : "text",
                        dataClassificationCode: libraryCode.startsWith("id_")
                          ? "sensitive"
                          : libraryCode === "visitor_name" || libraryCode === "visitor_phone" || libraryCode === "host"
                            ? "core"
                            : "basic",
                        required: ["visitor_name", "visitor_phone", "host"].includes(libraryCode),
                        displayOrder: fields.length,
                        validationSchema:
                          libraryCode === "purpose_category"
                            ? { options: ["meeting", "delivery", "interview", "vehicle", "other"] }
                            : {},
                      });
                      await loadVersion(activeVersionId);
                    })
                  }
                >
                  Add from library
                </Button>
                <Input
                  className="h-9 w-40"
                  placeholder="custom_slug"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending || !customCode.trim()}
                  onClick={() =>
                    run(async () => {
                      if (!activeVersionId) return;
                      const code = customCode.trim().startsWith("custom_")
                        ? customCode.trim()
                        : `custom_${customCode.trim()}`;
                      await addFormFieldAction(definition.id, activeVersionId, {
                        fieldCode: code,
                        fieldLabel: code,
                        fieldTypeCode: "text",
                        dataClassificationCode: "basic",
                        required: false,
                        displayOrder: fields.length,
                      });
                      setCustomCode("");
                      await loadVersion(activeVersionId);
                    })
                  }
                >
                  Add custom
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {isDraft ? (
          <div className="space-y-2 rounded-md border border-dashed p-3">
            <Label htmlFor="ai-intent">Suggest from description</Label>
            <p className="text-muted-foreground text-xs">
              Admin intent only — do not paste visitor PII. Review every suggested field before publishing. Requires
              FORM_AI_ENABLED and Neon AI Gateway credentials on the API.
            </p>
            <Textarea
              id="ai-intent"
              rows={3}
              value={aiIntent}
              onChange={(e) => setAiIntent(e.target.value)}
              placeholder="Contractor needs company name, safety induction acknowledgement, and vehicle registration if driving."
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={pending || aiIntent.trim().length < 8 || !activeVersionId}
              onClick={() =>
                run(async () => {
                  if (!activeVersionId) return;
                  setAiWarnings([]);
                  const suggestion = await suggestFormFieldsAction({
                    visitorTypeCode: "general",
                    intentText: aiIntent.trim(),
                    siteId: definition.siteId,
                    existingFieldCodes: fields.map((f) => f.fieldCode),
                  });
                  setAiWarnings(suggestion.warnings ?? []);
                  for (const field of suggestion.fields) {
                    if (fields.some((f) => f.fieldCode === field.fieldCode)) continue;
                    await addFormFieldAction(definition.id, activeVersionId, {
                      fieldCode: field.fieldCode,
                      fieldLabel: field.fieldLabel,
                      fieldTypeCode: field.fieldTypeCode,
                      helpText: field.helpText,
                      dataClassificationCode: field.dataClassificationCode,
                      required: field.required,
                      displayOrder: fields.length + field.displayOrder,
                      visibilityRule: field.visibilityRule ?? {},
                      validationSchema: field.validationSchema ?? {},
                    });
                  }
                  await loadVersion(activeVersionId);
                })
              }
            >
              Suggest fields
            </Button>
            {aiWarnings.length > 0 ? (
              <ul className="list-disc space-y-1 pl-4 text-warning-ink text-xs">
                {aiWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <DragDropProvider
          onDragEnd={(event) => {
            if (!isDraft || !activeVersionId || event.canceled) return;
            const { source, target } = event.operation;
            if (!source || !target || source.id === target.id) return;
            const from = fields.findIndex((f) => f.id === String(source.id));
            const to = fields.findIndex((f) => f.id === String(target.id));
            if (from < 0 || to < 0) return;
            const next = moveItem(fields, from, to);
            setFields(next);
            run(async () => {
              await reorderFormFieldsAction(
                definition.id,
                activeVersionId,
                next.map((f) => f.id),
              );
            });
          }}
        >
          <ul className="space-y-2">
            {fields.map((field, index) => (
              <SortableFieldRow
                key={field.id}
                field={field}
                index={index}
                selected={field.id === selectedFieldId}
                disabled={!isDraft || pending}
                onSelect={() => setSelectedFieldId(field.id)}
              />
            ))}
          </ul>
        </DragDropProvider>

        {isDraft ? (
          <div className="space-y-3 border-t pt-4">
            <Label htmlFor="approvalReference">Publish justification (required for high-risk fields)</Label>
            <Textarea
              id="approvalReference"
              value={approvalReference}
              onChange={(e) => setApprovalReference(e.target.value)}
              placeholder="Document why sensitive fields are collected"
            />
            <Button
              disabled={pending || !activeVersionId || (needsJustification && !approvalReference.trim())}
              onClick={() =>
                run(async () => {
                  if (!activeVersionId) return;
                  await publishFormVersionAction(definition.id, activeVersionId, approvalReference.trim() || undefined);
                  await refreshVersions(activeVersionId);
                  await loadVersion(activeVersionId);
                })
              }
            >
              Publish version
            </Button>
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </section>

      <aside className="space-y-4 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Field settings</h2>
        {!selectedField ? (
          <p className="text-sm text-muted-foreground">Select a field to edit.</p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Code</Label>
              <Input value={selectedField.fieldCode} disabled />
            </div>
            <div className="space-y-1">
              <Label>Label</Label>
              <Input
                value={selectedField.fieldLabel ?? ""}
                disabled={!isDraft || pending}
                onChange={(e) => updateSelected({ fieldLabel: e.target.value })}
                onBlur={() => {
                  if (!isDraft) return;
                  run(async () => {
                    await updateFormFieldAction(definition.id, selectedField.id, {
                      fieldLabel: selectedField.fieldLabel,
                    });
                  });
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>Help text</Label>
              <Input
                value={selectedField.helpText ?? ""}
                disabled={!isDraft || pending}
                onChange={(e) => updateSelected({ helpText: e.target.value })}
                onBlur={() => {
                  if (!isDraft) return;
                  run(async () => {
                    await updateFormFieldAction(definition.id, selectedField.id, {
                      helpText: selectedField.helpText,
                    });
                  });
                }}
              />
            </div>
            {needsPurposeNote(selectedField.dataClassificationCode) ? (
              <div className="space-y-1">
                <Label>{formBuilderCopy.purposeNote.label}</Label>
                <Input
                  value={selectedField.purposeNote ?? ""}
                  placeholder={formBuilderCopy.purposeNote.placeholder}
                  disabled={!isDraft || pending}
                  onChange={(e) => updateSelected({ purposeNote: e.target.value })}
                  onBlur={() => {
                    if (!isDraft) return;
                    run(async () => {
                      await updateFormFieldAction(definition.id, selectedField.id, {
                        purposeNote: selectedField.purposeNote ?? "",
                      });
                    });
                  }}
                />
                {!purposeNoteIsValid(selectedField.purposeNote) ? (
                  <p className="text-xs text-warning-ink">{formBuilderCopy.purposeNote.required}</p>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-1">
              <Label>Type</Label>
              <select
                className="flex h-9 w-full rounded-md border px-2 text-sm"
                disabled={!isDraft || pending}
                value={selectedField.fieldTypeCode}
                onChange={(e) => {
                  const fieldTypeCode = e.target.value;
                  updateSelected({ fieldTypeCode });
                  run(async () => {
                    await updateFormFieldAction(definition.id, selectedField.id, { fieldTypeCode });
                  });
                }}
              >
                {library.fieldTypes.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Classification</Label>
              <select
                className="flex h-9 w-full rounded-md border px-2 text-sm"
                disabled={!isDraft || pending}
                value={selectedField.dataClassificationCode}
                onChange={(e) => {
                  const dataClassificationCode = e.target.value;
                  updateSelected({ dataClassificationCode });
                  run(async () => {
                    await updateFormFieldAction(definition.id, selectedField.id, {
                      dataClassificationCode,
                    });
                  });
                }}
              >
                {library.fieldClasses.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              {selectedField.dataClassificationCode === "high_risk" ||
              selectedField.dataClassificationCode === "verification_evidence" ? (
                <p className="text-xs text-warning-ink">
                  High-risk field: publish will require a documented justification.
                </p>
              ) : null}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedField.required}
                disabled={!isDraft || pending}
                onChange={(e) => {
                  const required = e.target.checked;
                  updateSelected({ required });
                  run(async () => {
                    await updateFormFieldAction(definition.id, selectedField.id, { required });
                  });
                }}
              />
              Required
            </label>
            <div className="space-y-1">
              <Label>Show when (field equals)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="fieldCode"
                  disabled={!isDraft || pending}
                  defaultValue={
                    ((selectedField.visibilityRule as { conditions?: Array<{ fieldCode?: string }> })?.conditions?.[0]
                      ?.fieldCode as string) ?? ""
                  }
                  id={`vis-code-${selectedField.id}`}
                />
                <Input
                  placeholder="value"
                  disabled={!isDraft || pending}
                  defaultValue={
                    ((selectedField.visibilityRule as { conditions?: Array<{ equals?: string }> })?.conditions?.[0]
                      ?.equals as string) ?? ""
                  }
                  id={`vis-eq-${selectedField.id}`}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!isDraft || pending}
                onClick={() => {
                  const codeEl = document.getElementById(`vis-code-${selectedField.id}`) as HTMLInputElement | null;
                  const eqEl = document.getElementById(`vis-eq-${selectedField.id}`) as HTMLInputElement | null;
                  const fieldCode = codeEl?.value.trim() ?? "";
                  const equals = eqEl?.value.trim() ?? "";
                  const visibilityRule = fieldCode && equals ? { op: "and", conditions: [{ fieldCode, equals }] } : {};
                  updateSelected({ visibilityRule });
                  run(async () => {
                    await updateFormFieldAction(definition.id, selectedField.id, {
                      visibilityRule,
                    });
                  });
                }}
              >
                Save visibility
              </Button>
            </div>
            <div className="space-y-1">
              <Label>Choice options (comma-separated)</Label>
              <Input
                disabled={!isDraft || pending}
                defaultValue={
                  Array.isArray((selectedField.validationSchema as { options?: string[] }).options)
                    ? ((selectedField.validationSchema as { options?: string[] }).options ?? []).join(", ")
                    : ""
                }
                id={`opts-${selectedField.id}`}
                onBlur={() => {
                  if (!isDraft) return;
                  const el = document.getElementById(`opts-${selectedField.id}`) as HTMLInputElement | null;
                  const options = (el?.value ?? "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  const validationSchema = {
                    ...(selectedField.validationSchema ?? {}),
                    ...(options.length ? { options } : { options: undefined }),
                  };
                  updateSelected({ validationSchema });
                  run(async () => {
                    await updateFormFieldAction(definition.id, selectedField.id, {
                      validationSchema,
                    });
                  });
                }}
              />
            </div>
            <div className="space-y-2 border-t pt-3">
              <Label>Translations</Label>
              {library.languages.map((lang) => {
                const existing = selectedField.translations?.find((t) => t.languageCode === lang.code);
                return (
                  <div key={lang.code} className="space-y-1 rounded-md border p-2">
                    <div className="text-xs font-medium">{lang.label}</div>
                    <Input
                      placeholder="Label"
                      disabled={!isDraft || pending}
                      defaultValue={existing?.fieldLabel ?? ""}
                      id={`tr-label-${selectedField.id}-${lang.code}`}
                    />
                    <Input
                      placeholder="Help text"
                      disabled={!isDraft || pending}
                      defaultValue={existing?.helpText ?? ""}
                      id={`tr-help-${selectedField.id}-${lang.code}`}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!isDraft || pending}
                      onClick={() => {
                        const label = (
                          document.getElementById(
                            `tr-label-${selectedField.id}-${lang.code}`,
                          ) as HTMLInputElement | null
                        )?.value;
                        const help = (
                          document.getElementById(`tr-help-${selectedField.id}-${lang.code}`) as HTMLInputElement | null
                        )?.value;
                        run(async () => {
                          await upsertFieldTranslationAction(definition.id, selectedField.id, {
                            languageCode: lang.code,
                            fieldLabel: label,
                            helpText: help,
                          });
                          if (activeVersionId) await loadVersion(activeVersionId);
                        });
                      }}
                    >
                      Save {lang.code}
                    </Button>
                  </div>
                );
              })}
            </div>
            {isDraft ? (
              <Button
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    await deleteFormFieldAction(definition.id, selectedField.id);
                    if (activeVersionId) await loadVersion(activeVersionId);
                  })
                }
              >
                Remove field
              </Button>
            ) : null}
          </div>
        )}
      </aside>
    </div>
  );
}
