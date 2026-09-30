"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { Subscribe } from "@tanstack/react-table";
import { Check, Clock, X } from "lucide-react";

import { ChangeUserRoleSheet } from "@/app/(main)/dashboard/_components/policy-create-sheets";
import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { cn, getInitials } from "@/lib/utils";

import { statusMeta, type UserRow } from "./types";

function RoleCell({ role, label }: { role: string; label: string }) {
  return (
    <div className="grid gap-0.5">
      <span className="whitespace-nowrap">{label}</span>
      <span className="text-muted-foreground text-xs">{role}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: UserRow["status"] }) {
  const meta = statusMeta[status];

  return (
    <Badge className={cn("gap-1.5 border px-2 py-1 font-medium", meta.badgeClass)} variant="outline">
      <span className={cn("size-1.5 rounded-full", meta.dotClass)} />
      {status}
    </Badge>
  );
}

function getAvatarTone(name: string) {
  const tones = [
    "[&_[data-slot=avatar-fallback]]:bg-amber-100 [&_[data-slot=avatar-fallback]]:text-amber-700 after:border-amber-200 dark:[&_[data-slot=avatar-fallback]]:bg-amber-500/15 dark:[&_[data-slot=avatar-fallback]]:text-amber-300 dark:after:border-amber-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-orange-100 [&_[data-slot=avatar-fallback]]:text-orange-700 after:border-orange-200 dark:[&_[data-slot=avatar-fallback]]:bg-orange-500/15 dark:[&_[data-slot=avatar-fallback]]:text-orange-300 dark:after:border-orange-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-rose-100 [&_[data-slot=avatar-fallback]]:text-rose-700 after:border-rose-200 dark:[&_[data-slot=avatar-fallback]]:bg-rose-500/15 dark:[&_[data-slot=avatar-fallback]]:text-rose-300 dark:after:border-rose-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-emerald-100 [&_[data-slot=avatar-fallback]]:text-emerald-700 after:border-emerald-200 dark:[&_[data-slot=avatar-fallback]]:bg-emerald-500/15 dark:[&_[data-slot=avatar-fallback]]:text-emerald-300 dark:after:border-emerald-500/20",
  ];
  return tones[name.length % tones.length];
}

function getLastActiveBadge(lastActive: number) {
  if (lastActive < 1) {
    return { className: "bg-green-600 text-green-950 [&>svg]:text-white", icon: Check };
  }
  if (lastActive < 4 * 60) {
    return { className: "bg-amber-500 text-amber-950", icon: Clock };
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
