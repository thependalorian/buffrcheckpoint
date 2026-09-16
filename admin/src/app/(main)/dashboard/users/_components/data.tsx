export type UserStatus = "active" | "pending" | "deactivated" | "locked" | "suspended";

export type UserRow = {
  id: string;
  email: string;
  displayName: string;
  roleCode: string;
  roleLabel: string;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
};

// Static user demo data removed — no fake users may ship in the Buffr Checkpoint
// admin application. Populate from GET /users?organisationId=... responses,
// subject to backend permission checks.

export const filters = {
  role: ["All"],
  status: ["All", "active", "pending", "deactivated", "locked", "suspended"],
};

export const statusMeta: Record<UserStatus, { badgeClass: string; dotClass: string }> = {
  active: {
    badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  pending: {
    badgeClass: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dotClass: "bg-amber-500",
  },
  deactivated: {
    badgeClass: "border-border bg-muted/50 text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
  locked: {
    badgeClass: "border-destructive/20 bg-destructive/10 text-destructive",
    dotClass: "bg-destructive",
  },
  suspended: {
    badgeClass: "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400",
    dotClass: "bg-orange-500",
  },
};
