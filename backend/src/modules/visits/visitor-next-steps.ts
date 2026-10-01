/**
 * Front-desk next-step copy after check-in (§8.1, §8.8, §11.9.4 D).
 * Capture is at reception; the visitor is waiting for a person/department
 * (and optionally a badge/pass), not "done with the kiosk."
 */

export type VisitorNextSteps = {
  hostDisplayName: string;
  hostDepartment: string | null;
  /** Short success headline focused on who they are meeting. */
  headline: string;
  /** Primary instruction shown under the headline. */
  instruction: string;
  /** Where to wait — always reception for walk-in QR/kiosk unless overridden. */
  waitLocation: string;
  badgeRequired: boolean;
  badgeInstruction: string | null;
  /** Reception wait-queue ticket (null if queue unavailable). */
  queueNumber: number | null;
  peopleAhead: number | null;
  confirmationCode?: string | null;
};

const BADGE_USUALLY_REQUIRED = new Set(["contractor", "temporary_staff", "restricted_site"]);

export function resolveVisitorNextSteps(input: {
  visitorFirstName: string;
  hostDisplayName: string;
  hostDepartment: string | null;
  visitorTypeCode: string;
  queueNumber?: number | null;
  peopleAhead?: number | null;
}): VisitorNextSteps {
  const host = input.hostDisplayName.trim() || "your host";
  const department = input.hostDepartment?.trim() || null;
  const hostLabel = department ? `${host} (${department})` : host;
  const first = input.visitorFirstName.trim() || "Visitor";
  const type = input.visitorTypeCode.trim().toLowerCase();
  const badgeRequired = BADGE_USUALLY_REQUIRED.has(type);
  const queueNumber = input.queueNumber ?? null;
  const peopleAhead = input.peopleAhead ?? null;

  let instruction: string;
  if (type === "delivery") {
    instruction = `Please wait at reception. ${hostLabel} has been notified about your delivery and will meet you here.`;
  } else if (type === "interview") {
    instruction = `Please wait at reception. ${hostLabel} has been notified and will collect you for your interview.`;
  } else {
    instruction = `Please wait at reception. ${hostLabel} has been notified and will come to meet you, or reception will call them.`;
  }
  if (queueNumber != null) {
    const ahead =
      peopleAhead == null
        ? ""
        : peopleAhead === 0
          ? " You are next."
          : ` ${peopleAhead} visitor${peopleAhead === 1 ? "" : "s"} ahead of you.`;
    instruction += ` Your queue ticket is #${queueNumber}.${ahead}`;
  }

  const badgeInstruction = badgeRequired
    ? "Collect your visitor pass or temporary badge from reception before you leave the desk."
    : null;

  return {
    hostDisplayName: host,
    hostDepartment: department,
    headline: `${first}, wait for ${host}`,
    instruction,
    waitLocation: "reception",
    badgeRequired,
    badgeInstruction,
    queueNumber,
    peopleAhead,
  };
}
