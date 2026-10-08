import {
  IssueCredentialSheet,
  RevokeCredentialButton,
  ValidateCredentialSheet,
} from "@/app/(main)/dashboard/_components/policy-create-sheets";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState, EmptyActionLink, TableEmptyRow } from "@/components/dashboard-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";

interface CredentialRow {
  id: string;
  holderTypeCode: string;
  holderId: string;
  credentialTypeCode: string;
  credentialReferenceHmac: string;
  validUntil: string | null;
  deletedAt: string | null;
}

export default async function CredentialsPage() {
  let credentials: CredentialRow[] = [];
  let error: string | null = null;
  try {
    credentials = await api.get<CredentialRow[]>("/credentials");
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load credentials.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Credentials"
        description="NFC badges, token status, expiry, revocation, and contractor assignments."
        action={
          <div className="flex flex-wrap gap-2">
            <ValidateCredentialSheet />
            <IssueCredentialSheet />
          </div>
        }
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="h-11 p-3 font-medium">Type</TableHead>
                <TableHead className="h-11 p-3 font-medium">Holder</TableHead>
                <TableHead className="h-11 p-3 font-medium">Reference (encode)</TableHead>
                <TableHead className="h-11 p-3 font-medium">Valid until</TableHead>
                <TableHead className="h-11 p-3 font-medium">Status</TableHead>
                <TableHead className="h-11 p-3 font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {credentials.length === 0 ? (
                <TableEmptyRow
                  colSpan={6}
                  title="No credentials issued yet"
                  action={<EmptyActionLink href="/dashboard/front-desk">Open the front desk</EmptyActionLink>}
                  description="Section 12.2: a credential is a random server-issued reference, never a static NFC UID. Issue the first badge to a contractor or repeat visitor to get started."
                />
              ) : (
                credentials.map((credential) => (
                  <TableRow key={credential.id}>
                    <TableCell className="p-3 font-medium">{credential.credentialTypeCode}</TableCell>
                    <TableCell className="p-3 font-mono text-xs">
                      {credential.holderTypeCode}:{credential.holderId.slice(0, 8)}…
                    </TableCell>
                    <TableCell
                      className="max-w-[12rem] truncate p-3 font-mono text-xs"
                      title={credential.credentialReferenceHmac}
                    >
                      {credential.credentialReferenceHmac}
                    </TableCell>
                    <TableCell className="p-3">
                      {credential.validUntil ? new Date(credential.validUntil).toLocaleDateString() : "No expiry"}
                    </TableCell>
                    <TableCell className="p-3">
                      <Badge variant={credential.deletedAt ? "outline" : "secondary"}>
                        {credential.deletedAt ? "Revoked" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-3">
                      {!credential.deletedAt ? <RevokeCredentialButton credentialId={credential.id} /> : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
