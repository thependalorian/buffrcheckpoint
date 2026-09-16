"use client";

import { useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { setupBrandingAndPublish } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const MAX_LOGO_BYTES = 400_000;

async function fileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Logo must be an image file (PNG, JPEG, or WebP).");
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error("Logo must be under 400 KB. Compress the image and try again.");
  }
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read logo file."));
    reader.readAsDataURL(file);
  });
}

export function BrandingSetupSheet() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("/logo.png");
  const [logoArtifactId, setLogoArtifactId] = useState<string>("/logo.png");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">Add branding</Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Organisation branding</SheetTitle>
          <SheetDescription>Creates a profile, draft version, and publishes immediately for kiosk sync.</SheetDescription>
        </SheetHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            setPending(true);
            const formData = new FormData(event.currentTarget);
            void (async () => {
              try {
                await setupBrandingAndPublish({
                  siteId: String(formData.get("siteId") ?? "") || undefined,
                  profileName: String(formData.get("profileName") ?? ""),
                  organisationDisplayName: String(formData.get("organisationDisplayName") ?? ""),
                  siteDisplayName: String(formData.get("siteDisplayName") ?? ""),
                  welcomeMessage: String(formData.get("welcomeMessage") ?? ""),
                  brandColourToken: String(formData.get("brandColourToken") ?? ""),
                  logoArtifactId,
                  helpContactReference: String(formData.get("helpContactReference") ?? ""),
                });
                setOpen(false);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Request failed.");
              } finally {
                setPending(false);
              }
            })();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="siteId">Site ID (optional override)</Label>
            <Input id="siteId" name="siteId" placeholder="Leave empty for org default" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profileName">Profile name</Label>
            <Input id="profileName" name="profileName" defaultValue="Site branding" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organisationDisplayName">Organisation display name</Label>
            <Input id="organisationDisplayName" name="organisationDisplayName" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siteDisplayName">Site display name</Label>
            <Input id="siteDisplayName" name="siteDisplayName" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">Welcome message</Label>
            <Input id="welcomeMessage" name="welcomeMessage" defaultValue="Welcome" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brandColourToken">Brand colour (hex)</Label>
            <Input id="brandColourToken" name="brandColourToken" defaultValue="#e2a603" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logoFile">Logo upload</Label>
            <Input
              id="logoFile"
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void fileToDataUrl(file)
                  .then((dataUrl) => {
                    setLogoArtifactId(dataUrl);
                    setLogoPreview(dataUrl);
                    setError(null);
                  })
                  .catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : "Could not read logo.");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  });
              }}
            />
            <p className="text-muted-foreground text-xs">
              PNG, JPEG, or WebP under 400 KB. Embedded into the branding version for kiosk sync.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoPreview} alt="Logo preview" className="mt-2 h-16 w-16 rounded-md border object-contain" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="helpContactReference">Help contact</Label>
            <Input id="helpContactReference" name="helpContactReference" placeholder="Reception: ext 100" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Saving…" : "Save and publish"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
