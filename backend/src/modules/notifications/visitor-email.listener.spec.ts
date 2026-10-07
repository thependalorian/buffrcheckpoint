jest.mock("@nestjs/event-emitter", () => ({ OnEvent: () => () => undefined }));

import { VisitorCheckedInEvent, VisitorCheckedOutEvent } from "../../common/domain-events/visitor-email.events";
import { VisitorEmailListener } from "./visitor-email.listener";

describe("VisitorEmailListener", () => {
  const checkedIn = new Date("2026-10-07T07:15:00Z");
  const checkedOut = new Date("2026-10-07T08:20:00Z");

  it("sends a receipt to the address the visitor typed, with the details they need", async () => {
    const send = jest.fn(async () => ({}));
    const listener = new VisitorEmailListener({ send } as never);
    await listener.onCheckedIn(
      new VisitorCheckedInEvent(
        "3f2a9c1e-1111-4222-8333-444455556666",
        "org-1",
        "maria@example.com",
        "Maria",
        "Main reception",
        "Facilities",
        checkedIn,
        "https://buffrcheckpoint.com/check-out?v=abc",
      ),
    );
    const input = (
      send.mock.calls[0] as unknown as [Record<string, unknown> & { variables: Record<string, string> }]
    )[0];
    expect(input.templateCode).toBe("visitor_visit_receipt");
    expect(input.to).toBe("maria@example.com");
    expect(input.recipientName).toBe("Maria");
    expect(input.variables).toMatchObject({
      siteName: "Main reception",
      hostName: "Facilities",
      visitReference: "3F2A9C1E",
      signOutUrl: "https://buffrcheckpoint.com/check-out?v=abc",
    });
    expect(input.variables.checkedInAt).toContain("09:15");
  });

  it("sends a sign-out thank-you with the time on site", async () => {
    const send = jest.fn(async () => ({}));
    const listener = new VisitorEmailListener({ send } as never);
    await listener.onCheckedOut(
      new VisitorCheckedOutEvent(
        "v1",
        "org-1",
        "maria@example.com",
        null,
        "Main reception",
        checkedIn,
        checkedOut,
        "https://buffrcheckpoint.com/rate?t=abc",
      ),
    );
    const input = (send.mock.calls[0] as unknown as [{ templateCode: string; variables: Record<string, string> }])[0];
    expect(input.templateCode).toBe("visitor_signout_thanks");
    expect(input.variables.duration).toBe("1 h 05 min");
    expect(input.variables.ratingUrl).toBe("https://buffrcheckpoint.com/rate?t=abc");
  });

  it("sends nothing to an address that is not a single plain address", async () => {
    const send = jest.fn();
    const listener = new VisitorEmailListener({ send } as never);
    await listener.onCheckedIn(
      new VisitorCheckedInEvent(
        "v1",
        "org-1",
        "a@b.com\r\nBcc: x@y.com",
        null,
        "Site",
        "Host",
        checkedIn,
        "https://buffrcheckpoint.com/check-out?v=abc",
      ),
    );
    await listener.onCheckedOut(
      new VisitorCheckedOutEvent(
        "v1",
        "org-1",
        "not-an-email",
        null,
        "Site",
        checkedIn,
        checkedOut,
        "https://buffrcheckpoint.com/rate?t=abc",
      ),
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("never throws into the check-in when the email cannot be queued", async () => {
    const listener = new VisitorEmailListener({
      send: jest.fn(async () => {
        throw new Error("outbox down");
      }),
    } as never);
    await expect(
      listener.onCheckedIn(
        new VisitorCheckedInEvent(
          "v1",
          "org-1",
          "maria@example.com",
          null,
          "Site",
          "Host",
          checkedIn,
          "https://buffrcheckpoint.com/check-out?v=abc",
        ),
      ),
    ).resolves.toBeUndefined();
  });
});
