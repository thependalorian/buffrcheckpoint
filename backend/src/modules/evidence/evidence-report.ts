// Auditor-readable rendering of an evidence pack. Pure function over the
// stored pack JSON plus label lookups, so the report can never show anything
// the machine-readable pack does not contain. The SHA-256 printed on the
// report is of the exact JSON bytes returned by GET /evidence/:id/download.

export interface EvidenceReportLookups {
  organisationName: string;
  typeLabels: Map<string, string>;
  userEmails: Map<string, string>;
  siteNames: Map<string, string>;
  timeZone: string;
}

interface PackContent {
  generatedAt: string;
  scope: { from?: string | null; to?: string | null; generatedFor?: string };
  rbacMatrix: {
    roles: { id: string; roleCode: string; roleLabel: string | null; requiresMfa: boolean }[];
    organisationMemberships: { userId: string; roleId: string; assignedAt: string; deletedAt: string | null }[];
  };
  retentionPolicyReport: { siteId: string | null; retentionDays: number; version: number; deletedAt: string | null }[];
  accessLogExtract: {
    actorId: string | null;
    actionCode: string;
    resourceType: string;
    resourceId: string | null;
    occurredAt: string;
    prevEventHash: string | null;
    eventHash: string | null;
  }[];
  visitorAccessExtract:
    | {
        siteId: string;
        visitorDisplayName: string;
        visitorTypeCode: string;
        hostDisplayName: string | null;
        visitStatusCode: string;
        checkedInAt: string;
        checkedOutAt: string | null;
        offlineCaptured: boolean;
      }[]
    | null;
}

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * A row is linked when its prevEventHash is the eventHash of another row in
 * the extract. Timestamps are not used to order the chain: concurrent
 * requests can commit slightly out of timestamp order, and two rows may share
 * a predecessor (a fork, not a break). A break is a prevEventHash that
 * matches no row at all: an entry in the middle was removed or altered. The
 * oldest row's predecessor sits outside the extract, so it is not checked.
 */
export function auditChainStatus(rows: PackContent["accessLogExtract"]): { linked: number; breaks: number } {
  if (rows.length === 0) return { linked: 0, breaks: 0 };
  const hashes = new Set(rows.map((r) => r.eventHash).filter((h): h is string => Boolean(h)));
  const oldest = [...rows].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))[0];
  let linked = 0;
  let breaks = 0;
  for (const row of rows) {
    if (row === oldest || !row.prevEventHash) continue;
    if (hashes.has(row.prevEventHash)) linked++;
    else breaks++;
  }
  return { linked, breaks };
}

