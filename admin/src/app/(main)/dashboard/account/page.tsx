import { LockKeyhole } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth/me";

export default async function AccountPage() {
  const current = await getCurrentUser();
  const membership = current?.memberships[0];

  if (!current || !membership) {
    return (
      <div className="flex flex-col gap-4 py-4" data-content-padding="false">
        <Breadcrumb className="px-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <span>Dashboard</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <span>Access Administration</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>My Account</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center justify-center rounded-md border border-dashed py-8 text-muted-foreground text-sm">
          <LockKeyhole className="mr-2 size-4" />
          Sign in to view account details.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4" data-content-padding="false">
      <Breadcrumb className="px-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <span>Dashboard</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span>Access Administration</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>My Account</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-4">
          <div>
            <h1 className="font-semibold text-2xl tracking-tight">{current.user.email}</h1>
            <p className="text-muted-foreground text-sm">{current.activeOrganisation.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {current.user.mfaEnabled ? (
              <span className="text-green-600 text-sm dark:text-green-400">MFA enabled</span>
            ) : (
              <span className="text-amber-600 text-sm dark:text-amber-400">MFA not enabled</span>
            )}
          </div>
        </div>

        <Tabs className="min-h-0 flex-1 gap-0" defaultValue="overview">
          <div className="scrollbar-none touch-pan-x overflow-x-auto overscroll-x-contain border-y">
            <TabsList
              className="w-max min-w-full justify-start gap-4 px-4 *:data-[slot=tabs-trigger]:flex-none"
              variant="line"
            >
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>
          </div>

          <div className="px-4 md:px-6">
            <TabsContent value="overview" className="py-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Organisation</h3>
                  <div className="grid gap-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Organisation</span>
                      <span className="text-sm">{membership.organisationName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Email</span>
                      <span className="text-sm">{current.user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Email verified</span>
                      <span className="text-sm">{current.user.emailVerified ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Roles & Scope</h3>
                  <div className="grid gap-2">
                    {membership.roles.map((roleCode) => (
                      <div key={roleCode} className="flex justify-between">
                        <span className="text-muted-foreground text-sm">{roleCode}</span>
                        <span className="text-sm capitalize">
                          {membership.siteScopes.length > 0 ? "site" : "organisation"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security" className="py-4">
              <div className="space-y-4">
                <h3 className="font-medium text-sm">Security settings</h3>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between rounded-md border p-4">
                    <div>
                      <p className="font-medium text-sm">Multi-factor authentication</p>
                      <p className="text-muted-foreground text-sm">
                        {current.user.mfaEnabled
                          ? "MFA is enabled for your account."
                          : "MFA is not enabled. Enable it to secure your account."}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <a href="/auth/mfa/setup">{current.user.mfaEnabled ? "Manage" : "Enable"}</a>
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
