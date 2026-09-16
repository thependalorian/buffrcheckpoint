"use client";
import { type ReactNode, useState } from "react";

import { type ColumnFiltersState, type PaginationState, useTable } from "@tanstack/react-table";
import { AlertTriangle, ChevronRight, FileUp, Search } from "lucide-react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dataTableFeatures } from "@/lib/data-table-features";

import { rolesColumns } from "./roles-table/columns";
import type { BuffrRole } from "./roles-table/data";
import { RolesTable } from "./roles-table/table";

function _getRoleTypeFilter(groupFilter: string) {
  if (groupFilter === "Checkpoint Core") {
    return "Core";
  }

  if (groupFilter === "Release 1") {
    return "Release 1";
  }

  if (groupFilter === "Professional+") {
    return "Professional+";
  }

  if (groupFilter === "Enterprise") {
    return "Enterprise";
  }

  return "All";
}

function getRoleGroupFilterValue(typeFilter: string) {
  if (typeFilter === "Core") {
    return "Checkpoint Core";
  }

  if (typeFilter === "Release 1") {
    return "Release 1";
  }

  if (typeFilter === "Professional+") {
    return "Professional+";
  }

  if (typeFilter === "Enterprise") {
    return "Enterprise";
  }

  return undefined;
}

export function Roles({
  roles,
  accessReviewsSlot,
}: {
  roles: BuffrRole[];
  accessReviewsSlot?: ReactNode;
}) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 12,
  });

  const table = useTable({
    features: dataTableFeatures,
    data: roles,
    columns: rolesColumns,
    defaultColumn: {
      size: 140,
      minSize: 80,
      maxSize: 420,
    },
    state: { columnFilters, pagination },
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
    initialState: {
      columnVisibility: { release: false, search: false },
    },
  });

  const search = (table.getColumn("search")?.getFilterValue() as string | undefined) ?? "";
  const releaseFilter = (table.getColumn("release")?.getFilterValue() as string | undefined) ?? "";
  const statusFilter = (table.getColumn("reviewStatus")?.getFilterValue() as string | undefined) ?? "All";

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl tracking-tight">Roles & Access</h1>
          <p className="text-muted-foreground text-sm">Manage role catalogue, assignments, and permission scopes.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            <FileUp data-icon="inline-start" />
            Import JSON
          </Button>
          <Button size="sm">Create role</Button>
        </div>
      </div>

      <Tabs className="h-full gap-4" defaultValue="roles">
        <TabsList
          variant="line"
          className="w-full justify-start gap-2 border-b ps-0 *:data-[slot=tabs-trigger]:flex-none"
        >
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permission-sets">Permission sets</TabsTrigger>
          <TabsTrigger value="access-reviews">Access reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          <div className="flex flex-col gap-4">
            <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
              <AlertTriangle className="size-4" />
              <AlertTitle>Review required</AlertTitle>
              <AlertDescription>Some roles have unreviewed permission changes.</AlertDescription>
              <AlertAction>
                <Button size="sm" variant="link">
                  Review changes
                  <ChevronRight data-icon="inline-end" />
                </Button>
              </AlertAction>
            </Alert>

            <div className="overflow-hidden rounded-xl border border-border/70 bg-background">
              <div className="flex flex-col items-stretch gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <InputGroup className="h-7 w-full rounded-md sm:w-82">
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                  <InputGroupInput
                    className="h-7"
                    placeholder="Search roles..."
                    value={search}
                    onChange={(e) => {
                      table.getColumn("search")?.setFilterValue(e.target.value || undefined);
                      table.setPageIndex(0);
                    }}
                  />
                </InputGroup>

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={releaseFilter}
                    onValueChange={(v) => {
                      table.getColumn("release")?.setFilterValue(getRoleGroupFilterValue(v));
                      table.setPageIndex(0);
                    }}
                  >
                    <SelectTrigger size="sm">
                      <span className="text-muted-foreground">Release:</span>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent position="popper" align="start">
                      <SelectGroup>
                        <SelectItem value="All">All</SelectItem>
                        <SelectItem value="Core">Checkpoint Core</SelectItem>
                        <SelectItem value="Release 1">Release 1</SelectItem>
                        <SelectItem value="Professional+">Professional+</SelectItem>
                        <SelectItem value="Enterprise">Enterprise</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  <Select
                    value={statusFilter}
                    onValueChange={(v) => {
                      table.getColumn("reviewStatus")?.setFilterValue(v === "All" ? undefined : v);
                      table.setPageIndex(0);
                    }}
                  >
                    <SelectTrigger size="sm">
                      <span className="text-muted-foreground">Status:</span>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent position="popper" align="start">
                      <SelectGroup>
                        <SelectItem value="All">All</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending_review">Pending review</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <RolesTable table={table} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="permission-sets">
          <div className="flex h-full items-center justify-center rounded-md border border-dashed text-muted-foreground text-sm">
            Permission Sets Coming Soon
          </div>
        </TabsContent>
        <TabsContent value="access-reviews">
          {accessReviewsSlot ?? (
            <div className="flex h-full items-center justify-center rounded-md border border-dashed text-muted-foreground text-sm">
              Access reviews are not available for your role.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
