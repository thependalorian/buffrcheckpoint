import { DashboardErrorState } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";

import { AccessReviewsTab } from "./_components/access-reviews-tab";
import { Roles } from "./_components/roles";
import type { BuffrRole } from "./_components/roles-table/data";

interface BackendRoleRow {
  id: string;
  roleCode: string;
  label: string;
  isSystemRole: boolean;
}

export default async function Page() {
  let roles: BuffrRole[] = [];
  let error: string | null = null;
  try {
    const rows = await api.get<BackendRoleRow[]>("/rbac/roles");
    roles = rows.map((row) => ({
      roleCode: row.roleCode,
      roleLabel: row.label,
      release: row.isSystemRole ? "Checkpoint Core" : "Checkpoint Professional",
      scopeType: "organisation",
      assignmentCount: 0,
      permittedActions: [],
      lastReview: null,
      reviewStatus: "active",
    }));
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load roles.";
  }

  if (error) return <DashboardErrorState message={error} />;

  return <Roles roles={roles} accessReviewsSlot={<AccessReviewsTab />} />;
}
