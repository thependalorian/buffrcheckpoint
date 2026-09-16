import { DashboardErrorState, EmptyState } from "@/components/dashboard-state";
import { List, ListRow } from "@/components/ui/list";
import { apiFetch, loadOrError } from "@/lib/api";

import { InviteStaffForm, StaffRowControls } from "./_components/staff-controls";

interface StaffRow {
  userId: string;
  membershipId: string;
  email: string;
  roleCode: string;
  mfaEnabled: boolean;
  emailVerified: boolean;
  passwordSet: boolean;
  lastLoginAt: string | null;
  lockedUntil: string | null;
  deactivatedAt: string | null;
  assignedAt: string | null;
  isSelf: boolean;
}

function statusLine(row: StaffRow): string {
  const parts: string[] = [row.roleCode.replaceAll("_", " ")];
  if (row.deactivatedAt) parts.push("deactivated");
  else if (!row.passwordSet) parts.push("invitation pending");
  else if (!row.emailVerified) parts.push("email unverified");
  else if (!row.mfaEnabled) parts.push("no authenticator MFA");
  if (row.lockedUntil && new Date(row.lockedUntil) > new Date()) parts.push("locked");
  parts.push(row.lastLoginAt ? `last signed in ${new Date(row.lastLoginAt).toLocaleDateString()}` : "never signed in");
  return parts.join(" · ");
}

// Buffr's own staff list. Customer user administration stays in each
// customer's admin console; this screen only ever touches accounts inside the
// platform's home organisation.
export default async function StaffPage() {
  const result = await loadOrError(() => apiFetch<StaffRow[]>("/platform/staff"));

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">Platform Staff</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const staff = result.data;
  const active = staff.filter((row) => !row.deactivatedAt);
  const withoutMfa = active.filter((row) => row.passwordSet && !row.mfaEnabled).length;

  return (
    <div>
      <h1 className="font-heading font-light text-2xl text-foreground">Platform Staff</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        {active.length} active internal account(s)
        {withoutMfa > 0 ? ` · ${withoutMfa} without authenticator MFA` : ""}. Invitations set a password over a
        single-use link that expires in one hour.
      </p>

      <div className="mt-6">
        <h2 className="mb-2 font-medium text-sm">Invite a staff member</h2>
        <InviteStaffForm />
      </div>

      <div className="mt-8">
        <h2 className="mb-2 font-medium text-sm">Accounts</h2>
        {staff.length === 0 ? (
          <EmptyState
            title="No staff accounts found"
            description="Invite the first platform_support account above. Until then the console has no internal users besides seeded ones."
          />
        ) : (
          <List>
            {staff.map((row) => (
              <ListRow key={row.userId} className={row.deactivatedAt ? "opacity-60" : undefined}>
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm">{row.email}</p>
                  <p className="text-muted-foreground text-xs">{statusLine(row)}</p>
                </div>
                {row.deactivatedAt ? (
                  <span className="text-muted-foreground text-xs">
                    Deactivated {new Date(row.deactivatedAt).toLocaleDateString()}
                  </span>
                ) : (
                  <StaffRowControls userId={row.userId} passwordSet={row.passwordSet} isSelf={row.isSelf} />
                )}
              </ListRow>
            ))}
          </List>
        )}
      </div>
    </div>
  );
}
