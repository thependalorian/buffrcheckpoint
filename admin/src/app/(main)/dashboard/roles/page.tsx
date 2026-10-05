import { DashboardErrorState } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";

import { AccessReviewsTab } from "./_components/access-reviews-tab";
import { Roles } from "./_components/roles";
import type { BuffrRole } from "./_components/roles-table/types";

interface BackendRoleRow {
  id: string;
  roleCode: string;
  label: string;
  isSystemRole: boolean;
  release: string;
  scopeType: BuffrRole["scopeType"];
  assignmentCount: number;
  permittedActions: string[];
  lastReview: string | null;
  reviewStatus: BuffrRole["reviewStatus"];
}

export default async function Page() {
  let roles: BuffrRole[] = [];
  let error: string | null = null;
  try {
    const rows = await api.get<BackendRoleRow[]>("/rbac/roles");
    roles = rows.map((row) => ({
      roleCode: row.roleCode,
      roleLabel: row.label,
      release: row.release,
      scopeType: row.scopeType,
      assignmentCount: row.assignmentCount,
      permittedActions: row.permittedActions,
      lastReview: row.lastReview,
      reviewStatus: row.reviewStatus,
    }));
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load roles.";
  }

  if (error) return <DashboardErrorState message={error} />;

  return <Roles roles={roles} accessReviewsSlot={<AccessReviewsTab />} assignUsersHref="/dashboard/users" />;
}
