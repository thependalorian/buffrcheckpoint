import { InviteUserSheet } from "@/app/(main)/dashboard/_components/policy-create-sheets";
import { DashboardErrorState } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";

import type { UserRow } from "./_components/data";
import { Users } from "./_components/users";

interface BackendUserRow {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  mfaEnabled: boolean;
  roleCode: string | null;
  siteId: string | null;
}

export default async function Page() {
  let users: UserRow[] = [];
  let error: string | null = null;
  try {
    const rows = await api.get<BackendUserRow[]>("/rbac/users");
    users = rows.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.email.split("@")[0] ?? row.email,
      roleCode: row.roleCode ?? "unassigned",
      roleLabel: row.roleCode ?? "Unassigned",
      status: row.emailVerifiedAt ? "active" : "pending",
      lastLoginAt: null,
      createdAt: row.emailVerifiedAt ?? new Date().toISOString(),
    }));
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load users.";
  }

  if (error) return <DashboardErrorState message={error} />;
  return (
    <div className="space-y-4">
      <div className="flex justify-end px-4 pt-4">
        <InviteUserSheet />
      </div>
      <Users users={users} />
    </div>
  );
}
