interface CimsoStatusCardProps {
  statusCode: string;
  transportConfigured: boolean;
  afterNdaRequired: boolean;
  notes: string;
}

export function CimsoStatusCard({ statusCode, transportConfigured, afterNdaRequired, notes }: CimsoStatusCardProps) {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground text-xs">Connection status</p>
          <p className="font-medium text-sm capitalize">{statusCode.replaceAll("_", " ")}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Transport configured</p>
          <p className="font-medium text-sm">{transportConfigured ? "Yes" : "No"}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Live TCP client</p>
          <p className="font-medium text-sm">{afterNdaRequired ? "Pending" : "Credentials present"}</p>
        </div>
      </div>
      <p className="text-muted-foreground text-sm">{notes}</p>
      <p className="text-muted-foreground text-xs">
        Passwords are never accepted in this form. Set the env var named by each site&apos;s credentials secret ref (for
        example <code className="text-xs">CIMSO_SITE_DEMO_CLIENT_PASSWORD</code>) in Railway. Synced reservations become
        invitations for kiosk and website QR check-in.
      </p>
    </div>
  );
}
