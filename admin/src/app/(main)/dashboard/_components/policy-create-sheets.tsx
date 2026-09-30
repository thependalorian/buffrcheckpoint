"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import {
  createAccessPolicyAction,
  createDeviceAction,
  createFormDefinitionAction,
  createPrivacyDocumentAction,
  createRetentionPolicyAction,
  inviteUserAction,
  changeUserRoleAction,
  issueCredentialAction,
  revokeCredentialAction,
  retireDeviceAction,
  setDeviceStatusAction,
  validateCredentialAction,
} from "@/app/(main)/dashboard/_actions/policy-device-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

function useSheetSubmit() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return { open, setOpen, error, setError, pending, startTransition, router };
}

export function CreateFormSheet({ sites }: { sites: Array<{ id: string; name: string }> }) {
  const state = useSheetSubmit();
  return (
    <Sheet open={state.open} onOpenChange={state.setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">Add form</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create visitor form</SheetTitle>
          <SheetDescription>Creates a form definition and an empty draft version. Open the builder to add fields, then publish.</SheetDescription>
        </SheetHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            state.setError(null);
            const data = new FormData(event.currentTarget);
            state.startTransition(async () => {
              try {
                const created = await createFormDefinitionAction({
                  formName: String(data.get("formName") ?? ""),
                  visitorCategoryCode: String(data.get("visitorCategoryCode") ?? "general"),
                  siteId: String(data.get("siteId") ?? "") || undefined,
                });
                state.setOpen(false);
                state.router.push(`/dashboard/policies/forms/${created.id}`);
              } catch (err) {
                state.setError(err instanceof Error ? err.message : "Could not create form");
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="formName">Form name</Label>
            <Input id="formName" name="formName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="visitorCategoryCode">Visitor type code</Label>
            <Input id="visitorCategoryCode" name="visitorCategoryCode" defaultValue="general" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siteId">Site (optional)</Label>
            <select id="siteId" name="siteId" className="flex h-9 w-full rounded-md border px-3 text-sm">
              <option value="">Organisation-wide</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
          {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
          <Button type="submit" disabled={state.pending} className="w-full">
            {state.pending ? "Saving…" : "Create draft"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function CreateAccessPolicySheet({ sites }: { sites: Array<{ id: string; name: string }> }) {
  const state = useSheetSubmit();
  return (
    <Sheet open={state.open} onOpenChange={state.setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">Add access policy</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Access policy</SheetTitle>
          <SheetDescription>JSON config for host approval, photo capture, and channel rules.</SheetDescription>
        </SheetHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            state.setError(null);
            const data = new FormData(event.currentTarget);
            state.startTransition(async () => {
              try {
                await createAccessPolicyAction({
                  siteId: String(data.get("siteId") ?? "") || undefined,
                  configJson: String(data.get("configJson") ?? "{}"),
                });
                state.setOpen(false);
                state.router.refresh();
              } catch (err) {
                state.setError(err instanceof Error ? err.message : "Could not create policy");
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="siteId">Site</Label>
            <select id="siteId" name="siteId" className="flex h-9 w-full rounded-md border px-3 text-sm">
              <option value="">Organisation default</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="configJson">Config JSON</Label>
            <Textarea
              id="configJson"
              name="configJson"
              rows={8}
              defaultValue={'{\n  "hostApprovalRequired": true,\n  "photoCaptureEnabled": false\n}'}
              required
            />
          </div>
          {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
          <Button type="submit" disabled={state.pending} className="w-full">
            {state.pending ? "Saving…" : "Create policy"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function CreateRetentionSheet({ sites }: { sites: Array<{ id: string; name: string }> }) {
  const state = useSheetSubmit();
  return (
    <Sheet open={state.open} onOpenChange={state.setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">Add retention policy</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Retention policy</SheetTitle>
          <SheetDescription>Sets retention days for visitor records at a site or organisation-wide.</SheetDescription>
        </SheetHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            state.setError(null);
            const data = new FormData(event.currentTarget);
            state.startTransition(async () => {
              try {
                await createRetentionPolicyAction({
                  siteId: String(data.get("siteId") ?? "") || undefined,
                  retentionDays: Number(data.get("retentionDays") ?? 90),
                });
                state.setOpen(false);
                state.router.refresh();
              } catch (err) {
                state.setError(err instanceof Error ? err.message : "Could not create retention policy");
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="siteId">Site</Label>
            <select id="siteId" name="siteId" className="flex h-9 w-full rounded-md border px-3 text-sm">
              <option value="">Organisation default</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="retentionDays">Retention days</Label>
            <Input id="retentionDays" name="retentionDays" type="number" min={1} defaultValue={90} required />
          </div>
          {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
          <Button type="submit" disabled={state.pending} className="w-full">
            {state.pending ? "Saving…" : "Create policy"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function CreatePrivacyNoticeSheet() {
  const state = useSheetSubmit();
  return (
    <Sheet open={state.open} onOpenChange={state.setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          Add privacy notice
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Privacy notice</SheetTitle>
          <SheetDescription>Creates a document version and publishes it for kiosk display.</SheetDescription>
        </SheetHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            state.setError(null);
            const data = new FormData(event.currentTarget);
            state.startTransition(async () => {
              try {
                await createPrivacyDocumentAction({
                  policyCode: String(data.get("policyCode") ?? "privacy_notice"),
                  policyName: String(data.get("policyName") ?? "Visitor privacy notice"),
                  contentText: String(data.get("contentText") ?? ""),
                  languageCode: String(data.get("languageCode") ?? "en"),
                });
                state.setOpen(false);
                state.router.refresh();
              } catch (err) {
                state.setError(err instanceof Error ? err.message : "Could not publish notice");
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="policyCode">Policy code</Label>
            <Input id="policyCode" name="policyCode" defaultValue="privacy_notice" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="policyName">Title</Label>
            <Input id="policyName" name="policyName" defaultValue="Visitor privacy notice" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="languageCode">Language code</Label>
            <Input id="languageCode" name="languageCode" defaultValue="en" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contentText">Notice text</Label>
            <Textarea id="contentText" name="contentText" rows={10} required />
          </div>
          {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
          <Button type="submit" disabled={state.pending} className="w-full">
            {state.pending ? "Publishing…" : "Publish notice"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function CreateDeviceSheet({ sites }: { sites: Array<{ id: string; name: string }> }) {
  const state = useSheetSubmit();
  return (
    <Sheet open={state.open} onOpenChange={state.setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">Register device</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Register kiosk device</SheetTitle>
          <SheetDescription>Provisions a managed device row before CRAN activation.</SheetDescription>
        </SheetHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            state.setError(null);
            const data = new FormData(event.currentTarget);
            state.startTransition(async () => {
              try {
                await createDeviceAction({
                  siteId: String(data.get("siteId") ?? ""),
                  manufacturer: String(data.get("manufacturer") ?? ""),
                  model: String(data.get("model") ?? ""),
                  serialNumber: String(data.get("serialNumber") ?? ""),
                });
                state.setOpen(false);
                state.router.refresh();
              } catch (err) {
                state.setError(err instanceof Error ? err.message : "Could not register device");
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="siteId">Site</Label>
            <select id="siteId" name="siteId" required className="flex h-9 w-full rounded-md border px-3 text-sm">
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input id="manufacturer" name="manufacturer" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input id="model" name="model" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="serialNumber">Serial number</Label>
            <Input id="serialNumber" name="serialNumber" required />
          </div>
          {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
          <Button type="submit" disabled={state.pending} className="w-full">
            {state.pending ? "Saving…" : "Register"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function InviteUserSheet({
  roles,
  sites,
}: {
  roles: Array<{ code: string; label: string }>;
  sites: Array<{ id: string; name: string }>;
}) {
  const state = useSheetSubmit();
  const [roleCode, setRoleCode] = useState(roles[0]?.code ?? "front_desk_operator");

  return (
    <Sheet open={state.open} onOpenChange={state.setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">Invite user</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Invite user</SheetTitle>
          <SheetDescription>
            Creates an organisation user with a chosen role. They must verify email before signing in. On a small site,
            one person holds Owner-Operator to cover several jobs.
          </SheetDescription>
        </SheetHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            state.setError(null);
            const data = new FormData(event.currentTarget);
            const siteId = String(data.get("siteId") ?? "");
            state.startTransition(async () => {
              try {
                await inviteUserAction({
                  email: String(data.get("email") ?? ""),
                  password: String(data.get("password") ?? ""),
                  roleCode: String(data.get("roleCode") ?? roleCode),
                  siteId: siteId || undefined,
                });
                state.setOpen(false);
                state.router.refresh();
              } catch (err) {
                state.setError(err instanceof Error ? err.message : "Could not invite user");
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Temporary password</Label>
            <Input id="password" name="password" type="password" minLength={12} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roleCode">Role</Label>
            <select
              id="roleCode"
              name="roleCode"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value)}
              required
            >
              {roles.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {sites.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="siteId">Site scope (optional)</Label>
              <select
                id="siteId"
                name="siteId"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                defaultValue=""
              >
                <option value="">Organisation-wide</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
          <Button type="submit" disabled={state.pending || roles.length === 0} className="w-full">
            {state.pending ? "Inviting…" : "Send invite"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function ChangeUserRoleSheet({
  userId,
  userEmail,
  currentRoleCode,
  roles,
  sites,
}: {
  userId: string;
  userEmail: string;
  currentRoleCode: string;
  roles: Array<{ code: string; label: string }>;
  sites: Array<{ id: string; name: string }>;
}) {
  const state = useSheetSubmit();
  const [roleCode, setRoleCode] = useState(
    roles.find((r) => r.code === currentRoleCode)?.code ?? roles[0]?.code ?? "front_desk_operator",
  );

  return (
    <Sheet open={state.open} onOpenChange={state.setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          Change role
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Change role</SheetTitle>
          <SheetDescription>
            Update access for {userEmail}. Role changes are audited. You are blocked from changing your own role.
          </SheetDescription>
        </SheetHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            state.setError(null);
            const data = new FormData(event.currentTarget);
            const siteId = String(data.get("siteId") ?? "");
            state.startTransition(async () => {
              try {
                await changeUserRoleAction({
                  userId,
                  newRoleCode: String(data.get("roleCode") ?? roleCode),
                  reason: String(data.get("reason") ?? ""),
                  siteId: siteId || undefined,
                });
                state.setOpen(false);
                state.router.refresh();
              } catch (err) {
                state.setError(err instanceof Error ? err.message : "Could not change role");
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor={`role-${userId}`}>Role</Label>
            <select
              id={`role-${userId}`}
              name="roleCode"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value)}
              required
            >
              {roles.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {sites.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor={`site-${userId}`}>Site scope (optional)</Label>
              <select
                id={`site-${userId}`}
                name="siteId"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                defaultValue=""
              >
                <option value="">Organisation-wide</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor={`reason-${userId}`}>Reason</Label>
            <Textarea id={`reason-${userId}`} name="reason" required minLength={8} rows={3} />
          </div>
          {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
          <Button type="submit" disabled={state.pending} className="w-full">
            {state.pending ? "Saving…" : "Save role change"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function IssueCredentialSheet() {
  const state = useSheetSubmit();
  const [issuedRef, setIssuedRef] = useState<string | null>(null);

  return (
    <Sheet
      open={state.open}
      onOpenChange={(open) => {
        state.setOpen(open);
        if (!open) setIssuedRef(null);
      }}
    >
      <SheetTrigger asChild>
        <Button size="sm">Issue credential</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Issue NFC credential</SheetTitle>
          <SheetDescription>
            Creates a server-issued opaque reference to encode on the tag. Never authenticate on tag UID alone.
          </SheetDescription>
        </SheetHeader>
        {issuedRef ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm">Encode this reference onto the NFC tag (NDEF text/URI payload):</p>
            <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-xs break-all whitespace-pre-wrap">
              {issuedRef}
            </pre>
            <Button type="button" className="w-full" onClick={() => state.setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              state.setError(null);
              const data = new FormData(event.currentTarget);
              state.startTransition(async () => {
                try {
                  const created = await issueCredentialAction({
                    holderTypeCode: String(data.get("holderTypeCode") ?? "visitor"),
                    holderId: String(data.get("holderId") ?? ""),
                    credentialTypeCode: String(data.get("credentialTypeCode") ?? "nfc_badge"),
                    expiresAt: String(data.get("expiresAt") ?? "") || undefined,
                  });
                  setIssuedRef(created.credentialReferenceHmac);
                  state.router.refresh();
                } catch (err) {
                  state.setError(err instanceof Error ? err.message : "Could not issue credential");
                }
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="holderTypeCode">Holder type</Label>
              <select
                id="holderTypeCode"
                name="holderTypeCode"
                required
                className="flex h-9 w-full rounded-md border px-3 text-sm"
                defaultValue="visitor"
              >
                <option value="visitor">Visitor</option>
                <option value="contractor">Contractor</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="holderId">Holder ID (UUID)</Label>
              <Input id="holderId" name="holderId" required placeholder="Visitor or contractor UUID" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credentialTypeCode">Credential type</Label>
              <select
                id="credentialTypeCode"
                name="credentialTypeCode"
                required
                className="flex h-9 w-full rounded-md border px-3 text-sm"
                defaultValue="nfc_badge"
              >
                <option value="nfc_badge">NFC badge</option>
                <option value="nfc_phone">NFC phone</option>
                <option value="printed_badge">Printed badge</option>
                <option value="diginam_reference">DigiNam reference</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires at (optional ISO)</Label>
              <Input id="expiresAt" name="expiresAt" type="datetime-local" />
            </div>
            {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
            <Button type="submit" disabled={state.pending} className="w-full">
              {state.pending ? "Issuing…" : "Issue"}
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function RevokeCredentialButton({ credentialId }: { credentialId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          const reason = window.prompt("Revocation reason");
          if (!reason?.trim()) return;
          setError(null);
          startTransition(async () => {
            try {
              await revokeCredentialAction(credentialId, reason.trim());
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Revoke failed");
            }
          });
        }}
      >
        {pending ? "…" : "Revoke"}
      </Button>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}

export function ValidateCredentialSheet() {
  const state = useSheetSubmit();
  const [result, setResult] = useState<string | null>(null);

  return (
    <Sheet open={state.open} onOpenChange={state.setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          Test validate
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Validate credential reference</SheetTitle>
          <SheetDescription>Support check against POST /credentials/validate.</SheetDescription>
        </SheetHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            state.setError(null);
            setResult(null);
            const data = new FormData(event.currentTarget);
            state.startTransition(async () => {
              try {
                const response = await validateCredentialAction(String(data.get("credentialReferenceHmac") ?? ""));
                setResult(
                  response.valid
                    ? `Valid — ${response.credentialId ?? "ok"}`
                    : `Rejected — ${response.reason ?? "unknown"}`,
                );
              } catch (err) {
                state.setError(err instanceof Error ? err.message : "Validate failed");
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="credentialReferenceHmac">Credential reference HMAC</Label>
            <Textarea id="credentialReferenceHmac" name="credentialReferenceHmac" required rows={3} />
          </div>
          {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
          {result ? <p className="text-sm">{result}</p> : null}
          <Button type="submit" disabled={state.pending} className="w-full">
            {state.pending ? "Checking…" : "Validate"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function RetireDeviceButton({ deviceId }: { deviceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        const reason = window.prompt("Retire reason");
        if (!reason?.trim()) return;
        startTransition(async () => {
          await retireDeviceAction(deviceId, reason.trim());
          router.refresh();
        });
      }}
    >
      {pending ? "…" : "Retire"}
    </Button>
  );
}

export function DeviceStatusButton({ deviceId }: { deviceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        const statusCode = window.prompt(
          "CRAN status code (e.g. approved_for_deployment, under_review, non_compliant)",
        );
        if (!statusCode?.trim()) return;
        const reason = window.prompt("Reason") ?? "admin transition";
        startTransition(async () => {
          await setDeviceStatusAction(deviceId, statusCode.trim(), reason.trim());
          router.refresh();
        });
      }}
    >
      {pending ? "…" : "Status"}
    </Button>
  );
}
