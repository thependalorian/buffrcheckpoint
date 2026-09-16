"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiBaseUrl, newClientId } from "@/lib/api";
import { AnalyticsEvents, track } from "@/lib/observability/track";

import { CheckInBrandedShell, type CheckInBranding } from "./check-in-branded-shell";

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
  branding: CheckInBranding | null;
};

type FormField = {
  fieldCode: string;
  fieldLabel: string;
  required: boolean;
  displayOrder: number;
};

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
  organisationDisplayName: string | null;
  welcomeMessage: string | null;
  brandColourToken: string | null;
  checkedInAt: string;
  visitId: string;
  nextSteps: NextSteps | null;
  visitorPass: VisitorPass | null;
};

type Props = {
  siteId: string;
  referenceId: string;
};

export function CheckInForm({ siteId, referenceId }: Props) {
  const [context, setContext] = useState<CheckInContext | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
  const [extraAnswers, setExtraAnswers] = useState<Record<string, string>>({});

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
          has_branding: Boolean(data.branding),
        });
        // Do not auto-pick a host — visitor must choose who they are meeting.
        if (data.visitorTypes.find((t) => t.code === "general")) setVisitorTypeCode("general");
        else if (data.visitorTypes[0]) setVisitorTypeCode(data.visitorTypes[0].code);
        if (data.purposeCategories.find((p) => p.code === "business")) setPurposeCategoryCode("business");
        else if (data.purposeCategories[0]) setPurposeCategoryCode(data.purposeCategories[0].code);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Unable to load check-in.");
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
          `&ref=${encodeURIComponent(referenceId)}&visitorTypeCode=${encodeURIComponent(visitorTypeCode)}`;
        const res = await fetch(url);
        if (!res.ok) {
          if (!cancelled) setEffectiveForm(null);
          return;
        }
        const data = (await res.json()) as EffectiveForm | null;
        if (!cancelled) {
          setEffectiveForm(data);
          if (data) {
            track(AnalyticsEvents.checkInFormLoaded, {
              visitor_type_code: data.visitorTypeCode,
              field_count: data.fields.length,
            });
          }
        }
      } catch {
        if (!cancelled) setEffectiveForm(null);
      }
    }
    void loadForm();
    return () => {
      cancelled = true;
    };
  }, [context, visitorTypeCode, siteId, referenceId]);

  const branding = context?.branding ?? null;
  const accent = branding?.brandColourToken || "#CF1161";
  const selectedHost = context?.hosts.find((host) => host.id === hostId);
  const siteFallback = context?.siteName || "this site";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context) return;
    if (!privacyAcknowledged) {
      toast.error("Please acknowledge the privacy notice to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const answerMap: Record<string, string> = {
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
      const formAnswers =
        effectiveForm?.fields.map((field) => ({
          formVersionId: effectiveForm.formVersionId,
          fieldCode: field.fieldCode,
          fieldLabelSnapshot: field.fieldLabel,
          answerValue: { value: answerMap[field.fieldCode] ?? "" },
        })) ?? undefined;

      const res = await fetch(`${apiBaseUrl()}/public/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newClientId(),
          siteId: context.siteId,
          referenceId: context.referenceId,
          hostId,
          visitorName: visitorName.trim(),
          visitorPhone: visitorPhone.trim(),
          companyName: companyName.trim(),
          visitorEmail: visitorEmail.trim() || undefined,
          vehicleRegistration: vehicleRegistration.trim() || undefined,
          idDocumentNumber: idDocumentNumber.trim() || undefined,
          purposeCategoryCode: purposeCategoryCode || undefined,
          visitorTypeCode,
          privacyAcknowledged: true,
          formAnswers,
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
        organisationDisplayName: data.organisationDisplayName ?? branding?.organisationDisplayName ?? null,
        welcomeMessage: data.welcomeMessage ?? branding?.welcomeMessage ?? null,
        brandColourToken: data.brandColourToken ?? branding?.brandColourToken ?? null,
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
      toast.success(`Checked in — wait for ${hostName} at reception.`);
    } catch (error) {
      track(AnalyticsEvents.checkInFailed, { visitor_type_code: visitorTypeCode });
      toast.error(error instanceof Error ? error.message : "Check-in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <CheckInBrandedShell branding={null} siteNameFallback="Visitor check-in">
        <p className="text-sm text-muted-foreground">Loading check-in…</p>
      </CheckInBrandedShell>
    );
  }

  if (loadError) {
    return (
      <CheckInBrandedShell branding={null} siteNameFallback="Visitor check-in">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">Check-in unavailable</h1>
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <p className="text-sm text-muted-foreground">Ask reception to show a fresh QR code on the kiosk.</p>
        </div>
      </CheckInBrandedShell>
    );
  }

  if (done) {
    const doneAccent = done.brandColourToken || accent;
    const steps = done.nextSteps;
    const hostLine = done.hostDepartment
      ? `${done.hostDisplayName} · ${done.hostDepartment}`
      : done.hostDisplayName;
    return (
      <CheckInBrandedShell
        branding={
          branding ?? {
            organisationDisplayName: done.organisationDisplayName,
            siteDisplayName: done.siteName,
            welcomeMessage: done.welcomeMessage,
            brandColourToken: done.brandColourToken,
            logoUrl: null,
            helpContactReference: null,
          }
        }
        siteNameFallback={done.siteName}
      >
        <div className="space-y-5">
          <div className="h-1.5 w-16 rounded-full" style={{ backgroundColor: doneAccent }} aria-hidden />
          <div className="space-y-2">
            <p className="text-sm font-medium" style={{ color: doneAccent }}>
              Checked in at {done.siteName}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "#3D1152" }}>
              {steps?.headline || `Wait for ${done.hostDisplayName}`}
            </h2>
            <p className="text-base" style={{ color: "#3D1152" }}>
              Meeting: <span className="font-medium">{hostLine}</span>
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "#705C67" }}>
              {steps?.instruction ||
                `Please wait at reception. ${done.hostDisplayName} has been notified and will meet you here.`}
            </p>
          </div>
          {steps?.queueNumber != null ? (
            <div
              className="rounded-2xl border px-4 py-3 text-sm"
              style={{ borderColor: "#EDE6E8", backgroundColor: "#fff", color: "#3D1152" }}
            >
              <p className="font-medium">Queue ticket #{steps.queueNumber}</p>
              <p className="mt-1" style={{ color: "#705C67" }}>
                {steps.peopleAhead == null
                  ? "Wait at reception until your host or the receptionist calls you."
                  : steps.peopleAhead === 0
                    ? "You are next — stay at reception."
                    : `${steps.peopleAhead} visitor${steps.peopleAhead === 1 ? "" : "s"} ahead of you.`}
              </p>
            </div>
          ) : null}
          {done.visitorPass ? (
            <div
              id="visitor-pass-card"
              className="rounded-2xl border px-4 py-4 text-sm print:border-black"
              style={{ borderColor: doneAccent, backgroundColor: "#fff", color: "#3D1152" }}
            >
              <p className="text-xs uppercase tracking-wide" style={{ color: doneAccent }}>
                {done.visitorPass.title}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-widest">{done.visitorPass.confirmationCode}</p>
              <p className="mt-3 font-medium">{done.visitorPass.visitorName}</p>
              <p className="mt-1" style={{ color: "#705C67" }}>
                {done.visitorPass.hostLine}
              </p>
              <p className="mt-1" style={{ color: "#705C67" }}>
                {done.visitorPass.siteName}
              </p>
              {done.visitorPass.badgeRequired && done.visitorPass.badgeInstruction ? (
                <p className="mt-3" style={{ color: "#705C67" }}>
                  {done.visitorPass.badgeInstruction}
                </p>
              ) : null}
              <p className="mt-3 text-xs print:hidden" style={{ color: "#675C62" }}>
                {done.visitorPass.printHint}
              </p>
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
          <p className="text-xs print:hidden" style={{ color: "#675C62" }}>
            Stay at {steps?.waitLocation || "reception"} until your host arrives. If you need help, ask the
            receptionist. When you leave, use Sign out with the same phone number.
          </p>
          <a
            className="inline-block text-sm underline print:hidden"
            style={{ color: doneAccent }}
            href={`/check-out?site=${encodeURIComponent(siteId)}&ref=${encodeURIComponent(referenceId)}`}
          >
            Sign out when you leave
          </a>
        </div>
      </CheckInBrandedShell>
    );
  }

  if (!context) return null;

  return (
    <CheckInBrandedShell branding={branding} siteNameFallback={siteFallback}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {selectedHost ? (
          <p className="rounded-md border border-[#EDEBEC] bg-white/70 px-3 py-2 text-sm" style={{ color: "#705C67" }}>
            You will wait at reception for{" "}
            <span className="font-medium" style={{ color: "#3D1152" }}>
              {selectedHost.displayName}
            </span>
            {selectedHost.department ? ` (${selectedHost.department})` : ""}. Reception will notify them.
          </p>
        ) : null}

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
          <Label htmlFor="visitorTypeCode">Visitor type</Label>
          <select
            id="visitorTypeCode"
            name="visitorTypeCode"
            value={visitorTypeCode}
            onChange={(e) => setVisitorTypeCode(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
              className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              required
            >
              <option value="" disabled>
                Select a person or department…
              </option>
              {context.hosts.map((host) => (
                <option key={host.id} value={host.id}>
                  {host.displayName}
                  {host.department ? ` — ${host.department}` : ""}
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
              className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

        {effectiveForm?.fields
          .filter(
            (field) =>
              ![
                "visitor_name",
                "visitor_phone",
                "company_name",
                "visitor_email",
                "id_document_number",
                "vehicle_registration",
                "host",
                "purpose_category",
              ].includes(field.fieldCode),
          )
          .map((field) => (
            <div key={field.fieldCode} className="space-y-2">
              <Label htmlFor={`field-${field.fieldCode}`}>
                {field.fieldLabel}
                {field.required ? "" : " (optional)"}
              </Label>
              <Input
                id={`field-${field.fieldCode}`}
                name={field.fieldCode}
                value={extraAnswers[field.fieldCode] ?? ""}
                onChange={(e) =>
                  setExtraAnswers((prev) => ({ ...prev, [field.fieldCode]: e.target.value }))
                }
                required={field.required}
                maxLength={200}
              />
            </div>
          ))}

        <label className="flex items-start gap-3 rounded-md border border-[#EDEBEC] bg-white/70 p-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={privacyAcknowledged}
            onChange={(e) => setPrivacyAcknowledged(e.target.checked)}
            required
          />
          <span style={{ color: "#705C67" }}>{context.privacyNoticeSummary}</span>
        </label>

        <Button
          type="submit"
          className="w-full text-white hover:opacity-90"
          style={{ backgroundColor: accent }}
          disabled={submitting || context.hosts.length === 0 || !hostId || !privacyAcknowledged}
        >
          {submitting ? "Checking in…" : "Check in"}
        </Button>
      </form>
    </CheckInBrandedShell>
  );
}
