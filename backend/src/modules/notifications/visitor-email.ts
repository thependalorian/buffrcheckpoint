/** Helpers for the optional emails sent to visitors. Pure, so the rules can be tested without a database or a mailbox. */

/** One plain address: no display name, no line breaks, no second address. */
export function deliverableEmail(value: string | null | undefined): string | null {
  const email = (value ?? "").trim().toLowerCase();
  if (email.length < 6 || email.length > 160) return null;
  return /^[^\s@<>",;:\\]+@[^\s@<>",;:\\]+\.[^\s@<>",;:\\]{2,}$/.test(email) ? email : null;
}

const WINDHOEK = "Africa/Windhoek";

/** "7 Oct 2026, 09:15" in the site's time zone. */
export function formatWhen(date: Date | null | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: WINDHOEK,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** "1 h 05 min", "12 min", "under a minute". */
export function formatDuration(from: Date, to: Date): string {
  const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
  if (minutes < 1) return "under a minute";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours} h ${String(rest).padStart(2, "0")} min` : `${rest} min`;
}

/** A short reference a visitor can quote: the first block of the visit id, upper case. */
export function visitReference(visitId: string): string {
  return visitId.slice(0, 8).toUpperCase();
}
