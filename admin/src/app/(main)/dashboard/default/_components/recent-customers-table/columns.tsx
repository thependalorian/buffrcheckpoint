"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { Subscribe } from "@tanstack/react-table";
import { addMinutes, differenceInCalendarDays, endOfToday, format, parseISO } from "date-fns";
import { CircleCheckIcon, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { cn } from "@/lib/utils";

import type { VisitRosterRow } from "./schema";
import { VisitOpsActions } from "./visit-ops-actions";
import { isIdentityAssuranceLevelCode } from "@/lib/canonical-codes";

function assuranceIcon(level: string) {
  if (!isIdentityAssuranceLevelCode(level)) return null;
  switch (level) {
    case "V0":
      return <CircleCheckIcon className="fill-muted stroke-primary-foreground dark:fill-muted" />;
    case "V1":
      return <CircleCheckIcon className="fill-blue-500 stroke-primary-foreground dark:fill-blue-600" />;
    case "V2":
      return <CircleCheckIcon className="fill-green-500 stroke-primary-foreground dark:fill-green-600" />;
    case "V3":
      return <CircleCheckIcon className="fill-purple-500 stroke-primary-foreground dark:fill-purple-600" />;
    case "V4":
      return <CircleCheckIcon className="fill-amber-500 stroke-primary-foreground dark:fill-amber-600" />;
    default:
      return null;
  }
}

export const visitRosterColumns: ColumnDef<DataTableFeatures, VisitRosterRow>[] = [
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
              checked={checked}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Select all visits on this page"
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
              checked={checked}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label={`Select visit for ${row.original.visitorDisplayName}`}
            />
          )}
        </Subscribe>
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "visitorDisplayName",
    header: "Visitor",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-md border bg-muted">
          <UserRound className="size-4 text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-end justify-between gap-3">
            <div className="grid min-w-0 gap-0.5">
              <span className="truncate font-medium text-sm leading-none">{row.original.visitorDisplayName}</span>
              <span className="truncate text-muted-foreground text-xs leading-none">
                #{row.original.visitId.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    enableHiding: false,
  },
  {
    id: "search",
    accessorFn: (row) => `${row.visitId} ${row.visitorDisplayName} ${row.hostDisplayName ?? ""}`,
    filterFn: "includesString",
    enableHiding: true,
  },
  {
    accessorKey: "visitorTypeCode",
    header: "Visitor type",
    filterFn: "equalsString",
    cell: ({ row }) => (
      <Badge variant="outline" className="px-1.5 text-muted-foreground">
        {row.original.visitorTypeCode}
      </Badge>
    ),
  },
  {
    accessorKey: "hostDisplayName",
    header: "Host",
    cell: ({ row }) => <span className="text-sm">{row.original.hostDisplayName ?? "—"}</span>,
  },
  {
    accessorKey: "assuranceLevelCode",
    header: "Assurance",
    filterFn: "equalsString",
    cell: ({ row }) => (
      <Badge variant="outline" className="px-1.5 text-muted-foreground">
        {assuranceIcon(row.original.assuranceLevelCode)}
        {row.original.assuranceLevelCode}
      </Badge>
    ),
  },
  {
    accessorKey: "visitStatusCode",
    header: "Status",
    filterFn: "equalsString",
    cell: ({ row }) => (
      <Badge variant="outline" className="px-1.5 text-muted-foreground">
        {row.original.visitStatusCode}
      </Badge>
    ),
  },
  {
    id: "checkedInWindow",
    accessorFn: (row) => {
      const daysSinceCheckIn = differenceInCalendarDays(endOfToday(), parseISO(row.checkedInAt));

      if (daysSinceCheckIn <= 1) return ["1", "7"];
      if (daysSinceCheckIn <= 7) return ["7"];
      return [];
    },
    filterFn: "arrIncludes",
    enableHiding: true,
  },
  {
    accessorKey: "checkedInAt",
    header: "Checked in",
    cell: ({ row }) => {
      const baseDate = parseISO(row.original.checkedInAt);
      const checkedInAt = addMinutes(baseDate, 0);

      return (
        <div className="grid gap-0.5">
          <span className="text-sm">{format(checkedInAt, "do MMMM yyyy")}</span>
          <span className="text-muted-foreground text-xs">at {format(checkedInAt, "h:mm a")}</span>
        </div>
      );
    },
  },
  {
    id: "requiresAction",
    accessorKey: "requiresAction",
    header: "Action",
    filterFn: "equalsString",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={cn(
          "px-1.5",
          row.original.requiresAction
            ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            : "text-muted-foreground",
        )}
      >
        {row.original.requiresAction ? "Required" : "None"}
      </Badge>
    ),
  },
  {
    id: "ops",
    header: "Ops",
    cell: ({ row }) => (
      <VisitOpsActions visitId={row.original.visitId} visitStatusCode={row.original.visitStatusCode} />
    ),
  },
];
