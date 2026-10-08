"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { decideKybAction, decideKybDocumentAction } from "../../actions";

interface Issue {
  field: string;
  code: string;
  message: string;
  severity: "error" | "warning";
}

interface Comparison {
  field: string;
  label: string;
  result: "match" | "mismatch" | "not_read";
  typed: string;
  fromDocument: string | null;
}

interface ReviewDocument {
  id: string;
  documentType: string;
  documentTypeLabel: string;
  status: string;
  statusLabel: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
  reading: string;
}

export interface KybReview {
  id: string;
  organisationId: string;
  organisationName: string | null;
  status: string;
  statusLabel: string;
  submittedAt: string;
  entityTypeLabel: string | null;
  businessRegistrationNumber: string;
  registeredBusinessName: string;
  registeredAddress: string;
  authorizedSignatoryName: string;
  principalBusiness: string | null;
  financialYearEnd: string | null;
  postalAddress: string;
  contactEmail: string | null;
  contactPhone: string | null;
  tin: string;
  incorporatedOn: string | null;
  members: Array<{
    fullName: string;
    role?: string;
    isJuristic?: boolean;
    registrationNumber?: string;
    identityNumber?: string;
    percentage?: number | null;
  }>;
  ownership: {
    owners: Array<{ fullName: string; percentage: number; juristic: boolean; atBipa: boolean; atFia: boolean }>;
    traceThrough: string[];
    totalPercentage: number | null;
  };
  checklist: Array<{ code: string; label: string; blocking: boolean; satisfied: boolean; reason: string }>;
  rules: { boThresholdBipaPercent: number; boThresholdFiaPercent: number; certifiedCopyMaxAgeMonths: number };
  fieldSources: Record<string, string>;
  legacyDocument: boolean;
  issues: Issue[];
  comparison: Comparison[];
  documents: ReviewDocument[];
  proofAccepted: boolean;
  canVerify: boolean;
  history: Array<{ at: string; status: string; note: string; flaggedFields: string[] }>;
}

const FIELDS: Array<{ key: string; label: string }> = [
  { key: "businessRegistrationNumber", label: "Registration number" },
  { key: "registeredBusinessName", label: "Business name" },
  { key: "registeredAddress", label: "Registered address" },
  { key: "authorizedSignatoryName", label: "Authorised signatory" },
  { key: "principalBusiness", label: "Principal business" },
  { key: "financialYearEnd", label: "Financial year end" },
  { key: "incorporatedOn", label: "Date registered" },
  { key: "postalAddress", label: "Postal address" },
  { key: "contactEmail", label: "Business email" },
  { key: "contactPhone", label: "Business phone" },
  { key: "tin", label: "Tax number" },
  { key: "members", label: "Members" },
  { key: "documents", label: "Documents" },
];

const SOURCE_TEXT: Record<string, string> = {
  document: "from document",
  edited: "edited after reading",
  typed: "typed",
};

