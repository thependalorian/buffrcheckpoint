import { notificationDeliveryInstructions } from "../../db/schema";
import { NotificationsService } from "./notifications.service";

type Row = typeof notificationDeliveryInstructions.$inferSelect;

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    organisationId: "22222222-2222-2222-2222-222222222222",
    visitId: null,
    recipientReference: "person@example.com",
    channelCode: "33333333-3333-3333-3333-333333333333",
    statusCode: "44444444-4444-4444-4444-444444444444",
    subject: "Confirm your Buffr Checkpoint account",
    message: "Confirm your account",
    html: null,
    attachmentsJson: null,
    attemptCount: 0,
    nextAttemptAt: new Date("2026-10-07T10:00:00Z"),
    failureReason: null,
    sentAt: null,
    deletedAt: null,
    ...overrides,
  };
}

/** Fake drizzle: records every set()/values() payload, and returns `claimRows` from the claim's RETURNING. */
function harness(claimRows: Array<{ id: string }>) {
  const updates: Array<Record<string, unknown>> = [];
  const events: Array<Record<string, unknown>> = [];
  type UpdateChain = {
    set: (values: Record<string, unknown>) => UpdateChain;
    where: (condition: unknown) => UpdateChain;
    returning: (columns: unknown) => Promise<Array<{ id: string }>>;
  };
  const db = {
    update: jest.fn(() => {
      const chain: UpdateChain = {
        set: (values) => {
          updates.push(values);
          return chain;
        },
        where: () => chain,
        returning: () => Promise.resolve(claimRows),
      };
      return chain;
    }),
    insert: jest.fn(() => ({
      values: jest.fn((values: Record<string, unknown>) => {
        events.push(values);
        return Promise.resolve([values]);
      }),
    })),
  };
  const typeDefs = {
    codeById: jest.fn().mockResolvedValue("email"),
    id: jest.fn().mockImplementation((_domain: string, code: string) => Promise.resolve(`${code}-id`)),
  };
  const sms = { send: jest.fn() };
  const service = new NotificationsService(db as never, typeDefs as never, sms as never);
  return { service, updates, events, db, typeDefs };
}

describe("outbox dispatch claim", () => {
  it("skips a row another dispatcher already claimed", async () => {
    const { service, updates, events, db } = harness([]);

    await service.attemptDelivery(row());

    // Only the claim ran: no status event, no retry bookkeeping, no second attempt by this instance.
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ attemptCount: 1 });
    expect(events).toHaveLength(0);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("leases the row, attempts delivery and books the retry when it wins the claim", async () => {
    const { service, updates, events } = harness([{ id: "11111111-1111-1111-1111-111111111111" }]);

    await service.attemptDelivery(row());

    // The claim owns the row: attempt counted, lease in the future.
    expect(updates[0]).toMatchObject({ attemptCount: 1 });
    expect((updates[0].nextAttemptAt as Date).getTime()).toBeGreaterThan(Date.now());
    // No provider is configured in tests, so the attempt fails and the message is retried, not dropped.
    expect(updates[1]).toMatchObject({ attemptCount: 1, statusCode: "pending-id" });
    expect(String(updates[1].failureReason)).toContain("No email provider is configured");
    expect(events.at(-1)).toMatchObject({ note: "Retry 1/5 scheduled" });
  });

  it("fails the message permanently once the attempts run out, and says so", async () => {
    const { service, updates, events, typeDefs } = harness([{ id: "11111111-1111-1111-1111-111111111111" }]);
    typeDefs.id.mockResolvedValue("failed-id");

    await service.attemptDelivery(row({ attemptCount: 4 }));

    expect(updates.at(-1)).toMatchObject({ statusCode: "failed-id", attemptCount: 5 });
    expect(events.at(-1)).toMatchObject({ toStatusCode: "failed-id" });
  });
});