export function renderEvidenceReportHtml(
  packId: string,
  raw: string,
  sha256: string,
  lookups: EvidenceReportLookups,
): string {
  const pack = JSON.parse(raw) as PackContent;
  const when = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat("en-GB", {
          timeZone: lookups.timeZone,
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(iso))
      : "Still on site";
  // Type-definition IDs resolve to their labels; roster rows carry plain codes
  // (for example "checked_out"), which read fine once humanised.
  const label = (id: string | null | undefined) => {
    if (!id) return "Not recorded";
    const known = lookups.typeLabels.get(id);
    if (known) return known;
    return /^[a-z][a-z0-9_]*$/.test(id) ? id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, " ") : "Unknown";
  };
  const who = (id: string | null) => (id ? (lookups.userEmails.get(id) ?? "Former user") : "System");
  const site = (id: string | null) => (id ? (lookups.siteNames.get(id) ?? "Removed site") : "All sites");

  const visits = pack.visitorAccessExtract;
  const audit = [...pack.accessLogExtract].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const chain = auditChainStatus(pack.accessLogExtract);
  const activeMembers = pack.rbacMatrix.organisationMemberships.filter((m) => !m.deletedAt);
  const roleById = new Map(pack.rbacMatrix.roles.map((r) => [r.id, r]));
  const period =
    pack.scope.from || pack.scope.to
      ? `${esc(pack.scope.from ?? "start")} to ${esc(pack.scope.to ?? "now")}`
      : "Whole organisation, no visit period requested";

  const visitRows = visits
    ? visits
        .map(
          (
            v,
          ) => `<tr><td>${esc(when(v.checkedInAt))}</td><td>${esc(v.checkedOutAt ? when(v.checkedOutAt) : "Still on site")}</td>
<td>${esc(v.visitorDisplayName)}</td><td>${esc(label(v.visitorTypeCode))}</td><td>${esc(v.hostDisplayName ?? "Not recorded")}</td>
<td>${esc(site(v.siteId))}</td><td>${esc(label(v.visitStatusCode))}${v.offlineCaptured ? " (offline)" : ""}</td></tr>`,
        )
        .join("")
    : "";

  const auditRows = audit
    .slice(0, 200)
    .map(
      (a) => `<tr><td>${esc(when(a.occurredAt))}</td><td>${esc(who(a.actorId))}</td><td>${esc(a.actionCode)}</td>
<td>${esc(a.resourceType)}</td><td class="mono">${esc(a.eventHash ? a.eventHash.slice(0, 12) : "none")}</td></tr>`,
    )
    .join("");

  const memberRows = activeMembers
    .map((m) => {
      const role = roleById.get(m.roleId);
      return `<tr><td>${esc(who(m.userId))}</td><td>${esc(role?.roleLabel ?? label(role?.roleCode))}</td>
<td>${role?.requiresMfa ? "Required" : "Optional"}</td><td>${esc(when(m.assignedAt))}</td></tr>`;
    })
    .join("");

  const retentionRows = pack.retentionPolicyReport
    .filter((r) => !r.deletedAt)
    .map(
      (r) => `<tr><td>${esc(site(r.siteId))}</td><td>${esc(r.retentionDays)} days</td><td>${esc(r.version)}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Evidence pack ${esc(packId.slice(0, 8))}: ${esc(lookups.organisationName)}</title>
<style>
:root{--ink:#111;--muted:#5f5f5f;--line:#d9d9d9;--mustard:#e0b000;--paper:#f5f5f5}
*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--ink);font:13px/1.5 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif}
main{max-width:980px;margin:0 auto;padding:32px 28px}
header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;border-top:6px solid var(--mustard);padding-top:18px}
.brand{font-weight:700;font-size:18px}.brand small{display:block;font-weight:400;color:var(--muted);font-size:12px}
.meta{text-align:right;color:var(--muted);font-size:12px}
h1{font-size:28px;font-weight:500;margin:22px 0 4px}h2{font-size:17px;margin:30px 0 8px;padding-bottom:6px;border-bottom:1px solid var(--line)}
.lede{color:var(--muted);margin:0 0 18px}
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}
.tile{border:1px solid var(--line);border-radius:10px;padding:12px}.tile b{display:block;font-size:22px;font-weight:500}.tile span{color:var(--muted);font-size:12px}
table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;color:var(--muted);font-weight:600;border-bottom:1px solid var(--line);padding:6px 8px}
td{border-bottom:1px solid #eee;padding:6px 8px;vertical-align:top}.mono{font-family:ui-monospace,Menlo,monospace}
.note{background:var(--paper);border-radius:10px;padding:10px 12px;color:var(--muted);font-size:12px;margin-top:10px}
.ok{color:#2f6f3e;font-weight:600}.bad{color:#a12a2a;font-weight:600}
footer{margin-top:32px;border-top:1px solid var(--line);padding-top:12px;color:var(--muted);font-size:11px}
@media print{main{padding:0}@page{size:A4;margin:14mm}h2{break-after:avoid}tr{break-inside:avoid}}
</style></head><body><main>
<header><div class="brand">Checkpoint<small>by Buffr</small></div>
<div class="meta">Evidence pack <span class="mono">${esc(packId)}</span><br>Generated ${esc(when(pack.generatedAt))}</div></header>
<h1>${esc(lookups.organisationName)}</h1>
<p class="lede">Period: ${period}. Prepared for audit and regulatory review.</p>
<div class="tiles">
<div class="tile"><b>${visits ? visits.length : "Not requested"}</b><span>Visits in period</span></div>
<div class="tile"><b>${audit.length}</b><span>Audited actions in extract</span></div>
<div class="tile"><b>${activeMembers.length}</b><span>People with access</span></div>
<div class="tile"><b class="${chain.breaks === 0 ? "ok" : "bad"}">${chain.breaks === 0 ? "Intact" : `${chain.breaks} breaks`}</b><span>Audit hash chain (${chain.linked} links checked)</span></div>
</div>

<h2>1. Who was on the premises</h2>
${
  visits
    ? visits.length
      ? `<table><thead><tr><th>Checked in</th><th>Checked out</th><th>Visitor</th><th>Type</th><th>Host</th><th>Site</th><th>Status</th></tr></thead><tbody>${visitRows}</tbody></table>`
      : `<p class="lede">No visits were recorded in this period.</p>`
    : `<p class="lede">No visit period was requested for this pack. Generate a pack with a date range to include visits.</p>`
}

<h2>2. Who viewed or changed records</h2>
${
  auditRows
    ? `<table><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record type</th><th>Event hash</th></tr></thead><tbody>${auditRows}</tbody></table>`
    : `<p class="lede">No audited actions in this extract.</p>`
}
<p class="note">Every sensitive view, export, correction and deletion is written to an append-only log. Each entry carries the hash of the one before it, so an altered or removed entry breaks the chain. ${audit.length > 200 ? "The 200 most recent actions are shown; the full extract is in the JSON pack." : ""}</p>

<h2>3. Who has access</h2>
${
  memberRows
    ? `<table><thead><tr><th>Person</th><th>Role</th><th>Two-step sign-in</th><th>Since</th></tr></thead><tbody>${memberRows}</tbody></table>`
    : `<p class="lede">No active memberships.</p>`
}

<h2>4. How long records are kept</h2>
${
  retentionRows
    ? `<table><thead><tr><th>Scope</th><th>Retention</th><th>Policy version</th></tr></thead><tbody>${retentionRows}</tbody></table>`
    : `<p class="lede">No retention policy is configured.</p>`
}

<footer>Generated by Checkpoint by Buffr. This report is a readable view of the machine-readable evidence pack. SHA-256 of the pack JSON: <span class="mono">${esc(sha256)}</span>. Compare it with the downloaded file to confirm the two match.</footer>
</main></body></html>`;
}
