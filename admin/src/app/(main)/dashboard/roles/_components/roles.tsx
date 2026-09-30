"use client";
import { type ReactNode, useState } from "react";
import Link from "next/link";

import { type ColumnFiltersState, type PaginationState, useTable } from "@tanstack/react-table";
import { Search } from "lucide-react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dataTableFeatures } from "@/lib/data-table-features";

import { rolesColumns } from "./roles-table/columns";
import type { BuffrRole } from "./roles-table/types";
import { RolesTable } from "./roles-table/table";

function _getRoleTypeFilter(groupFilter: string) {
  if (groupFilter === "Site plan") {
    return "Site";
  }

  if (groupFilter === "Release 1") {
    return "Release 1";
  }

  if (groupFilter === "Network+") {
    return "Network+";
  }

  if (groupFilter === "Enterprise") {
    return "Enterprise";
  }

  return "All";
}

function getRoleGroupFilterValue(typeFilter: string) {
  if (typeFilter === "Site") {
    return "Site plan";
  }

  if (typeFilter === "Release 1") {
    return "Release 1";
  }

  if (typeFilter === "Network+") {
    return "Network+";
  }

  if (typeFilter === "Enterprise") {
    return "Enterprise";
  }

  return undefined;
}

export function Roles({
  roles,
  accessReviewsSlot,
  assignUsersHref = "/dashboard/users",
}: {
  roles: BuffrRole[];
  accessReviewsSlot?: ReactNode;
  assignUsersHref?: string;
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
          <p className="text-muted-foreground text-sm">
            Review the role catalogue, live assignment counts, and permission scopes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={assignUsersHref}>Assign users</Link>
          </Button>
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
            <Alert>
              <AlertTitle>Fixed role catalogue</AlertTitle>
              <AlertDescription>
                You assign people to roles in this catalogue. You do not invent custom permissions. Owner-Operator
                covers front desk and site admin for small teams. Assign people under Users.
              </AlertDescription>
              <AlertAction>
                <Button size="sm" variant="link" asChild>
                  <Link href={assignUsersHref}>Go to Users</Link>
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
                        <SelectItem value="Site">Site plan</SelectItem>
                        <SelectItem value="Release 1">Release 1</SelectItem>
                        <SelectItem value="Network+">Network+</SelectItem>
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
          <div className="overflow-hidden rounded-xl border border-border/70 bg-background">
            <div className="divide-y divide-border/70">
              {roles.length === 0 ? (
                <p className="px-4 py-8 text-center text-muted-foreground text-sm">No roles loaded.</p>
              ) : (
                roles.map((role) => (
                  <div
                    key={role.roleCode}
                    className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{role.roleLabel}</p>
                      <p className="text-muted-foreground text-xs">
                        {role.roleCode} · {role.release} · {role.scopeType} scope · {role.assignmentCount} assigned
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:max-w-md sm:justify-end">
                      {role.permittedActions.length === 0 ? (
                        <span className="text-muted-foreground text-xs">No permissions listed</span>
                      ) : (
                        role.permittedActions.map((permission) => (
                          <span
                            key={`${role.roleCode}-${permission}`}
                            className="rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 font-mono text-[11px]"
                          >
                            {permission}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
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
