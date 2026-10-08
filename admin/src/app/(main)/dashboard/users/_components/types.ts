import type { StatusTone } from "@/components/status-chip";

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

export const statusTone: Record<UserStatus, StatusTone> = {
  active: "success",
  pending: "warning",
  deactivated: "info",
  locked: "danger",
  suspended: "warning",
};
