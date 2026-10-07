import { auditChainStatus, renderEvidenceReportHtml } from "./evidence-report";

const row = (occurredAt: string, prev: string | null, hash: string) => ({
  actorId: null,
  actionCode: "visit.read",
  resourceType: "visit",
  resourceId: null,
  occurredAt,
  prevEventHash: prev,
  eventHash: hash,
});

describe("evidence report", () => {
  it("treats a concurrent fork as linked and a missing predecessor as a break", () => {
    const fork = [
      row("2026-09-01T10:00:00Z", null, "a"),
      row("2026-09-01T11:00:00Z", "a", "b"),
      row("2026-09-01T11:00:01Z", "a", "c"),
    ];
    expect(auditChainStatus(fork)).toEqual({ linked: 2, breaks: 0 });
  });

  it("counts intact links and breaks in the audit hash chain", () => {
    expect(auditChainStatus([row("2026-09-01T10:00:00Z", null, "a"), row("2026-09-01T11:00:00Z", "a", "b")])).toEqual({
      linked: 1,
      breaks: 0,
    });
    expect(auditChainStatus([row("2026-09-01T10:00:00Z", null, "a"), row("2026-09-01T11:00:00Z", "x", "b")])).toEqual({
      linked: 0,
      breaks: 1,
    });
  });

  it("escapes visitor-supplied text and prints the pack hash", () => {
    const raw = JSON.stringify({
      generatedAt: "2026-09-30T10:00:00Z",
      scope: { from: "2026-09-01", to: "2026-09-30" },
      rbacMatrix: { roles: [], organisationMemberships: [] },
      retentionPolicyReport: [],
      accessLogExtract: [],
      visitorAccessExtract: [
        {
          siteId: "s1",
          visitorDisplayName: "<script>alert(1)</script>",
          visitorTypeCode: "t1",
          hostDisplayName: null,
          visitStatusCode: "c1",
          checkedInAt: "2026-09-14T20:00:00Z",
          checkedOutAt: null,
          offlineCaptured: false,
        },
      ],
    });
    const html = renderEvidenceReportHtml("pack-1", raw, "abc123", {
      organisationName: "Hotel Etuna",
      typeLabels: new Map([["t1", "General visitor"]]),
      userEmails: new Map(),
      siteNames: new Map([["s1", "Reception"]]),
      timeZone: "Africa/Windhoek",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("abc123");
    expect(html).toContain("General visitor");
  });

  it("renders the privacy protections and providers when the pack carries them, and omits them for an older pack", () => {
    const base = {
      generatedAt: "2026-10-07T10:00:00Z",
      scope: { generatedFor: "org-wide" },
      rbacMatrix: { roles: [], organisationMemberships: [] },
      retentionPolicyReport: [],
      accessLogExtract: [],
      visitorAccessExtract: null,
    };
    const lookups = { organisationName: "Clinic", typeLabels: new Map(), userEmails: new Map(), siteNames: new Map(), timeZone: "Africa/Windhoek" };
    const withPosture = renderEvidenceReportHtml(
      "p",
      JSON.stringify({
        ...base,
        privacyPosture: {
          automatic: ["Visit records are removed 365 days after check-out."],
          retentionDays: 365,
          lastRun: null,
          dataRequests: { open: 2, dueSoon: 1, overdue: 0 },
          subprocessors: [{ name: "Neon", purpose: "Database", region: "Frankfurt, Germany", visitorPersonalData: true, outsideNamibia: true }],
          note: "Not a statement of legal compliance.",
        },
      }),
      "h",
      lookups,
    );
    expect(withPosture).toContain("5. Privacy protections in force");
    expect(withPosture).toContain("Frankfurt, Germany (outside Namibia)");
    expect(withPosture).toContain("2 open, 1 due within 7 days, 0 overdue");
    expect(withPosture).not.toContain("Checkpoint by Buffr");
    expect(withPosture).not.toContain("<small>by Buffr");
    expect(renderEvidenceReportHtml("p", JSON.stringify(base), "h", lookups)).not.toContain("Privacy protections in force");
  });
});
