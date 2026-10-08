"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { checkUpload, fieldLabels, kybCopy, sourceBadge, statusText } from "@/lib/copy/kyb";

import {
  type KybDocumentView,
  type KybIssue,
  type KybMemberValue,
  type KybValues,
  listKybDocumentsAction,
  removeKybDocumentAction,
  submitKybAction,
  uploadKybDocumentAction,
  validateKybAction,
} from "../actions";

export interface KybSubmissionView {
  id: string;
  status: string;
  statusLabel: string;
  submittedAt: string;
  verifiedAt: string | null;
  entityType: string | null;
  businessRegistrationNumber: string;
  registeredBusinessName: string;
  registeredAddress: string;
  authorizedSignatoryName: string;
  principalBusiness: string | null;
  financialYearEnd: string | null;
  members: KybMemberValue[];
}

export interface KybRequestView {
  kind: "needs_info" | "rejected";
  note: string;
  flaggedFields: string[];
  at: string;
}

interface Option {
  code: string;
  label: string;
}

type Sources = Record<string, "document" | "edited" | "typed">;
type Confidence = Record<string, string>;

const EMPTY: KybValues = {
  entityType: "",
  businessRegistrationNumber: "",
  registeredBusinessName: "",
  registeredAddress: "",
  authorizedSignatoryName: "",
  principalBusiness: "",
  financialYearEnd: "",
  members: [],
};

const POLL_MS = 3000;
const POLL_LIMIT = 50;

function initialValues(submission: KybSubmissionView | null): KybValues {
  if (!submission) return EMPTY;
  return {
    entityType: submission.entityType ?? "",
    businessRegistrationNumber: submission.businessRegistrationNumber,
    registeredBusinessName: submission.registeredBusinessName,
    registeredAddress: submission.registeredAddress,
    authorizedSignatoryName: submission.authorizedSignatoryName,
    principalBusiness: submission.principalBusiness ?? "",
    financialYearEnd: submission.financialYearEnd ?? "",
    members: submission.members ?? [],
  };
}

function Field({
  id,
  label,
  help,
  badge,
  flagged,
  issues,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  badge: string | null;
  flagged: boolean;
  issues: KybIssue[];
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        {badge ? <Badge variant="secondary">{badge}</Badge> : null}
        {flagged ? <Badge variant="destructive">{kybCopy.badges.flagged}</Badge> : null}
      </div>
      {children}
      {help ? <p className="text-muted-foreground text-xs">{help}</p> : null}
      {issues.map((i) => (
        <p
          key={`${i.code}-${i.field}`}
          className={i.severity === "error" ? "text-destructive text-xs" : "text-xs text-sodium-yellow-ink"}
        >
          {i.message}
        </p>
      ))}
    </div>
  );
}

