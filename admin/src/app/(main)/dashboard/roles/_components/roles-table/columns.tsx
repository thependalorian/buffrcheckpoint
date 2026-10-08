"use client";
import Link from "next/link";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { cn } from "@/lib/utils";

import type { BuffrRole } from "./types";

export const rolesColumns: ColumnDef<DataTableFeatures, BuffrRole>[] = [
  {
    id: "search",
    accessorFn: (row) => `${row.roleCode} ${row.roleLabel} ${row.permittedActions.join(" ")}`,
    filterFn: "includesString",
    enableHiding: true,
  },
  {
    id: "roleCode",
    accessorKey: "roleCode",
    header: "Role code",
    size: 180,
    minSize: 180,
    cell: ({ row }) => <span className="font-medium text-sm">{row.original.roleCode}</span>,
  },
  {
    id: "roleLabel",
    accessorKey: "roleLabel",
    header: "Role label",
    size: 180,
    cell: ({ row }) => <span className="text-sm">{row.original.roleLabel}</span>,
  },
  {
    id: "release",
    accessorKey: "release",
    header: "Release",
    size: 120,
    cell: ({ row }) => (
      <Badge className="rounded-sm" variant="outline">
        {row.original.release}
      </Badge>
    ),
  },
  {
    id: "assignmentCount",
    accessorKey: "assignmentCount",
    header: "Assignments",
    size: 70,
    cell: ({ row }) => <span className="text-sm">{row.original.assignmentCount}</span>,
  },
  {
    id: "permittedActions",
    accessorFn: (row) => row.permittedActions.join(" "),
    header: "Permitted actions",
    size: 310,
    cell: ({ row }) => (
      <div className="flex flex-wrap items-center justify-start gap-2">
        {row.original.permittedActions.slice(0, 3).map((action) => (
          <Badge className="rounded-sm" variant="outline" key={action}>
            {action}
          </Badge>
        ))}
        {row.original.permittedActions.length > 3 ? (
          <span className="text-sm tabular-nums">+{row.original.permittedActions.length - 3}</span>
        ) : null}
      </div>
    ),
  },
  {
    id: "lastReview",
    accessorKey: "lastReview",
    header: "Last review",
    size: 120,
    cell: ({ row }) => <span className="text-sm">{row.original.lastReview ?? "Never"}</span>,
  },
  {
    id: "reviewStatus",
    accessorKey: "reviewStatus",
    header: "Status",
    size: 130,
    filterFn: "equalsString",
    cell: ({ row }) => {
      const reviewStatusClass: Record<typeof row.original.reviewStatus, string> = {
        active: "border-success/25 bg-success-soft text-success-ink",
        pending_review: "border-warning/40 bg-warning-soft text-warning-ink",
        expired: "border-destructive/20 bg-destructive/10 text-destructive",
      };
      return (
        <Badge className={cn("rounded-sm", reviewStatusClass[row.original.reviewStatus])} variant="outline">
          {row.original.reviewStatus}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "",
    size: 70,
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48" align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/users">Assign users</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/roles">View permission sets</Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    enableColumnFilter: false,
  },
];
