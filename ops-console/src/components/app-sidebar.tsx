"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { opsNavItems } from "@/navigation/sidebar-items";

import { LogoutButton } from "./logout-button";

export function AppSidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link prefetch={false} href="/">
                <Image src="/icon.png" alt="" width={64} height={64} className="size-8 shrink-0 rounded-md" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-heading font-semibold text-base tracking-tight">Checkpoint</span>
                  <span className="truncate text-muted-foreground text-xs">Platform Ops</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Control plane</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {opsNavItems.map((item) => {
                const active = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={
                        active
                          ? "bc-active-soft data-active:bg-[color-mix(in_srgb,var(--color-sodium-yellow)_14%,var(--color-pure-white))]"
                          : undefined
                      }
                    >
                      <Link prefetch={false} href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <p className="truncate px-2 text-muted-foreground text-xs group-data-[collapsible=icon]:hidden">
          {email}
        </p>
        <LogoutButton />
      </SidebarFooter>
    </Sidebar>
  );
}
