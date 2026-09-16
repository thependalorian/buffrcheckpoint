import type { CSSProperties, ReactNode } from "react";

import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { cn } from "cn";

import { AppSidebar } from "@/components/app-sidebar";
import { DashboardErrorState } from "@/components/dashboard-state";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { apiFetch } from "@/lib/api";
import { clearSessionCookie, getSessionToken } from "@/lib/auth/session";

interface Me {
  user: { email: string };
  memberships: Array<{ roles: string[] }>;
  permissions?: string[];
}

function isPlatformSupport(me: Me): boolean {
  const roles = me.memberships.flatMap((m) => m.roles);
  if (roles.includes("platform_support")) return true;
  return (me.permissions ?? []).some((p) => p.startsWith("platform."));
}

export default async function ConsoleLayout({ children }: Readonly<{ children: ReactNode }>) {
  const token = await getSessionToken();
  if (!token) redirect("/login");

  let me: Me;
  try {
    me = await apiFetch<Me>("/auth/me");
  } catch {
    await clearSessionCookie();
    redirect("/login");
  }

  if (!isPlatformSupport(me)) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
        <h1 className="font-heading font-light text-2xl">Wrong workspace</h1>
        <DashboardErrorState message="API error 403: Role lacks platform_support" />
        <p className="text-muted-foreground text-sm">
          Signed in as a customer admin role (for example owner_operator). Ops needs a{" "}
          <span className="font-medium">platform_support</span> account. Sign out and use your Buffr staff email, or ask
          an administrator to grant platform_support on this user.
        </p>
        <Link href="/login" className="font-medium text-sm underline underline-offset-4">
          Back to sign in
        </Link>
      </main>
    );
  }

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={{ "--sidebar-width": "calc(var(--spacing) * 64)" } as CSSProperties}
    >
      <AppSidebar email={me.user.email} />
      <SidebarInset
        className={cn(
          "min-w-0 overflow-x-clip",
          "[--dashboard-header-height:--spacing(12)]",
          "peer-data-[variant=inset]:border",
        )}
      >
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
          <p className="font-medium text-muted-foreground text-sm">Platform Ops Console</p>
        </header>
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
