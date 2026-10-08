import { buildPrivacyPosture } from "./privacy-posture";
import { SUBPROCESSORS, subprocessorsWithVisitorData, unconfirmedRegions } from "../../common/privacy/subprocessors";

const input = {
  retentionDays: 365,
  retentionSource: "platform_default" as const,
  dispositionMode: "live" as const,
  outboxRedactionDays: 30,
  lastRun: null,
  dataRequests: { open: 1, dueSoon: 0, overdue: 0 },
};

describe("privacy posture", () => {
  it("states the retention period and clearing period actually in force", () => {
    const text = buildPrivacyPosture(input).automatic.join(" ");
    expect(text).toContain("365 days after check-out");
    expect(text).toContain("30 days after delivery");
    expect(text).not.toContain("not live");
  });

  it("is honest when disposal is not live in this environment", () => {
    expect(buildPrivacyPosture({ ...input, dispositionMode: "dry_run" }).automatic.join(" ")).toContain("not live in this environment");
  });

  it("makes no compliance claim", () => {
    const note = buildPrivacyPosture(input).note;
    expect(note).toContain("not a certification");
    expect(note.toLowerCase()).not.toMatch(/remains? responsible|own legal obligations/);
  });

  it("lists every subprocessor and never invents a region", () => {
    expect(buildPrivacyPosture(input).subprocessors).toHaveLength(SUBPROCESSORS.length);
    for (const s of SUBPROCESSORS) expect(s.region.length).toBeGreaterThan(0);
    expect(unconfirmedRegions().map((s) => s.name)).toContain("BulkSMS Namibia");
    expect(subprocessorsWithVisitorData().map((s) => s.name)).toEqual(expect.arrayContaining(["Neon", "Railway"]));
  });
});
