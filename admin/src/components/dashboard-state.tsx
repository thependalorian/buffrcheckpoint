import type { ReactNode } from "react";

import Link from "next/link";

import { Ban, Inbox, ServerCrash, ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

function parseErrorStatus(message: string): number | null {
  const match = message.match(/^API error (\d+)/);
  return match ? Number(match[1]) : null;
}

function classifyForbidden(message: string): "verification" | "mfa" | "rbac" {
  const lower = message.toLowerCase();
  if (lower.includes("verified email")) return "verification";
  if (lower.includes("multi-factor") || lower.includes("mfa")) return "mfa";
  return "rbac";
}

export function DashboardErrorState({ message }: { message: string }) {
  const status = parseErrorStatus(message);
  const isForbidden = status === 401 || status === 403;

  if (!isForbidden) {
    return (
      <Alert variant="destructive">
        <ServerCrash />
        <AlertTitle>Could not load this page</AlertTitle>
        <AlertDescription>
          The backend did not respond as expected. Reload the page, and let Compliance know if this keeps happening.
        </AlertDescription>
      </Alert>
    );
  }

  const kind = classifyForbidden(message);
  if (kind === "verification") {
    return (
      <Alert variant="destructive">
        <ShieldAlert />
        <AlertTitle>Email verification required</AlertTitle>
        <AlertDescription>
          Confirm your email address before using this part of the product. Check your inbox for the confirmation link.
        </AlertDescription>
      </Alert>
    );
  }
  if (kind === "mfa") {
    return (
      <Alert variant="destructive">
        <ShieldAlert />
        <AlertTitle>Authenticator MFA required</AlertTitle>
        <AlertDescription>
          This action needs multi-factor authentication. Finish authenticator setup, then try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <Ban />
      <AlertTitle>You do not have access to this</AlertTitle>
      <AlertDescription>
        Your role does not carry the permission this screen requires. Ask a System Administrator to review your role
        assignment.
      </AlertDescription>
    </Alert>
  );
}

export function TableEmptyRow({
  colSpan,
  title,
  description,
  icon,
  action,
}: {
  colSpan: number;
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="whitespace-normal p-10">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center">
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"
          >
            {icon ?? <Inbox className="size-4" />}
          </span>
          <p className="font-medium">{title}</p>
          {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
          {action ? <div className="mt-2">{action}</div> : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

/** The next step out of an empty list: a quiet outline button that links to the screen that fills it. */
export function EmptyActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button asChild size="sm" variant="outline">
      <Link href={href}>{children}</Link>
    </Button>
  );
}

/** The empty state for a page or section that is not a table: a quiet panel with an icon, one sentence and an optional next step. */
export function EmptyPanel({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="bc-panel flex flex-col items-center gap-2 py-10 text-center">
      <span aria-hidden className="bc-icon-box size-9">
        {icon ?? <Inbox className="size-4" />}
      </span>
      <p className="font-medium">{title}</p>
      {description ? <p className="max-w-sm text-muted-foreground text-sm">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
