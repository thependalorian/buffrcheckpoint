"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { Subscribe } from "@tanstack/react-table";
import { Check, Clock, X } from "lucide-react";

import { ChangeUserRoleSheet } from "@/app/(main)/dashboard/_components/policy-create-sheets";
import { StatusChip } from "@/components/status-chip";
import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { cn, getInitials } from "@/lib/utils";

import { statusTone, type UserRow } from "./types";

function RoleCell({ role, label }: { role: string; label: string }) {
  return (
    <div className="grid gap-0.5">
      <span className="whitespace-nowrap">{label}</span>
      <span className="text-muted-foreground text-xs">{role}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: UserRow["status"] }) {
  return <StatusChip tone={statusTone[status]}>{status}</StatusChip>;
}

function getAvatarTone(name: string) {
  const tones = [
    "[&_[data-slot=avatar-fallback]]:bg-warning-soft [&_[data-slot=avatar-fallback]]:text-warning-ink after:border-frost",
    "[&_[data-slot=avatar-fallback]]:bg-success-soft [&_[data-slot=avatar-fallback]]:text-success-ink after:border-frost",
    "[&_[data-slot=avatar-fallback]]:bg-danger-soft [&_[data-slot=avatar-fallback]]:text-danger-ink after:border-frost",
    "[&_[data-slot=avatar-fallback]]:bg-info-soft [&_[data-slot=avatar-fallback]]:text-info-ink after:border-frost",
  ];
  return tones[name.length % tones.length];
}

function getLastActiveBadge(lastActive: number) {
  if (lastActive < 1) {
    return { className: "bg-success text-white [&>svg]:text-white", icon: Check };
  }
  if (lastActive < 4 * 60) {
    return { className: "bg-warning text-foreground", icon: Clock };
  }
  if (lastActive < 7 * 24 * 60) {
    return { className: "bg-destructive", icon: null };
  }
  return { className: "bg-muted-foreground text-muted", icon: X };
}

function AvatarCell({ lastActive, name }: { lastActive: number; name: string }) {
  const badge = getLastActiveBadge(lastActive);
  const BadgeIcon = badge.icon;

  return (
    <Avatar size="lg" className={cn("font-medium", getAvatarTone(name))}>
      <AvatarFallback>{getInitials(name)}</AvatarFallback>
      <AvatarBadge className={badge.className}>{BadgeIcon ? <BadgeIcon /> : null}</AvatarBadge>
    </Avatar>
  );
}

export function usersColumns({
  roles,
  sites,
}: {
  roles: Array<{ code: string; label: string }>;
  sites: Array<{ id: string; name: string }>;
}): ColumnDef<DataTableFeatures, UserRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Subscribe
            source={table.atoms.rowSelection}
            selector={() =>
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected() && "indeterminate")
            }
          >
            {(checked) => (
              <Checkbox
                aria-label="Select all users"
                checked={checked}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              />
            )}
          </Subscribe>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Subscribe source={row.table.atoms.rowSelection} selector={(selection) => Boolean(selection?.[row.id])}>
            {(checked) => (
              <Checkbox
                aria-label={`Select ${row.original.displayName}`}
                checked={checked}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
              />
            )}
          </Subscribe>
        </div>
      ),
      enableHiding: false,
      enableSorting: false,
    },
    {
      id: "search",
      accessorFn: (row) => `${row.displayName} ${row.email}`,
      filterFn: "includesString",
      enableHiding: true,
    },
    {
      accessorKey: "displayName",
      header: "User",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <AvatarCell name={row.original.displayName} lastActive={0} />
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground text-sm">{row.original.displayName}</div>
            <div className="truncate text-muted-foreground text-sm">{row.original.email}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "roleLabel",
      header: "Role",
      filterFn: "equalsString",
      cell: ({ row }) => <RoleCell role={row.original.roleCode} label={row.original.roleLabel} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      filterFn: "equalsString",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "createdAt",
      accessorFn: (row) => Date.parse(row.createdAt) || 0,
      header: "Joined",
      cell: ({ row }) => (
        <div className="text-foreground text-sm">{new Date(row.original.createdAt).toLocaleDateString()}</div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <ChangeUserRoleSheet
            userId={row.original.id}
            userEmail={row.original.email}
            currentRoleCode={row.original.roleCode}
            roles={roles}
            sites={sites}
          />
        </div>
      ),
      enableHiding: false,
      enableSorting: false,
    },
  ];
}