export function KybWorkspace({
  submission,
  initialDocuments,
  request,
  entityTypes,
  documentTypes,
}: {
  submission: KybSubmissionView | null;
  initialDocuments: KybDocumentView[];
  request: KybRequestView | null;
  entityTypes: Option[];
  documentTypes: Option[];
}) {
  const router = useRouter();
  const verified = submission?.status === "verified";
  const [editing, setEditing] = useState(
    !submission || submission.status === "needs_info" || submission.status === "rejected",
  );
  const [documents, setDocuments] = useState<KybDocumentView[]>(initialDocuments);
  const [values, setValues] = useState<KybValues>(() => initialValues(submission));
  const [sources, setSources] = useState<Sources>({});
  const [confidence, setConfidence] = useState<Confidence>({});
  const [issues, setIssues] = useState<KybIssue[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState("founding_statement");
  const [submitting, startSubmit] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const applied = useRef<Set<string>>(new Set());
  const flagged = useMemo(() => new Set(request?.flaggedFields ?? []), [request]);

  const setField = useCallback((field: keyof KybValues, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    setSources((s) => ({ ...s, [field]: s[field] === "document" || s[field] === "edited" ? "edited" : "typed" }));
  }, []);

  /** Fills the form from a document. Without `overwrite`, only fields the person has not touched are filled. */
  const applyDocument = useCallback((doc: KybDocumentView, overwrite: boolean) => {
    const next: Partial<KybValues> = {};
    const nextSources: Sources = {};
    const nextConfidence: Confidence = {};
    const take = (field: keyof KybValues, suggestion: { value: string; confidence: string } | undefined) => {
      if (!suggestion) return;
      next[field] = suggestion.value as never;
      nextSources[field] = "document";
      nextConfidence[field] = suggestion.confidence;
    };
    setValues((current) => {
      const empty = (field: keyof KybValues) =>
        !current[field] || (Array.isArray(current[field]) && (current[field] as unknown[]).length === 0);
      const s = doc.suggestions;
      if (overwrite || empty("businessRegistrationNumber"))
        take("businessRegistrationNumber", s.businessRegistrationNumber);
      if (overwrite || empty("registeredBusinessName")) take("registeredBusinessName", s.registeredBusinessName);
      if (overwrite || empty("registeredAddress")) take("registeredAddress", s.registeredAddress);
      if (overwrite || empty("principalBusiness")) take("principalBusiness", s.principalBusiness);
      if (overwrite || empty("financialYearEnd")) take("financialYearEnd", s.financialYearEnd);
      if (overwrite || empty("entityType")) take("entityType", s.entityType);
      if ((overwrite || empty("members")) && doc.members.length > 0) {
        next.members = doc.members.map((m) => ({ fullName: m.fullName, percentage: m.percentage ?? undefined }));
        nextSources.members = "document";
      }
      if ((overwrite || empty("authorizedSignatoryName")) && doc.members[0]) {
        next.authorizedSignatoryName = doc.members[0].fullName;
        nextSources.authorizedSignatoryName = "document";
        nextConfidence.authorizedSignatoryName = "medium";
      }
      return { ...current, ...next };
    });
    setSources((current) => ({ ...current, ...nextSources }));
    setConfidence((current) => ({ ...current, ...nextConfidence }));
  }, []);

  // When a document finishes being read, fill the empty fields once.
  useEffect(() => {
    for (const doc of documents) {
      if (doc.reading === "read" && !applied.current.has(doc.id) && editing) {
        applied.current.add(doc.id);
        applyDocument(doc, false);
      }
    }
  }, [documents, editing, applyDocument]);

  // Poll while any document is still being read.
  const reading = documents.some((d) => d.reading === "reading");
  useEffect(() => {
    if (!reading) return;
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      setDocuments(await listKybDocumentsAction());
      if (tries >= POLL_LIMIT) clearInterval(timer);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [reading]);

  // Check the details with the server as the person types.
  useEffect(() => {
    if (!editing || !values.businessRegistrationNumber) return;
    const timer = setTimeout(async () => {
      setIssues((await validateKybAction(values)).issues);
    }, 500);
    return () => clearTimeout(timer);
  }, [values, editing]);

  async function upload() {
    const file = fileInput.current?.files?.[0];
    setUploadError(null);
    if (!file) return setUploadError("Choose a file first.");
    const problem = checkUpload(file);
    if (problem) return setUploadError(problem);
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    body.append("documentType", documentType);
    const result = await uploadKybDocumentAction(body);
    setUploading(false);
    if (result.error || !result.document) return setUploadError(result.error ?? "The upload failed.");
    setDocuments((d) => [...d, result.document as KybDocumentView]);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function remove(id: string) {
    const result = await removeKybDocumentAction(id);
    if (result.error) return setUploadError(result.error);
    setDocuments((d) => d.filter((x) => x.id !== id));
  }

  function send() {
    setSubmitError(null);
    startSubmit(async () => {
      const result = await submitKybAction({ ...values, fieldSources: sources });
      if (result.error) {
        setSubmitError(result.error);
        if (result.issues?.length) setIssues(result.issues);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  const issueFor = (field: string) => issues.filter((i) => i.field === field || i.field.startsWith(`${field}.`));
  const hasError = issues.some((i) => i.severity === "error");
  const hasProof = documents.some(
    (d) =>
      ["founding_statement", "registration_certificate", "amended_founding_statement"].includes(d.documentType) &&
      d.status !== "rejected",
  );

  /** Everything a field needs to show where its value came from, what the reviewer asked and what is wrong with it. */
  const meta = (field: keyof KybValues, label: string, help?: string) => ({
    id: field as string,
    label,
    help,
    badge: sourceBadge(sources[field], confidence[field]),
    flagged: flagged.has(field),
    issues: issueFor(field),
  });

  const members = values.members ?? [];
  const updateMember = (index: number, patch: Partial<KybMemberValue>) => {
    setValues((v) => ({ ...v, members: (v.members ?? []).map((m, i) => (i === index ? { ...m, ...patch } : m)) }));
    setSources((s) => ({ ...s, members: s.members === "document" || s.members === "edited" ? "edited" : "typed" }));
  };

  return (
    <div className="space-y-6">
      {submission ? (
        <Card>
          <CardContent className="space-y-2 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground text-sm">{submission.registeredBusinessName}</p>
              <Badge variant={verified ? "default" : submission.status === "rejected" ? "destructive" : "secondary"}>
                {statusText(submission.status)}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              Reg #{submission.businessRegistrationNumber} · submitted{" "}
              {new Date(submission.submittedAt).toLocaleDateString("en-GB")}
              {submission.verifiedAt
                ? ` · verified ${new Date(submission.verifiedAt).toLocaleDateString("en-GB")}`
                : ""}
            </p>
            {verified ? <p className="text-sm">{kybCopy.status.verifiedBody}</p> : null}
            {submission.status === "pending" ? <p className="text-sm">{kybCopy.status.pendingBody}</p> : null}
            {request ? (
              <div className="space-y-1 rounded-md border border-border bg-muted/40 p-3">
                <p className="font-medium text-sm">{kybCopy.reviewer.heading}</p>
                <p className="whitespace-pre-line text-sm">{request.note}</p>
                {request.flaggedFields.length > 0 ? (
                  <p className="text-muted-foreground text-xs">
                    {kybCopy.reviewer.fields}: {request.flaggedFields.map((f) => fieldLabels[f] ?? f).join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}
            {!verified && !editing ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                {kybCopy.status.editAndResend}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="font-semibold text-base">{kybCopy.steps.documents}</h2>
          <p className="text-muted-foreground text-sm">{kybCopy.documents.help}</p>
        </div>
        {documents.length === 0 ? <p className="text-muted-foreground text-sm">{kybCopy.documents.empty}</p> : null}
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-sm">{doc.documentTypeLabel}</p>
                <p className="truncate text-muted-foreground text-xs">
                  {doc.fileName} · {(doc.sizeBytes / 1024 / 1024).toFixed(1)} MB
                </p>
                <p className="text-xs">
                  {doc.reading === "reading" ? kybCopy.documents.reading : null}
                  {doc.reading === "read" ? kybCopy.documents.readOk : null}
                  {doc.reading === "not_read" ? kybCopy.documents.readNone : null}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    doc.status === "accepted" ? "default" : doc.status === "rejected" ? "destructive" : "secondary"
                  }
                >
                  {doc.status === "accepted"
                    ? kybCopy.documents.statusAccepted
                    : doc.status === "rejected"
                      ? kybCopy.documents.statusRejected
                      : kybCopy.documents.statusReceived}
                </Badge>
                {editing && doc.reading === "read" ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => applyDocument(doc, true)}>
                    {kybCopy.documents.useDetails}
                  </Button>
                ) : null}
                {editing && doc.status !== "accepted" ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => remove(doc.id)}>
                    {kybCopy.documents.remove}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        {!verified && (editing || !submission) ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="documentType">{kybCopy.documents.typeLabel}</Label>
              <NativeSelect id="documentType" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                {documentTypes.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="file">{kybCopy.documents.fileLabel}</Label>
              <Input id="file" ref={fileInput} type="file" accept="application/pdf,image/png,image/jpeg" />
            </div>
            <Button type="button" onClick={upload} disabled={uploading}>
              {uploading ? kybCopy.documents.uploading : kybCopy.documents.upload}
            </Button>
          </div>
        ) : null}
        <p className="text-muted-foreground text-xs">{kybCopy.documents.fileHelp}</p>
        {uploadError ? <p className="text-destructive text-sm">{uploadError}</p> : null}
      </section>

      {editing ? (
        <>
          <section className="max-w-2xl space-y-4">
            <h2 className="font-semibold text-base">{kybCopy.steps.details}</h2>
            <Field {...meta("entityType", kybCopy.details.entityType)}>
              <NativeSelect
                id="entityType"
                value={values.entityType}
                onChange={(e) => setField("entityType", e.target.value)}
              >
                <option value="">{kybCopy.details.entityTypePlaceholder}</option>
                {entityTypes.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              {...meta(
                "businessRegistrationNumber",
                kybCopy.details.registrationNumber,
                kybCopy.details.registrationHelp,
              )}
            >
              <Input
                id="businessRegistrationNumber"
                value={values.businessRegistrationNumber}
                onChange={(e) => setField("businessRegistrationNumber", e.target.value)}
              />
            </Field>
            <Field {...meta("registeredBusinessName", kybCopy.details.businessName, kybCopy.details.businessNameHelp)}>
              <Input
                id="registeredBusinessName"
                value={values.registeredBusinessName}
                onChange={(e) => setField("registeredBusinessName", e.target.value)}
              />
            </Field>
            <Field
              {...meta("registeredAddress", kybCopy.details.registeredAddress, kybCopy.details.registeredAddressHelp)}
            >
              <Textarea
                id="registeredAddress"
                rows={2}
                value={values.registeredAddress}
                onChange={(e) => setField("registeredAddress", e.target.value)}
              />
            </Field>
            <Field {...meta("principalBusiness", kybCopy.details.principalBusiness)}>
              <Input
                id="principalBusiness"
                value={values.principalBusiness ?? ""}
                onChange={(e) => setField("principalBusiness", e.target.value)}
              />
            </Field>
            <Field {...meta("financialYearEnd", kybCopy.details.financialYearEnd)}>
              <Input
                id="financialYearEnd"
                value={values.financialYearEnd ?? ""}
                onChange={(e) => setField("financialYearEnd", e.target.value)}
              />
            </Field>
            <Field {...meta("members", kybCopy.details.members, kybCopy.details.membersHelp)}>
              <div className="space-y-2">
                {members.map((m, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: members have no id until submitted
                  <div key={i} className="grid gap-2 sm:grid-cols-[2fr_1fr_1.4fr_auto]">
                    <Input
                      aria-label={kybCopy.details.memberName}
                      placeholder={kybCopy.details.memberName}
                      value={m.fullName}
                      onChange={(e) => updateMember(i, { fullName: e.target.value })}
                    />
                    <Input
                      aria-label={kybCopy.details.memberPercentage}
                      placeholder={kybCopy.details.memberPercentage}
                      inputMode="decimal"
                      value={m.percentage ?? ""}
                      onChange={(e) =>
                        updateMember(i, { percentage: e.target.value === "" ? undefined : Number(e.target.value) })
                      }
                    />
                    <Input
                      aria-label={kybCopy.details.memberId}
                      placeholder={kybCopy.details.memberId}
                      value={m.identityNumber ?? ""}
                      onChange={(e) => updateMember(i, { identityNumber: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setValues((v) => ({ ...v, members: (v.members ?? []).filter((_, k) => k !== i) }))}
                    >
                      {kybCopy.details.removeMember}
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setValues((v) => ({ ...v, members: [...(v.members ?? []), { fullName: "" }] }))}
                >
                  {kybCopy.details.addMember}
                </Button>
              </div>
            </Field>
            <Field {...meta("authorizedSignatoryName", kybCopy.details.signatory, kybCopy.details.signatoryHelp)}>
              <Input
                id="authorizedSignatoryName"
                list="kyb-members"
                value={values.authorizedSignatoryName}
                onChange={(e) => setField("authorizedSignatoryName", e.target.value)}
              />
              <datalist id="kyb-members">
                {members
                  .filter((m) => m.fullName)
                  .map((m) => (
                    <option key={m.fullName} value={m.fullName} />
                  ))}
              </datalist>
            </Field>
          </section>

          <section className="max-w-2xl space-y-2">
            <h2 className="font-semibold text-base">{kybCopy.steps.submit}</h2>
            {!hasProof ? <p className="text-sm text-sodium-yellow-ink">{kybCopy.submit.needDocument}</p> : null}
            {hasError ? <p className="text-destructive text-sm">{kybCopy.submit.fixFirst}</p> : null}
            <Button type="button" onClick={send} disabled={submitting || hasError || !hasProof}>
              {submitting ? kybCopy.submit.sending : submission ? kybCopy.submit.resend : kybCopy.submit.send}
            </Button>
            {submitError ? <p className="text-destructive text-sm">{submitError}</p> : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
