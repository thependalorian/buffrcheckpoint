import { SUBPROCESSORS, type Subprocessor } from "../../common/privacy/subprocessors";

// What Checkpoint does for an organisation's privacy without being asked, stated with the organisation's actual numbers. It goes into every
// evidence pack so a customer can show an auditor that privacy is handled, instead of taking it on trust.

export interface PrivacyPostureInput {
  retentionDays: number;
  retentionSource: "organisation_policy" | "platform_default";
  dispositionMode: "live" | "dry_run" | "off";
  outboxRedactionDays: number;
  lastRun: { startedAt: string; dryRun: boolean; disposedCount: number | null; heldCount: number | null; status: string } | null;
  dataRequests: { open: number; dueSoon: number; overdue: number };
}

export interface PrivacyPosture extends PrivacyPostureInput {
  automatic: string[];
  subprocessors: Subprocessor[];
  note: string;
}

export function buildPrivacyPosture(input: PrivacyPostureInput): PrivacyPosture {
  return {
    ...input,
    automatic: [
      "Visitor details are encrypted when stored and when sent.",
      `Visit records are removed ${input.retentionDays} days after check-out${input.dispositionMode === "live" ? "" : " (disposal is not live in this environment)"}, except under a legal hold.`,
      `Recipient addresses and message text of queued emails and texts are cleared ${input.outboxRedactionDays} days after delivery.`,
      "Every view, export, correction and deletion of personal data is written to a tamper-evident log.",
      "Visitors cannot see each other's details; staff see only what their role needs.",
      "Data requests carry a one-month deadline that is tracked for you.",
    ],
    subprocessors: [...SUBPROCESSORS],
    note: "This section states settings in force when the pack was generated. It is not a statement of legal compliance; each organisation remains responsible for its own legal obligations.",
  };
}
