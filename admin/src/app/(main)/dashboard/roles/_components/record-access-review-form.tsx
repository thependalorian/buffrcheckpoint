"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { recordAccessReviewAction } from "./access-review-actions";

const OUTCOMES = [
  { code: "access_confirmed", label: "Access confirmed" },
  { code: "role_change_required", label: "Role change required" },
  { code: "access_revocation_required", label: "Access revocation required" },
  { code: "needs_follow_up", label: "Needs follow-up" },
] as const;

export function RecordAccessReviewForm({ reviewedUserId }: { reviewedUserId: string }) {
  const router = useRouter();
  const [outcomeCode, setOutcomeCode] = useState<string>(OUTCOMES[0].code);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    const result = await recordAccessReviewAction({ reviewedUserId, outcomeCode, note: note.trim() || undefined });
    setPending(false);
    if ("error" in result) {
      setError(result.error ?? "Could not record attestation.");
      return;
    }
    router.refresh();
    setNote("");
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <Select value={outcomeCode} onValueChange={setOutcomeCode}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Outcome" />
        </SelectTrigger>
        <SelectContent>
          {OUTCOMES.map((o) => (
            <SelectItem key={o.code} value={o.code}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Textarea
        placeholder="Optional note for audit trail"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
      />
      <Button type="button" size="sm" disabled={pending} onClick={() => void submit()}>
        {pending ? "Saving…" : "Record attestation"}
      </Button>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
