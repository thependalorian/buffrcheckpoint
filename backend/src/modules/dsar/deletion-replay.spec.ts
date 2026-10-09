import { subjectHmac, usersToEraseAgain } from "./deletion-replay";

const pepper = "p".repeat(40);
const now = new Date("2026-10-09T12:00:00.000Z");
const day = 86_400_000;

const tomb = (userId: string, org = "o1", until = new Date(now.getTime() + 5 * day)) => ({
  organisationId: org,
  subjectHmac: subjectHmac(userId, pepper),
  replayUntil: until,
});

describe("restore replay (DL-10, RC-5)", () => {
  it("finds a user who was erased before the backup but is present again after the restore", () => {
    const users = [
      { id: "u1", organisationId: "o1", deletedAt: null, email: "back@example.org" },
      { id: "u2", organisationId: "o1", deletedAt: null, email: "never-erased@example.org" },
    ];
    expect(usersToEraseAgain([tomb("u1")], users, pepper, now).map((u) => u.id)).toEqual(["u1"]);
  });

  it("leaves a user who is already erased alone", () => {
    const users = [{ id: "u1", organisationId: "o1", deletedAt: now, email: "erased-u1@erased.invalid" }];
    expect(usersToEraseAgain([tomb("u1")], users, pepper, now)).toEqual([]);
  });

  it("ignores a tombstone past its replay window and a tombstone of another organisation", () => {
    const users = [{ id: "u1", organisationId: "o1", deletedAt: null, email: "a@example.org" }];
    expect(usersToEraseAgain([tomb("u1", "o1", new Date(now.getTime() - day))], users, pepper, now)).toEqual([]);
    expect(usersToEraseAgain([tomb("u1", "o2")], users, pepper, now)).toEqual([]);
  });

  it("does not match with a different pepper", () => {
    const users = [{ id: "u1", organisationId: "o1", deletedAt: null, email: "a@example.org" }];
    expect(usersToEraseAgain([tomb("u1")], users, "q".repeat(40), now)).toEqual([]);
  });
});
