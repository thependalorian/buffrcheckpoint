import Link from "next/link";
import { Ban, ServerCrash, ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

function parseErrorStatus(message: string): number | null {
  const match = message.match(/API error (\d+)/i);
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
          {status ? `Backend returned ${status}. ` : null}
          Reload the page. If this keeps happening, check that the API is up and your session is still valid.
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
        <AlertDescription>Confirm your email before using the ops console.</AlertDescription>
      </Alert>
    );
  }
  if (kind === "mfa") {
    return (
      <Alert variant="destructive">
        <ShieldAlert />
        <AlertTitle>Authenticator MFA required</AlertTitle>
        <AlertDescription>Finish authenticator setup, then sign in again.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <Ban />
      <AlertTitle>Platform Support access required</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          This console is only for Buffr <span className="font-medium">platform_support</span> staff. A customer admin
          session cannot load these screens.
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href="/login">Sign in with a platform_support account</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-muted-foreground text-sm">{description}</p>
      {actionHref && actionLabel ? (
        <Button asChild className="mt-4" size="sm">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function TableEmptyRow({
  colSpan,
  title,
  description,
}: {
  colSpan: number;
  title: string;
  description: string;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="p-8 text-center">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-muted-foreground text-sm">{description}</p>
      </TableCell>
    </TableRow>
  );
}
