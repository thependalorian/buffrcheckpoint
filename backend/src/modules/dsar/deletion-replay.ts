import { createHmac } from "node:crypto";

/** The keyed HMAC of a subject id that a recovery tombstone stores (the same function the deletion workflow uses). */
export function subjectHmac(userId: string, pepper: string): string {
  return createHmac("sha256", pepper).update(userId).digest("hex");
}

export interface TombstoneRow {
  organisationId: string;
  subjectHmac: string;
  replayUntil: Date;
}

export interface UserRow {
  id: string;
  organisationId: string;
  deletedAt: Date | null;
  email: string;
}

/**
 * After a restore: the users that a live tombstone says were erased but whom the restored data shows as present (not soft-deleted, or
 * still carrying a real email). These are the rows the replay must erase again before traffic resumes (DL-10, RC-5).
 */
export function usersToEraseAgain(tombstones: TombstoneRow[], users: UserRow[], pepper: string, now: Date): UserRow[] {
  const live = tombstones.filter((t) => t.replayUntil.getTime() > now.getTime());
  const byHmac = new Map(live.map((t) => [`${t.organisationId}:${t.subjectHmac}`, t]));
  return users.filter((user) => {
    if (!byHmac.has(`${user.organisationId}:${subjectHmac(user.id, pepper)}`)) return false;
    return user.deletedAt === null || !user.email.endsWith("@erased.invalid");
  });
}
