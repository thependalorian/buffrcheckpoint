import { InviteUserSheet } from "@/app/(main)/dashboard/_components/policy-create-sheets";
import { DashboardErrorState } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";

import type { UserRow } from "./_components/types";
import { Users } from "./_components/users";

interface BackendUserRow {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  mfaEnabled: boolean;
  roleCode: string | null;
  roleLabel: string | null;
  siteId: string | null;
  lastLoginAt: string | null;
}

interface AssignableRole {
  code: string;
  label: string;
}

interface SiteRow {
  id: string;
  name: string;
}

export default async function Page() {
  let users: UserRow[] = [];
  let roles: AssignableRole[] = [];
  let sites: SiteRow[] = [];
  let error: string | null = null;
  try {
    const [userRows, roleRows, siteRows] = await Promise.all([
      api.get<BackendUserRow[]>("/rbac/users"),
      api.get<AssignableRole[]>("/rbac/assignable-roles"),
      api.get<SiteRow[]>("/sites").catch(() => [] as SiteRow[]),
    ]);
    roles = roleRows;
    sites = siteRows;
    users = userRows.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.email.split("@")[0] ?? row.email,
      roleCode: row.roleCode ?? "unassigned",
      roleLabel: row.roleLabel ?? row.roleCode ?? "Unassigned",
      status: row.emailVerifiedAt ? "active" : "pending",
      lastLoginAt: row.lastLoginAt,
      createdAt: row.emailVerifiedAt ?? new Date().toISOString(),
    }));
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load users.";
  }

  if (error) return <DashboardErrorState message={error} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
        <p className="max-w-xl text-muted-foreground text-sm">
          Invite teammates into roles from your organisation catalogue. Owner-Operator covers front desk and site admin
          on small teams. Split roles when your team grows.
        </p>
        <InviteUserSheet roles={roles} sites={sites} />
      </div>
      <Users users={users} roles={roles} sites={sites} />
    </div>
  );
}
