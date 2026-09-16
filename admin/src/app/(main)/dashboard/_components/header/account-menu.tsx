"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { BadgeCheck, LogOut, ShieldAlert } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";

// Replaces the earlier AccountSwitcher, which rendered a multi-account
// switching UI backed entirely by fake data (admin/src/data/users.ts).
// Release 1 is single-organisation-per-account — there is no membership or
// tenant-switching table in the schema for a real switcher to be backed
// by — so this shows the one real, currently authenticated identity
// (from GET /auth/me) instead of faking a feature that doesn't exist yet.
export function AccountMenu({
  email,
  roles,
  emailVerified,
}: {
  readonly email: string;
  readonly roles: readonly string[];
  readonly emailVerified: boolean;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-8 rounded-lg">
          <AvatarFallback>{getInitials(email)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 rounded-lg" side="bottom" align="end" sideOffset={4}>
        <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
          <span className="truncate font-medium text-sm">{email}</span>
          <span className="truncate text-muted-foreground text-xs capitalize">
            {roles.map((role) => role.replaceAll("_", " ")).join(", ") || "No role assigned"}
          </span>
        </DropdownMenuLabel>
        {!emailVerified ? (
          <>
            <DropdownMenuSeparator />
            <div className="flex items-start gap-2 px-2 py-1.5 text-amber-600 text-xs dark:text-amber-400">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>Email not verified. Some actions are restricted until you verify.</span>
            </div>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/profile">
            <BadgeCheck />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