export function ReviewPanel({ review }: { review: KybReview }) {
  const router = useRouter();
  const open = review.status === "pending" || review.status === "needs_info";
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const issuesFor = (field: string) =>
    review.issues.filter((i) => i.field === field || i.field.startsWith(`${field}.`));
  const mismatch = (field: string) => review.comparison.find((c) => c.field === field && c.result === "mismatch");

  function decide(decision: "verified" | "rejected" | "needs_info") {
    setError(null);
    start(async () => {
      const result = await decideKybAction(
        review.id,
        decision,
        note || undefined,
        decision === "needs_info" ? [...flagged] : undefined,
      );
      if (result.error) return setError(result.error);
      router.refresh();
    });
  }

  function decideDocument(documentId: string, decision: "accepted" | "rejected", withNote?: string) {
    setError(null);
    start(async () => {
      const result = await decideKybDocumentAction(review.id, documentId, decision, withNote);
      if (result.error) return setError(result.error);
      setRejecting(null);
      setRejectNote("");
      router.refresh();
    });
  }

  function toggleFlag(key: string) {
    setFlagged((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const value = (key: string): string => {
    if (key === "documents")
      return `${review.documents.length} uploaded, ${review.documents.filter((d) => d.status === "accepted").length} accepted`;
    if (key === "members") {
      return review.members.length
        ? review.members
            .map(
              (m) =>
                `${m.fullName}${m.role ? `, ${m.role.replace("_", " ")}` : ""}${m.isJuristic ? ` (company ${m.registrationNumber ?? ""})` : ""}${m.percentage != null ? `, ${m.percentage}%` : ""}${m.identityNumber ? `, ID ${m.identityNumber}` : ""}`,
            )
            .join("; ")
        : "None given";
    }
    return String((review as unknown as Record<string, unknown>)[key] ?? "") || "Not given";
  };

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="font-semibold text-base">Details</h2>
        <div className="divide-y divide-border rounded-md border border-border">
          {FIELDS.map((f) => {
            const issues = issuesFor(f.key);
            const diff = mismatch(f.key);
            return (
              <div key={f.key} className="grid gap-1 p-3 sm:grid-cols-[14rem_1fr_auto] sm:items-start">
                <p className="text-muted-foreground text-sm">{f.label}</p>
                <div className="space-y-1">
                  <p className="text-sm">{value(f.key)}</p>
                  {diff ? <p className="text-destructive text-xs">The document says: {diff.fromDocument}</p> : null}
                  {issues.map((i) => (
                    <p
                      key={`${i.code}-${i.field}`}
                      className={i.severity === "error" ? "text-destructive text-xs" : "text-sodium-yellow-ink text-xs"}
                    >
                      {i.message}
                    </p>
                  ))}
                  {review.fieldSources[f.key] ? (
                    <p className="text-muted-foreground text-xs">
                      Entered: {SOURCE_TEXT[review.fieldSources[f.key]] ?? review.fieldSources[f.key]}
                    </p>
                  ) : null}
                </div>
                {open ? (
                  <label className="flex items-center gap-1 text-muted-foreground text-xs">
                    <input type="checkbox" checked={flagged.has(f.key)} onChange={() => toggleFlag(f.key)} />
                    Needs attention
                  </label>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-base">Ownership</h2>
        <div className="space-y-1 rounded-md border border-border p-3 text-sm">
          <p className="text-muted-foreground text-xs">
            Thresholds: BIPA {review.rules.boThresholdBipaPercent} percent or greater, FIA{" "}
            {review.rules.boThresholdFiaPercent} percent or greater. Only a person can be a beneficial owner.
          </p>
          {review.ownership.owners.length === 0 ? (
            <p>No holder reaches either threshold from the shares given.</p>
          ) : null}
          {review.ownership.owners.map((o) => (
            <p key={o.fullName}>
              {o.fullName}: {o.percentage}% {o.juristic ? "(a company: trace to its owners) " : ""}
              {o.atBipa ? "· BIPA " : ""}
              {o.atFia ? "· FIA" : ""}
            </p>
          ))}
          {review.ownership.totalPercentage !== null ? (
            <p className="text-muted-foreground text-xs">Shares given total {review.ownership.totalPercentage}%.</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-base">What should be on file</h2>
        <ul className="space-y-1.5 text-sm">
          {review.checklist.map((item) => (
            <li key={item.code} className="flex flex-wrap items-center gap-2">
              <Badge variant={item.satisfied ? "default" : item.blocking ? "destructive" : "secondary"}>
                {item.satisfied ? "On file" : item.blocking ? "Required" : "Requested"}
              </Badge>
              <span>{item.label}</span>
              <span className="text-muted-foreground text-xs">{item.reason}</span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground text-xs">
          Only the first item holds up approval. Ask for the others in your message if you want them before you approve.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-base">Against the document</h2>
        <div className="divide-y divide-border rounded-md border border-border">
          {review.comparison.map((c) => (
            <div key={c.field} className="grid gap-1 p-3 sm:grid-cols-[14rem_1fr_8rem] sm:items-start">
              <p className="text-muted-foreground text-sm">{c.label}</p>
              <div className="space-y-0.5 text-sm">
                <p>Typed: {c.typed}</p>
                <p className="text-muted-foreground">Document: {c.fromDocument ?? "not read"}</p>
              </div>
              <Badge variant={c.result === "match" ? "default" : c.result === "mismatch" ? "destructive" : "secondary"}>
                {c.result === "match" ? "Matches" : c.result === "mismatch" ? "Differs" : "Not read"}
              </Badge>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          Values are read from the scan by software, so read the document yourself before accepting it.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-base">Documents</h2>
        {review.documents.length === 0 && !review.legacyDocument ? (
          <p className="text-muted-foreground text-sm">No documents uploaded.</p>
        ) : null}
        {review.legacyDocument ? (
          <p className="text-sm">
            A document was sent with this submission before documents were listed separately.{" "}
            <a
              className="text-sodium-yellow-ink hover:underline"
              href={`/api/kyb-documents/${review.id}`}
              target="_blank"
              rel="noreferrer"
            >
              Open it
            </a>
            .
          </p>
        ) : null}
        <ul className="space-y-2">
          {review.documents.map((d) => (
            <li key={d.id} className="space-y-2 rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{d.documentTypeLabel}</p>
                  <p className="text-muted-foreground text-xs">
                    {d.fileName} · {(d.sizeBytes / 1024 / 1024).toFixed(1)} MB · uploaded{" "}
                    {new Date(d.uploadedAt).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      d.status === "accepted" ? "default" : d.status === "rejected" ? "destructive" : "secondary"
                    }
                  >
                    {d.statusLabel}
                  </Badge>
                  <a
                    className="text-sodium-yellow-ink text-xs hover:underline"
                    href={`/api/kyb-documents/${d.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending || d.status === "accepted"}
                    onClick={() => decideDocument(d.id, "accepted")}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => setRejecting(rejecting === d.id ? null : d.id)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
              {rejecting === d.id ? (
                <div className="space-y-2">
                  <Textarea
                    rows={2}
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Why this document cannot be accepted"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={pending || rejectNote.trim().length < 3}
                    onClick={() => decideDocument(d.id, "rejected", rejectNote)}
                  >
                    Reject document
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {open ? (
        <section className="max-w-2xl space-y-3">
          <h2 className="font-semibold text-base">Decision</h2>
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="A message to the organisation: what to correct or add. Required to ask for information or to reject."
          />
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending || !review.canVerify} onClick={() => decide("verified")}>
              Approve
            </Button>
            <Button
              variant="outline"
              disabled={pending || note.trim().length === 0}
              onClick={() => decide("needs_info")}
            >
              Ask for information{flagged.size > 0 ? ` (${flagged.size} marked)` : ""}
            </Button>
            <Button
              variant="destructive"
              disabled={pending || note.trim().length === 0}
              onClick={() => decide("rejected")}
            >
              Reject
            </Button>
          </div>
          {!review.canVerify ? (
            <p className="text-muted-foreground text-xs">
              {review.issues.some((i) => i.severity === "error")
                ? "Approval is held until the highlighted errors are corrected."
                : "Accept at least one registration document (founding statement or certificate) to enable approval."}
            </p>
          ) : null}
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </section>
      ) : (
        <p className="text-muted-foreground text-sm">
          This submission is {review.statusLabel.toLowerCase()}. Open the organisation's latest submission to act on it.
        </p>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold text-base">History</h2>
        <ul className="space-y-1 text-sm">
          {review.history.map((h) => (
            <li key={`${h.at}-${h.status}`}>
              {new Date(h.at).toLocaleString("en-GB")} · {h.status}
              {h.note ? ` · ${h.note}` : ""}
              {h.flaggedFields.length ? ` · marked: ${h.flaggedFields.join(", ")}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
