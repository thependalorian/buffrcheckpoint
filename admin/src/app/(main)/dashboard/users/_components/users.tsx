"use client";
import * as React from "react";

import {
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type PaginationState,
  type SortingState,
  useTable,
} from "@tanstack/react-table";

import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dataTableFeatures } from "@/lib/data-table-features";

import { filters, type UserRow } from "./types";
import { usersColumns } from "./users-columns";
import { UsersTable } from "./users-table";

export function Users({
  users,
  roles,
  sites,
}: {
  users: UserRow[];
  roles: Array<{ code: string; label: string }>;
  sites: Array<{ id: string; name: string }>;
}) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({
    search: false,
  });
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useTable({
    features: dataTableFeatures,
    data: users,
    columns: usersColumns({ roles, sites }),
    state: {
      rowSelection,
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
    getRowId: (row) => row.id,
    autoResetPageIndex: false,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  });

  const _searchQuery = (table.getColumn("search")?.getFilterValue() as string | undefined) ?? "";
  const roleFilter = (table.getColumn("roleLabel")?.getFilterValue() as string | undefined) ?? filters.role[0];
  const _statusFilter = (table.getColumn("status")?.getFilterValue() as string | undefined) ?? filters.status[0];
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const roleFilterOptions = ["All", ...Array.from(new Set(users.map((u) => u.roleLabel))).sort()];

  function setColumnSelectFilter(columnId: string, value: string) {
    table.getColumn(columnId)?.setFilterValue(value === "All" ? undefined : value);
    table.setPageIndex(0);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 px-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4">
          <Select value={roleFilter} onValueChange={(value) => setColumnSelectFilter("roleLabel", value)}>
            <SelectTrigger size="sm">
              <span className="text-muted-foreground">Role:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectGroup>
                {roleFilterOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <div className="text-muted-foreground text-sm tabular-nums">{selectedCount} selected</div>
        </div>

        <UsersTable table={table} />
      </CardContent>
    </Card>
  );
}
