"use client";

import { useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiBaseUrl, friendlyError, newClientId } from "@/lib/api";
import { isFieldRequired, isFieldVisible } from "@/lib/form-rules";
import { AnalyticsEvents, track } from "@/lib/observability/track";

import { CheckInShell } from "./check-in-shell";

type HostOption = { id: string; displayName: string; department: string | null };
type CodeOption = { code: string; label: string };

type CheckInContext = {
  siteId: string;
  siteName: string;
  referenceId: string;
  label: string;
  hosts: HostOption[];
  purposeCategories: CodeOption[];
  visitorTypes: CodeOption[];
  privacyNoticeSummary: string;
};

type FormField = {
  fieldCode: string;
  fieldLabel: string;
  helpText?: string | null;
  fieldTypeCode?: string;
  required: boolean;
  displayOrder: number;
  visibilityRule?: Record<string, unknown>;
  validationSchema?: Record<string, unknown>;
};

/** Avoid "Email (optional) (optional)" when API labels already include optional. */
function fieldLabelWithOptional(label: string, required: boolean): string {
  const base = label.replace(/\s*\(optional\)\s*$/i, "").trim();
  return required ? base : `${base} (optional)`;
}

type EffectiveForm = {
  formVersionId: string;
  formName: string | null;
  visitorTypeCode: string;
  fields: FormField[];
};

type NextSteps = {
  headline: string;
  instruction: string;
  waitLocation: string;
  badgeRequired: boolean;
  badgeInstruction: string | null;
  queueNumber?: number | null;
  peopleAhead?: number | null;
  confirmationCode?: string | null;
};

type VisitorPass = {
  confirmationCode: string;
  title: string;
  visitorName: string;
  hostLine: string;
  siteName: string;
  badgeRequired: boolean;
  badgeInstruction: string | null;
  queueNumber: number | null;
  printHint: string;
};

type DoneState = {
  siteName: string;
  visitorName: string;
  hostDisplayName: string;
  hostDepartment: string | null;
  checkedInAt: string;
  visitId: string;
  nextSteps: NextSteps | null;
  visitorPass: VisitorPass | null;
};

type Props = {
  siteId: string;
  referenceId: string;
  initialLanguageCode?: string;
};

const CHECK_IN_LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "af", label: "Afrikaans" },
  { code: "pt", label: "Portuguese" },
];

