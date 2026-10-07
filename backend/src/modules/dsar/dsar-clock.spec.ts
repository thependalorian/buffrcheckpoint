import { addMonthsUtc, canExtend, requestClock } from "./dsar-clock";

const d = (iso: string) => new Date(iso);

describe("addMonthsUtc", () => {
  it("adds a calendar month", () => expect(addMonthsUtc(d("2026-03-10T08:00:00Z"), 1).toISOString()).toBe("2026-04-10T08:00:00.000Z"));
  it("clamps to the end of a shorter month", () => {
    expect(addMonthsUtc(d("2026-01-31T00:00:00Z"), 1).toISOString()).toBe("2026-02-28T00:00:00.000Z");
    expect(addMonthsUtc(d("2028-01-31T00:00:00Z"), 1).toISOString()).toBe("2028-02-29T00:00:00.000Z");
  });
  it("rolls over the year", () => expect(addMonthsUtc(d("2026-12-15T00:00:00Z"), 2).toISOString()).toBe("2027-02-15T00:00:00.000Z"));
});

describe("requestClock", () => {
  const received = [{ occurredAt: d("2026-09-01T00:00:00Z"), reason: "request received" }];

  it("is due one month after receipt", () => {
    const c = requestClock(received, true, d("2026-09-10T00:00:00Z"));
    expect(c.dueAt?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(c.state).toBe("open");
  });

  it("flags due soon inside seven days and overdue after the date", () => {
    expect(requestClock(received, true, d("2026-09-26T00:00:00Z")).state).toBe("due_soon");
    expect(requestClock(received, true, d("2026-10-02T00:00:00Z")).state).toBe("overdue");
  });

  it("allows one extension, which moves the date by a further month", () => {
    const log = [...received, { occurredAt: d("2026-09-20T00:00:00Z"), reason: "extension: complex request" }];
    const c = requestClock(log, true, d("2026-10-02T00:00:00Z"));
    expect(c.extended).toBe(true);
    expect(c.dueAt?.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(c.state).toBe("open");
    expect(canExtend(c)).toBe(false);
    expect(canExtend(requestClock(received, true, d("2026-09-10T00:00:00Z")))).toBe(true);
  });

  it("stops the clock once the request is closed", () => {
    const c = requestClock(received, false, d("2027-01-01T00:00:00Z"));
    expect(c.state).toBe("closed");
    expect(canExtend(c)).toBe(false);
  });

  it("does not mistake an ordinary reason for an extension", () => {
    expect(requestClock([{ occurredAt: d("2026-09-01T00:00:00Z"), reason: "please extend this" }], true, d("2026-09-02T00:00:00Z")).extended).toBe(false);
  });
});
