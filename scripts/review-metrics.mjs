#!/usr/bin/env node
// Review health (standard CR-10): median time to first review, change size, share of changes with a blocker found, and defects that
// escaped review. Reads merged pull requests from the GitHub CLI and prints one JSON line (and a markdown table with --markdown).
// Usage: node scripts/review-metrics.mjs [--days 30] [--markdown]
//        node scripts/review-metrics.mjs --self-test
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

const HOUR = 3_600_000;

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const round = (n) => (n === null ? null : Math.round(n * 100) / 100);

/**
 * pullRequests: merged PRs with createdAt, mergedAt, additions, deletions, title and reviews (state, submittedAt).
 * A blocker is a review in state CHANGES_REQUESTED. An escaped defect is a merged PR whose title starts with "fix" and which is
 * not itself part of a review round (a fix that reached main after a change had already merged).
 */
export function reviewMetrics(pullRequests) {
  const firstReviewHours = [];
  let withBlocker = 0;
  let unreviewed = 0;
  for (const pr of pullRequests) {
    const reviews = (pr.reviews ?? []).filter((r) => r.submittedAt);
    if (reviews.length === 0) {
      unreviewed++;
      continue;
    }
    const first = Math.min(...reviews.map((r) => new Date(r.submittedAt).getTime()));
    firstReviewHours.push((first - new Date(pr.createdAt).getTime()) / HOUR);
    if (reviews.some((r) => r.state === "CHANGES_REQUESTED")) withBlocker++;
  }
  const sizes = pullRequests.map((pr) => (pr.additions ?? 0) + (pr.deletions ?? 0));
  const reviewed = pullRequests.length - unreviewed;
  return {
    mergedPullRequests: pullRequests.length,
    unreviewed,
    medianHoursToFirstReview: round(median(firstReviewHours)),
    medianChangeLines: median(sizes),
    shareWithBlocker: reviewed === 0 ? null : round(withBlocker / reviewed),
    escapedDefects: pullRequests.filter((pr) => /^fix(\(|:|!)/i.test(pr.title ?? "")).length,
  };
}

function selfTest() {
  const t = "2026-10-01T00:00:00Z";
  const at = (h) => new Date(new Date(t).getTime() + h * HOUR).toISOString();
  const result = reviewMetrics([
    { createdAt: t, additions: 10, deletions: 5, title: "feat: a", reviews: [{ state: "APPROVED", submittedAt: at(2) }] },
    { createdAt: t, additions: 100, deletions: 0, title: "fix(x): b", reviews: [{ state: "CHANGES_REQUESTED", submittedAt: at(4) }, { state: "APPROVED", submittedAt: at(9) }] },
    { createdAt: t, additions: 1, deletions: 1, title: "chore: c", reviews: [] },
  ]);
  assert.equal(result.mergedPullRequests, 3);
  assert.equal(result.unreviewed, 1);
  assert.equal(result.medianHoursToFirstReview, 3);
  assert.equal(result.medianChangeLines, 15);
  assert.equal(result.shareWithBlocker, 0.5);
  assert.equal(result.escapedDefects, 1);
  assert.deepEqual(reviewMetrics([]).medianHoursToFirstReview, null);
  process.stdout.write("review-metrics self-test passed\n");
}

if (process.argv.includes("--self-test")) {
  selfTest();
} else if (process.argv[1]?.endsWith("review-metrics.mjs")) {
  const daysIndex = process.argv.indexOf("--days");
  const days = daysIndex > -1 ? Number(process.argv[daysIndex + 1]) : 30;
  const since = new Date(Date.now() - days * 24 * HOUR).toISOString().slice(0, 10);
  const raw = execFileSync(
    "gh",
    ["pr", "list", "--state", "merged", "--search", `merged:>=${since}`, "--limit", "200", "--json", "number,title,additions,deletions,createdAt,mergedAt,reviews"],
    { encoding: "utf8" },
  );
  const metrics = { windowDays: days, since, ...reviewMetrics(JSON.parse(raw)) };
  process.stdout.write(`${JSON.stringify(metrics)}\n`);
  if (process.argv.includes("--markdown")) {
    const rows = Object.entries(metrics).map(([k, v]) => `| ${k} | ${v === null ? "none" : v} |`);
    process.stdout.write(`\n| Measure | Value |\n|---|---|\n${rows.join("\n")}\n`);
  }
}
