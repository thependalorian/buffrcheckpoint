import {
  inductionRefusal,
  isNoticeKind,
  MAX_NOTICE_LENGTH,
  NOTICE_KINDS,
  NoticeRuleError,
  normaliseNoticeText,
  policyCodesFor,
} from "./site-notices";

describe("site notices", () => {
  it("knows exactly two kinds, each tied to its QR type and policy code", () => {
    expect(isNoticeKind("emergency")).toBe(true);
    expect(isNoticeKind("induction")).toBe(true);
    expect(isNoticeKind("privacy")).toBe(false);
    expect(NOTICE_KINDS.emergency.qrType).toBe("emergency_info");
    expect(NOTICE_KINDS.induction.qrType).toBe("contractor_induction");
  });

  it("tries the site's own text first and falls back to the organisation-wide text", () => {
    expect(policyCodesFor("emergency", "site-1")).toEqual(["emergency_information:site-1", "emergency_information"]);
    expect(policyCodesFor("induction", null)).toEqual(["contractor_induction"]);
  });

  it("normalises line breaks and refuses text that is empty, too short or too long", () => {
    expect(normaliseNoticeText("  Assemble at the car park.\r\nCall 10111 now.  ")).toBe(
      "Assemble at the car park.\nCall 10111 now.",
    );
    expect(() => normaliseNoticeText("short")).toThrow(NoticeRuleError);
    expect(() => normaliseNoticeText("   ")).toThrow(NoticeRuleError);
    expect(() => normaliseNoticeText(null)).toThrow(NoticeRuleError);
    expect(() => normaliseNoticeText("x".repeat(MAX_NOTICE_LENGTH + 1))).toThrow(NoticeRuleError);
    expect(normaliseNoticeText("x".repeat(MAX_NOTICE_LENGTH))).toHaveLength(MAX_NOTICE_LENGTH);
  });

  it("lets only a checked-in contractor acknowledge the induction", () => {
    expect(inductionRefusal({ visitorTypeCode: "contractor", checkedOut: false })).toBeNull();
    expect(inductionRefusal(null)).toMatch(/Check in first/);
    expect(inductionRefusal({ visitorTypeCode: "contractor", checkedOut: true })).toMatch(/Check in first/);
    expect(inductionRefusal({ visitorTypeCode: "general", checkedOut: false })).toMatch(/for contractors/);
    expect(inductionRefusal({ visitorTypeCode: null, checkedOut: false })).toMatch(/for contractors/);
  });
});
