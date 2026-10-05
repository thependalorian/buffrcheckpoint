import type { SiteOption } from "@/components/features/sites/site-select";
import { api } from "@/lib/api/client";

/** Active sites for pickers; an empty list (not an error page) when the call fails. */
export async function listSiteOptions(): Promise<SiteOption[]> {
  try {
    const rows = await api.get<Array<{ id: string; name: string }>>("/sites");
    return rows.map((row) => ({ id: row.id, name: row.name }));
  } catch {
    return [];
  }
}