export function CheckInForm({ siteId, referenceId, initialLanguageCode = "en" }: Props) {
  const [context, setContext] = useState<CheckInContext | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const [done, setDone] = useState<DoneState | null>(null);
  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [vehicleRegistration, setVehicleRegistration] = useState("");
  const [idDocumentNumber, setIdDocumentNumber] = useState("");
  const [hostId, setHostId] = useState("");
  const [visitorTypeCode, setVisitorTypeCode] = useState("general");
  const [purposeCategoryCode, setPurposeCategoryCode] = useState("");
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [effectiveForm, setEffectiveForm] = useState<EffectiveForm | null>(null);
  const [extraAnswers, _setExtraAnswers] = useState<Record<string, string>>({});
  const [fieldAnswers, setFieldAnswers] = useState<Record<string, string>>({});
  const [languageCode, setLanguageCode] = useState(() => {
    const code = initialLanguageCode.trim().toLowerCase();
    return CHECK_IN_LANGUAGES.some((l) => l.code === code) ? code : "en";
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const url = `${apiBaseUrl()}/public/check-in/context?site=${encodeURIComponent(siteId)}&ref=${encodeURIComponent(referenceId)}`;
        const res = await fetch(url);
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
          const message = Array.isArray(body?.message)
            ? body.message.join(", ")
            : body?.message || "This check-in link is not valid.";
          throw new Error(message);
        }
        const data = (await res.json()) as CheckInContext;
        if (cancelled) return;
        setContext(data);
        track(AnalyticsEvents.checkInStarted, {
          host_count: data.hosts.length,
        });
        // Do not auto-pick a host — visitor must choose who they are meeting.
        if (data.visitorTypes.find((t) => t.code === "general")) setVisitorTypeCode("general");
        else if (data.visitorTypes[0]) setVisitorTypeCode(data.visitorTypes[0].code);
        // Prefer meeting (demo published form options) over global business default —
        // business exists in type_definition but is often outside form field options.
        const purposeDefault =
          data.purposeCategories.find((p) => p.code === "meeting")?.code ??
          data.purposeCategories.find((p) => p.code === "business")?.code ??
          data.purposeCategories[0]?.code;
        if (purposeDefault) {
          setPurposeCategoryCode(purposeDefault);
          setFieldAnswers((prev) => ({ ...prev, purpose_category: purposeDefault }));
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(friendlyError(error, "Unable to load check-in."));
          track(AnalyticsEvents.checkInContextFailed);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [siteId, referenceId]);

  useEffect(() => {
    if (!context || !visitorTypeCode) return;
    let cancelled = false;
    async function loadForm() {
      try {
        const url =
          `${apiBaseUrl()}/public/check-in/form?site=${encodeURIComponent(siteId)}` +
          `&ref=${encodeURIComponent(referenceId)}&visitorTypeCode=${encodeURIComponent(visitorTypeCode)}` +
          `&languageCode=${encodeURIComponent(languageCode)}`;
        const res = await fetch(url);
        if (!res.ok) {
          // Context already loaded — use the built-in fallback fields; do not
          // hard-stop the whole check-in journey (E2E / bug-hunt P0).
          if (!cancelled) {
            setEffectiveForm(null);
          }
          return;
        }
        const data = (await res.json()) as EffectiveForm | null;
        if (!cancelled) {
          setEffectiveForm(data);
          if (data) {
            const purposeField = data.fields.find((f) => f.fieldCode === "purpose_category");
            const rawOptions = (purposeField?.validationSchema as { options?: unknown } | undefined)?.options;
            const optionCodes = Array.isArray(rawOptions)
              ? rawOptions
                  .map((o) => (typeof o === "string" ? o : String((o as { code?: string })?.code ?? "")))
                  .filter(Boolean)
              : [];
            if (optionCodes.length > 0) {
              setFieldAnswers((prev) => {
                const current = prev.purpose_category;
                if (current && optionCodes.includes(current)) return prev;
                const next = optionCodes.find((c) => c === "meeting") ?? optionCodes[0];
                setPurposeCategoryCode(next);
                return { ...prev, purpose_category: next };
              });
            }
            track(AnalyticsEvents.checkInFormLoaded, {
              visitor_type_code: data.visitorTypeCode,
              field_count: data.fields.length,
            });
          }
        }
      } catch {
        if (!cancelled) {
          setEffectiveForm(null);
        }
      }
    }
    void loadForm();
    return () => {
      cancelled = true;
    };
  }, [context, visitorTypeCode, siteId, referenceId, languageCode]);

  const selectedHost = context?.hosts.find((host) => host.id === hostId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context || submitting || done || submitLockRef.current) return;
    if (!privacyAcknowledged) {
      toast.error("Please acknowledge the privacy notice to continue.");
      return;
    }
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const answerMap: Record<string, string> = effectiveForm
        ? { ...fieldAnswers, host: fieldAnswers.host || selectedHost?.displayName || hostId }
        : {
            visitor_name: visitorName.trim(),
            visitor_phone: visitorPhone.trim(),
            company_name: companyName.trim(),
            visitor_email: visitorEmail.trim(),
            vehicle_registration: vehicleRegistration.trim(),
            id_document_number: idDocumentNumber.trim(),
            host: selectedHost?.displayName || hostId,
            purpose_category: purposeCategoryCode,
            ...extraAnswers,
          };

      if (effectiveForm) {
        for (const field of effectiveForm.fields) {
          if (!isFieldVisible(field.visibilityRule, answerMap)) continue;
          const required = isFieldRequired(field.required, field.validationSchema, answerMap);
          const value = (answerMap[field.fieldCode] ?? "").trim();
          if (required && !value) {
            throw new Error(`${field.fieldLabel} is required`);
          }
        }
      }

      const formAnswers =
        effectiveForm?.fields
          .filter((field) => isFieldVisible(field.visibilityRule, answerMap))
          .map((field) => ({
            formVersionId: effectiveForm.formVersionId,
            fieldCode: field.fieldCode,
            fieldLabelSnapshot: field.fieldLabel,
            answerValue: { value: answerMap[field.fieldCode] ?? "" },
          })) ?? undefined;

      const resolvedName = (answerMap.visitor_name || visitorName).trim();
      const resolvedPhone = (answerMap.visitor_phone || visitorPhone).trim();

      const res = await fetch(`${apiBaseUrl()}/public/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newClientId(),
          siteId: context.siteId,
          referenceId: context.referenceId,
          hostId,
          visitorName: resolvedName,
          visitorPhone: resolvedPhone,
          companyName: (answerMap.company_name || companyName).trim(),
          visitorEmail: (answerMap.visitor_email || visitorEmail).trim() || undefined,
          vehicleRegistration: (answerMap.vehicle_registration || vehicleRegistration).trim() || undefined,
          idDocumentNumber: (answerMap.id_document_number || idDocumentNumber).trim() || undefined,
          purposeCategoryCode: answerMap.purpose_category || purposeCategoryCode || undefined,
          visitorTypeCode,
          privacyAcknowledged: true,
          formAnswers,
          languageCode,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
        const message = Array.isArray(body?.message)
          ? body.message.join(", ")
          : body?.message || "Check-in failed. Please try again or see reception.";
        throw new Error(message);
      }
      const data = (await res.json()) as DoneState & {
        nextSteps?: NextSteps;
        hostDepartment?: string | null;
        visitId?: string;
        visitorPass?: VisitorPass | null;
        confirmationCode?: string;
      };
      const fallbackHost = selectedHost?.displayName || "your host";
      const hostName = data.hostDisplayName || fallbackHost;
      const hostDept = data.hostDepartment ?? selectedHost?.department ?? null;
      const firstName = (data.visitorName || visitorName.trim()).split(/\s+/)[0] || "Visitor";
      const confirmationCode =
        data.visitorPass?.confirmationCode ||
        data.confirmationCode ||
        data.nextSteps?.confirmationCode ||
        (data.visitId ? data.visitId.replace(/-/g, "").slice(0, 8).toUpperCase() : "");
      setDone({
        siteName: data.siteName,
        visitorName: data.visitorName || visitorName.trim(),
        hostDisplayName: hostName,
        hostDepartment: hostDept,
        checkedInAt: data.checkedInAt,
        visitId: data.visitId || "",
        visitorPass: data.visitorPass ?? {
          confirmationCode,
          title: ["contractor", "temporary_staff", "restricted_site"].includes(visitorTypeCode)
            ? "Visitor pass"
            : "Visit confirmation",
          visitorName: data.visitorName || visitorName.trim(),
          hostLine: hostDept ? `${hostName} · ${hostDept}` : hostName,
          siteName: data.siteName,
          badgeRequired: ["contractor", "temporary_staff", "restricted_site"].includes(visitorTypeCode),
          badgeInstruction: ["contractor", "temporary_staff", "restricted_site"].includes(visitorTypeCode)
            ? "Collect your visitor pass or temporary badge from reception before you leave the desk."
            : null,
          queueNumber: data.nextSteps?.queueNumber ?? null,
          printHint: "Show this screen at reception, or ask reception to print a temporary pass.",
        },
        nextSteps: data.nextSteps ?? {
          headline: `${firstName}, wait for ${hostName}`,
          instruction: `Please wait at reception. ${hostName}${hostDept ? ` (${hostDept})` : ""} has been notified and will come to meet you, or reception will call them.`,
          waitLocation: "reception",
          badgeRequired: ["contractor", "temporary_staff", "restricted_site"].includes(visitorTypeCode),
          badgeInstruction: ["contractor", "temporary_staff", "restricted_site"].includes(visitorTypeCode)
            ? "Collect your visitor pass or temporary badge from reception before you leave the desk."
            : null,
          confirmationCode,
        },
      });
      track(AnalyticsEvents.checkInCompleted, {
        visitor_type_code: visitorTypeCode,
        field_count: effectiveForm?.fields.length ?? 0,
        has_queue: Boolean(data.nextSteps?.queueNumber ?? data.visitorPass?.queueNumber),
        badge_required: ["contractor", "temporary_staff", "restricted_site"].includes(visitorTypeCode),
      });
      toast.success(`Checked in. Wait for ${hostName} at reception.`);
    } catch (error) {
      track(AnalyticsEvents.checkInFailed, { visitor_type_code: visitorTypeCode });
      toast.error(friendlyError(error, "Check-in failed."));
      submitLockRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <CheckInShell>
        <p className="text-sm text-muted-foreground">Loading check-in…</p>
      </CheckInShell>
    );
  }

  if (loadError || !context) {
    return (
      <CheckInShell>
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">Check-in unavailable</h1>
          <p className="text-sm text-muted-foreground">{loadError || "Unable to load check-in for this link."}</p>
          <p className="text-sm text-muted-foreground">
            Ask reception for a fresh public site QR, or scan the printed check-in QR for this location.
          </p>
        </div>
      </CheckInShell>
    );
  }

  if (done) {
    const steps = done.nextSteps;
    const hostLine = done.hostDepartment ? `${done.hostDisplayName} · ${done.hostDepartment}` : done.hostDisplayName;
    return (
      <CheckInShell>
        <div className="space-y-5">
          <div className="h-1.5 w-16 rounded-full bg-primary" aria-hidden />
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-sodium-yellow-ink)]">Checked in at {done.siteName}</p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl text-foreground">
              {steps?.headline || `Wait for ${done.hostDisplayName}`}
            </h2>
            <p className="text-base text-foreground">
              Meeting: <span className="font-medium">{hostLine}</span>
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {steps?.instruction ||
                `Please wait at reception. ${done.hostDisplayName} has been notified and will meet you here.`}
            </p>
          </div>
          {steps?.queueNumber != null ? (
            <div className="rounded-2xl border px-4 py-3 text-sm border-border bg-card text-foreground">
              <p className="font-medium">Queue ticket #{steps.queueNumber}</p>
              <p className="mt-1 text-muted-foreground">
                {steps.peopleAhead == null
                  ? "Wait at reception until your host or the receptionist calls you."
                  : steps.peopleAhead === 0
                    ? "You are next. Stay at reception."
                    : `${steps.peopleAhead} visitor${steps.peopleAhead === 1 ? "" : "s"} ahead of you.`}
              </p>
            </div>
          ) : null}
          {done.visitorPass ? (
            <div
              id="visitor-pass-card"
              className="rounded-2xl border px-4 py-4 text-sm print:border-black border-primary bg-card text-foreground"
            >
              <p className="text-xs uppercase tracking-wide text-[var(--color-sodium-yellow-ink)]">
                {done.visitorPass.title}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-widest">{done.visitorPass.confirmationCode}</p>
              <p className="mt-3 font-medium">{done.visitorPass.visitorName}</p>
              <p className="mt-1 text-muted-foreground">{done.visitorPass.hostLine}</p>
              <p className="mt-1 text-muted-foreground">{done.visitorPass.siteName}</p>
              {done.visitorPass.badgeRequired && done.visitorPass.badgeInstruction ? (
                <p className="mt-3 text-muted-foreground">{done.visitorPass.badgeInstruction}</p>
              ) : null}
              <p className="mt-3 text-xs print:hidden text-muted-foreground">{done.visitorPass.printHint}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 print:hidden"
                onClick={() => {
                  track(AnalyticsEvents.checkInPassPrinted, { visitor_type_code: visitorTypeCode });
                  window.print();
                }}
              >
                Print / save pass
              </Button>
            </div>
          ) : null}
          <p className="text-xs print:hidden text-muted-foreground">
            Stay at {steps?.waitLocation || "reception"} until your host arrives. If you need help, ask the
            receptionist. When you leave, use Sign out with the same phone number.
          </p>
          <a
            className="inline-block text-sm text-[var(--color-sodium-yellow-ink)] underline print:hidden"
            href={`/check-out?site=${encodeURIComponent(siteId)}&ref=${encodeURIComponent(referenceId)}`}
          >
            Sign out when you leave
          </a>
        </div>
      </CheckInShell>
    );
  }

  if (!context) return null;

  return (
    <CheckInShell privacyNoticeSummary={context.privacyNoticeSummary}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {selectedHost ? (
          <p className="rounded-md border border-border bg-card/70 px-3 py-2 text-sm text-muted-foreground">
            You will wait at reception for{" "}
            <span className="font-medium text-foreground">{selectedHost.displayName}</span>
            {selectedHost.department ? ` (${selectedHost.department})` : ""}. Reception will notify them.
          </p>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="languageCode">Language</Label>
          <select
            id="languageCode"
            name="languageCode"
            value={languageCode}
            onChange={(e) => setLanguageCode(e.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {CHECK_IN_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="visitorTypeCode">Visitor type</Label>
          <select
            id="visitorTypeCode"
            name="visitorTypeCode"
            value={visitorTypeCode}
            onChange={(e) => setVisitorTypeCode(e.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            required
          >
            {(context.visitorTypes.length > 0
              ? context.visitorTypes
              : [{ code: "general", label: "General visitor" }]
            ).map((type) => (
              <option key={type.code} value={type.code}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {effectiveForm ? (
          effectiveForm.fields
            .filter((field) => isFieldVisible(field.visibilityRule, fieldAnswers))
            .map((field) => {
              const required = isFieldRequired(field.required, field.validationSchema, fieldAnswers);
              const options = Array.isArray((field.validationSchema as { options?: string[] } | undefined)?.options)
                ? ((field.validationSchema as { options?: string[] }).options ?? [])
                : [];
              const value = fieldAnswers[field.fieldCode] ?? "";
              const setValue = (next: string) => setFieldAnswers((prev) => ({ ...prev, [field.fieldCode]: next }));

              if (field.fieldCode === "host") {
                return (
                  <div key={field.fieldCode} className="space-y-2">
                    <Label htmlFor="hostId">{fieldLabelWithOptional(field.fieldLabel, required)}</Label>
                    {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
                    {context.hosts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No hosts are configured for this site yet. Please see reception.
                      </p>
                    ) : (
                      <select
                        id="hostId"
                        name="hostId"
                        value={hostId}
                        onChange={(e) => {
                          setHostId(e.target.value);
                          const host = context.hosts.find((h) => h.id === e.target.value);
                          setValue(host?.displayName ?? e.target.value);
                        }}
                        className="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        required={required}
                      >
                        <option value="" disabled>
                          Select a person or department…
                        </option>
                        {context.hosts.map((host) => (
                          <option key={host.id} value={host.id}>
                            {host.displayName}
                            {host.department ? ` · ${host.department}` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              }

              if (field.fieldCode === "purpose_category" && context.purposeCategories.length > 0) {
                return (
                  <div key={field.fieldCode} className="space-y-2">
                    <Label htmlFor="purposeCategoryCode">{fieldLabelWithOptional(field.fieldLabel, required)}</Label>
                    <select
                      id="purposeCategoryCode"
                      name="purposeCategoryCode"
                      value={value || purposeCategoryCode}
                      onChange={(e) => {
                        setPurposeCategoryCode(e.target.value);
                        setValue(e.target.value);
                      }}
                      className="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      required={required}
                    >
                      {(options.length
                        ? options.map((code) => ({
                            code,
                            label: context.purposeCategories.find((p) => p.code === code)?.label ?? code,
                          }))
                        : context.purposeCategories
                      ).map((purpose) => (
                        <option key={purpose.code} value={purpose.code}>
                          {purpose.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (field.fieldTypeCode === "multiple_choice") {
                const selected = new Set(
                  value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                );
                return (
                  <fieldset key={field.fieldCode} className="space-y-2">
                    <legend className="text-sm font-medium leading-none">
                      {fieldLabelWithOptional(field.fieldLabel, required)}
                    </legend>
                    {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
                    <div className="space-y-2 rounded-md border border-input bg-card px-3 py-2">
                      {options.map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selected.has(opt)}
                            onChange={(e) => {
                              const next = new Set(selected);
                              if (e.target.checked) next.add(opt);
                              else next.delete(opt);
                              setValue([...next].join(","));
                            }}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                );
              }

              if (field.fieldTypeCode === "single_choice" || options.length > 0) {
                return (
                  <div key={field.fieldCode} className="space-y-2">
                    <Label htmlFor={`field-${field.fieldCode}`}>
                      {fieldLabelWithOptional(field.fieldLabel, required)}
                    </Label>
                    {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
                    <select
                      id={`field-${field.fieldCode}`}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                      required={required}
                    >
                      <option value="">Select…</option>
                      {options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (field.fieldTypeCode === "boolean") {
                return (
                  <label key={field.fieldCode} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={value === "true"}
                      onChange={(e) => setValue(e.target.checked ? "true" : "false")}
                      required={required}
                    />
                    {field.fieldLabel}
                  </label>
                );
              }

              const inputType =
                field.fieldTypeCode === "email"
                  ? "email"
                  : field.fieldTypeCode === "phone"
                    ? "tel"
                    : field.fieldTypeCode === "date"
                      ? "date"
                      : "text";

              return (
                <div key={field.fieldCode} className="space-y-2">
                  <Label htmlFor={`field-${field.fieldCode}`}>
                    {fieldLabelWithOptional(field.fieldLabel, required)}
                  </Label>
                  {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
                  {field.fieldTypeCode === "textarea" ? (
                    <textarea
                      id={`field-${field.fieldCode}`}
                      className="min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      required={required}
                    />
                  ) : (
                    <Input
                      id={`field-${field.fieldCode}`}
                      type={inputType}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      required={required}
                      maxLength={200}
                    />
                  )}
                </div>
              );
            })
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="visitorName">Full name</Label>
              <Input
                id="visitorName"
                name="visitorName"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                autoComplete="name"
                required
                minLength={2}
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visitorPhone">Mobile phone</Label>
              <Input
                id="visitorPhone"
                name="visitorPhone"
                type="tel"
                value={visitorPhone}
                onChange={(e) => setVisitorPhone(e.target.value)}
                autoComplete="tel"
                required
                minLength={7}
                maxLength={40}
                placeholder="+264…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company / organisation</Label>
              <Input
                id="companyName"
                name="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                autoComplete="organization"
                required
                minLength={2}
                maxLength={160}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visitorEmail">Work email (optional)</Label>
              <Input
                id="visitorEmail"
                name="visitorEmail"
                type="email"
                value={visitorEmail}
                onChange={(e) => setVisitorEmail(e.target.value)}
                autoComplete="email"
                maxLength={160}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="idDocumentNumber">ID / passport number (optional)</Label>
                <Input
                  id="idDocumentNumber"
                  name="idDocumentNumber"
                  value={idDocumentNumber}
                  onChange={(e) => setIdDocumentNumber(e.target.value)}
                  autoComplete="off"
                  maxLength={64}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleRegistration">Vehicle registration (optional)</Label>
                <Input
                  id="vehicleRegistration"
                  name="vehicleRegistration"
                  value={vehicleRegistration}
                  onChange={(e) => setVehicleRegistration(e.target.value)}
                  autoComplete="off"
                  maxLength={40}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hostId">Who are you visiting?</Label>
              {context.hosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hosts are configured for this site yet. Please see reception.
                </p>
              ) : (
                <select
                  id="hostId"
                  name="hostId"
                  value={hostId}
                  onChange={(e) => setHostId(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                >
                  <option value="" disabled>
                    Select a person or department…
                  </option>
                  {context.hosts.map((host) => (
                    <option key={host.id} value={host.id}>
                      {host.displayName}
                      {host.department ? ` · ${host.department}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {context.purposeCategories.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="purposeCategoryCode">Purpose of visit</Label>
                <select
                  id="purposeCategoryCode"
                  name="purposeCategoryCode"
                  value={purposeCategoryCode}
                  onChange={(e) => setPurposeCategoryCode(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                >
                  {context.purposeCategories.map((purpose) => (
                    <option key={purpose.code} value={purpose.code}>
                      {purpose.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </>
        )}

        <label className="flex items-start gap-3 rounded-md border border-border bg-card/70 p-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={privacyAcknowledged}
            onChange={(e) => setPrivacyAcknowledged(e.target.checked)}
            required
          />
          <span className="text-muted-foreground">{context.privacyNoticeSummary}</span>
        </label>

        <Button
          type="submit"
          className="w-full"
          disabled={submitting || Boolean(done) || context.hosts.length === 0 || !hostId || !privacyAcknowledged}
        >
          {submitting ? "Checking in…" : "Check in"}
        </Button>
      </form>
    </CheckInShell>
  );
}
