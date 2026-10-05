"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { type SiteOption, SiteSelect } from "@/components/features/sites/site-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { brandingCopy, LOGO_MIME_TYPES, logoErrorMessage, validateLogoFile } from "@/lib/copy/branding";

import { setupBrandingAndPublish } from "./actions";

async function uploadLogo(file: File): Promise<string> {
  const invalid = validateLogoFile(file);
  if (invalid) throw new Error(invalid);
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/branding/logo", { method: "POST", body });
  const result = (await response.json().catch(() => ({}))) as {
    code?: string;
    error?: string;
    logoArtifactId?: string;
  };
  if (!response.ok || !result.logoArtifactId) {
    throw new Error(logoErrorMessage(result.code, result.error));
  }
  return result.logoArtifactId;
}

interface PublishedPreview {
  displayName: string;
  welcomeMessage: string;
  brandColour: string;
  logoSrc: string | null;
}

export function BrandingSetupSheet({
  sites,
  showReturnToReadiness = false,
}: {
  sites: readonly SiteOption[];
  showReturnToReadiness?: boolean;
}) {
  const copy = brandingCopy;
  const [open, setOpen] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoArtifactId, setLogoArtifactId] = useState<string | undefined>();
  const [published, setPublished] = useState<PublishedPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(
    () => () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    },
    [logoPreview],
  );

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setLogoError(null);
    // Thumbnail first, so the user sees what they picked even while it uploads.
    setLogoPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      setLogoArtifactId(await uploadLogo(file));
    } catch (err) {
      setLogoArtifactId(undefined);
      setLogoPreview(null);
      setLogoError(err instanceof Error ? err.message : copy.errors.upload);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    setSaveError(null);
    setPending(true);
    const field = (name: string) => String(formData.get(name) ?? "");
    try {
      const result = await setupBrandingAndPublish({
        siteId: field("siteId") || undefined,
        profileName: field("profileName"),
        organisationDisplayName: field("organisationDisplayName"),
        siteDisplayName: field("siteDisplayName"),
        welcomeMessage: field("welcomeMessage"),
        brandColourToken: field("brandColourToken"),
        logoArtifactId,
        helpContactReference: field("helpContactReference"),
      });
      if (!result.ok) {
        setSaveError(result.message);
        return;
      }
      setPublished({
        displayName: field("siteDisplayName") || field("organisationDisplayName"),
        welcomeMessage: field("welcomeMessage"),
        brandColour: field("brandColourToken"),
        logoSrc: logoPreview,
      });
      router.refresh();
    } catch {
      setSaveError(copy.saveFailed);
    } finally {
      setPending(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setPublished(null);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button size="sm">{copy.trigger}</Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{copy.title}</SheetTitle>
          <SheetDescription>{copy.description}</SheetDescription>
        </SheetHeader>
        {published ? (
          <div className="mt-6 space-y-4">
            <p role="status" className="font-medium text-sm">
              {copy.published.title}
            </p>
            <div className="space-y-3 rounded-md border p-4">
              <div className="h-1.5 rounded-full" style={{ backgroundColor: published.brandColour || undefined }} />
              {published.logoSrc ? (
                // biome-ignore lint/performance/noImgElement: local object-URL preview; next/image cannot optimise blob URLs
                <img src={published.logoSrc} alt={copy.fields.logoPreviewAlt} className="h-12 w-auto object-contain" />
              ) : null}
              {published.displayName ? <p className="font-heading text-lg">{published.displayName}</p> : null}
              {published.welcomeMessage ? (
                <p className="text-muted-foreground text-sm">{published.welcomeMessage}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              {showReturnToReadiness ? (
                <Button asChild className="min-h-11">
                  <Link href="/onboarding" prefetch={false}>
                    {copy.published.returnToReadiness}
                  </Link>
                </Button>
              ) : null}
              <Button variant="outline" className="min-h-11" onClick={() => handleOpenChange(false)}>
                {copy.published.close}
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit(new FormData(event.currentTarget));
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="organisationDisplayName">{copy.fields.organisationDisplayName}</Label>
              <Input id="organisationDisplayName" name="organisationDisplayName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcomeMessage">{copy.fields.welcomeMessage}</Label>
              <Input id="welcomeMessage" name="welcomeMessage" defaultValue={copy.fields.welcomeMessageDefault} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandColourToken">{copy.fields.brandColour}</Label>
              <Input id="brandColourToken" name="brandColourToken" defaultValue="#e2a603" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoFile">{copy.fields.logo}</Label>
              <Input
                id="logoFile"
                ref={fileInputRef}
                type="file"
                accept={LOGO_MIME_TYPES.join(",")}
                disabled={uploading}
                aria-describedby="logoFile-hint logoFile-error"
                aria-invalid={logoError ? true : undefined}
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />
              <p id="logoFile-hint" className="text-muted-foreground text-xs">
                {uploading ? copy.uploading : copy.dropzoneContract}
              </p>
              {logoError ? (
                <p id="logoFile-error" role="alert" className="text-destructive text-sm">
                  {logoError}
                </p>
              ) : null}
              {logoPreview ? (
                // biome-ignore lint/performance/noImgElement: local object-URL preview; next/image cannot optimise blob URLs
                <img
                  src={logoPreview}
                  alt={copy.fields.logoPreviewAlt}
                  className="mt-2 h-16 w-16 rounded-md border object-contain"
                />
              ) : (
                <p className="text-muted-foreground text-xs">{copy.currentLogoKept}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="helpContactReference">{copy.fields.helpContact}</Label>
              <Input
                id="helpContactReference"
                name="helpContactReference"
                placeholder={copy.fields.helpContactPlaceholder}
              />
            </div>
            {sites.length > 0 ? (
              <details className="rounded-md border px-3 py-2">
                <summary className="min-h-11 cursor-pointer py-2 text-sm">{copy.siteOverride}</summary>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="siteId">{copy.fields.site}</Label>
                    <SiteSelect id="siteId" name="siteId" sites={sites} optional />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="siteDisplayName">{copy.fields.siteDisplayName}</Label>
                    <Input id="siteDisplayName" name="siteDisplayName" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profileName">{copy.fields.profileName}</Label>
                    <Input id="profileName" name="profileName" defaultValue={copy.fields.profileNameDefault} />
                  </div>
                </div>
              </details>
            ) : null}
            {saveError ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive text-sm"
              >
                {saveError}
              </p>
            ) : null}
            <Button type="submit" disabled={pending || uploading} className="min-h-11 w-full">
              {pending ? copy.saving : copy.submit}
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
