/**
 * Search over a host list for the manual check-in picker. Names are encrypted at rest, so matching happens after decryption in
 * memory, on one organisation's hosts only. Ranking: names that start with the query, then names that contain it, then department
 * matches; ties by name. Case and accents are ignored, and every word typed must match.
 */
export interface SearchableHost {
  displayName: string;
  department: string | null;
  active: boolean;
}

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function searchHosts<T extends SearchableHost>(hosts: T[], query: string | undefined, limit = 20): T[] {
  const cap = Number.isFinite(limit) && limit >= 1 ? Math.min(Math.trunc(limit), 100) : 20;
  const words = fold(query ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const active = hosts.filter((h) => h.active);
  if (words.length === 0) return [...active].sort((a, b) => a.displayName.localeCompare(b.displayName)).slice(0, cap);

  const scored: Array<{ host: T; rank: number }> = [];
  for (const host of active) {
    const name = fold(host.displayName);
    const dept = fold(host.department ?? "");
    if (!words.every((w) => name.includes(w) || dept.includes(w))) continue;
    const rank = words.every((w) => name.startsWith(w) || name.split(/\s+/).some((part) => part.startsWith(w)))
      ? name.startsWith(words[0])
        ? 0
        : 1
      : words.every((w) => name.includes(w))
        ? 2
        : 3;
    scored.push({ host, rank });
  }
  return scored
    .sort((a, b) => a.rank - b.rank || a.host.displayName.localeCompare(b.host.displayName))
    .slice(0, cap)
    .map((s) => s.host);
}
