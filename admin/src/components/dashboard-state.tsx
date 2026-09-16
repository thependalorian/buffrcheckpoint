import { Ban, ServerCrash, ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
