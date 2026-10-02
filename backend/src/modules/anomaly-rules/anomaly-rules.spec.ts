import {
  ANOMALY_RULE_DEFAULTS,
  type AnomalyRuleConfig,
  afterHoursTriggered,
  localTimeIn,
  outsideVisitorHours,
  repeatPhoneTriggered,
} from "./anomaly-rules";

const repeat: AnomalyRuleConfig = {
  ruleCode: "repeat_phone_window",
  isDefault: true,
  ...ANOMALY_RULE_DEFAULTS.repeat_phone_window,
};
const afterHours: AnomalyRuleConfig = {
  ruleCode: "after_hours_restricted_zone",
  isDefault: true,
  ...ANOMALY_RULE_DEFAULTS.after_hours_restricted_zone,
};

describe("anomaly rules", () => {
  it("repeat phone fires at the threshold, not before", () => {
    expect(repeatPhoneTriggered(2, repeat)).toBe(false);
    expect(repeatPhoneTriggered(3, repeat)).toBe(true);
    expect(repeatPhoneTriggered(5, { ...repeat, enabled: false })).toBe(false);
  });

  it("visitor hours window, including one that crosses midnight", () => {
    expect(outsideVisitorHours("06:59", "07:00", "18:00")).toBe(true);
    expect(outsideVisitorHours("07:00", "07:00", "18:00")).toBe(false);
    expect(outsideVisitorHours("18:00", "07:00", "18:00")).toBe(true);
    expect(outsideVisitorHours("23:30", "22:00", "06:00")).toBe(false);
    expect(outsideVisitorHours("12:00", "22:00", "06:00")).toBe(true);
  });

  it("after hours fires only for tier 3 and above", () => {
    expect(afterHoursTriggered({ zoneTierSortOrder: 2, localTime: "22:00", config: afterHours })).toBe(false);
    expect(afterHoursTriggered({ zoneTierSortOrder: 3, localTime: "22:00", config: afterHours })).toBe(true);
    expect(afterHoursTriggered({ zoneTierSortOrder: 4, localTime: "10:00", config: afterHours })).toBe(false);
    expect(afterHoursTriggered({ zoneTierSortOrder: null, localTime: "22:00", config: afterHours })).toBe(false);
  });

  it("reads local time in the site timezone", () => {
    // 20:30 UTC is 22:30 in Windhoek (UTC+2).
    expect(localTimeIn(new Date("2026-10-01T20:30:00Z"), "Africa/Windhoek")).toBe("22:30");
  });
});
