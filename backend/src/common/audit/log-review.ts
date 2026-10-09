/** The groups a weekly log review counts (LG-5). Each pattern is matched against the audit action code. */
export const REVIEW_GROUPS: ReadonlyArray<{ group: string; pattern: RegExp }> = [
  { group: "sign_in_and_tokens", pattern: /^(auth|application_user\.register|mfa)/ },
  {
    group: "privilege_and_access",
    pattern: /^(privileged_access_grant|platform_support_session|role|rbac|support_access)/,
  },
  { group: "exports_and_deletions", pattern: /^(dsar|account_deletion|.*export)/ },
  { group: "money", pattern: /^(payment|invoice|credit_note|organisation_subscription)/ },
  { group: "integrity", pattern: /^audit\./ },
];

/** Action codes that always need a person to look, whatever the count. */
export const ALERT_ACTIONS: ReadonlyArray<string> = [
  "audit.chain_break_detected",
  "auth.refresh_token_reuse_detected",
  "payments.reconciliation_breaks_found",
];

export interface LogReviewRecord {
  weekEnding: string;
  reviewer: string;
  eventsReviewed: number;
  groups: Record<string, number>;
  alerts: Record<string, number>;
  outcome: "clear" | "needs_attention";
}

/**
 * Builds the weekly log review record from the week's action codes: counts per group, the alert actions seen, and an outcome.
 * The reviewer is the person who ran and read it; a record without a reviewer is refused so the sign-off cannot be skipped.
 */
export function buildLogReview(actionCodes: string[], reviewer: string, weekEnding: Date): LogReviewRecord {
  const name = reviewer.trim();
  if (!name) throw new Error("A reviewer name is required");
  const groups: Record<string, number> = Object.fromEntries(REVIEW_GROUPS.map((g) => [g.group, 0]));
  const alerts: Record<string, number> = {};
  for (const code of actionCodes) {
    for (const { group, pattern } of REVIEW_GROUPS) if (pattern.test(code)) groups[group]++;
    if (ALERT_ACTIONS.includes(code)) alerts[code] = (alerts[code] ?? 0) + 1;
  }
  return {
    weekEnding: weekEnding.toISOString().slice(0, 10),
    reviewer: name,
    eventsReviewed: actionCodes.length,
    groups,
    alerts,
    outcome: Object.keys(alerts).length === 0 ? "clear" : "needs_attention",
  };
}
