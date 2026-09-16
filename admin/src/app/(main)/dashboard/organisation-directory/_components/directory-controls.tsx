"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import {
  archiveDirectoryUnitAction,
  createDirectoryUnitAction,
  seedBianTemplateAction,
  seedCustomStarterAction,
  setDirectoryModeAction,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type CodeOption = { code: string; label: string };

type UnitNode = {
  id: string;
  parentId: string | null;
  unitKindCode: string;
  unitKindLabel: string;
  bianAreaCode: string | null;
  bianAreaLabel: string | null;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  children: UnitNode[];
};

export function DirectoryToolbar({
  mode,
  availableModes,
}: {
  mode: string;
  availableModes: CodeOption[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">
        Choose how this organisation is structured. BIAN is optional — use a custom tree, the BIAN
        Service Landscape template, or a hybrid of both.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="directoryMode" className="text-sm">
          Mode
        </Label>
        <select
          id="directoryMode"
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          defaultValue={mode}
          disabled={isPending}
          onChange={(event) => {
            const value = event.target.value as "custom" | "bian_aligned" | "hybrid";
            setError(null);
            startTransition(async () => {
              try {
                await setDirectoryModeAction(value);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not update mode.");
              }
            });
          }}
        >
          {availableModes.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                await seedCustomStarterAction();
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not seed custom starter.");
              }
            });
          }}
        >
          Seed custom departments
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                await seedBianTemplateAction();
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not seed BIAN template.");
              }
            });
          }}
        >
          Seed BIAN template
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export function CreateUnitSheet({
  flatUnits,
  availableKinds,
  availableBianAreas,
}: {
  flatUnits: Array<{ id: string; name: string; code: string }>;
  availableKinds: CodeOption[];
  availableBianAreas: CodeOption[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">Add unit</Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add organisation unit</SheetTitle>
          <SheetDescription>
            Add any department, team, or BIAN-tagged unit. BIAN area is optional for custom
            structures.
          </SheetDescription>
        </SheetHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              try {
                await createDirectoryUnitAction({
                  parentId: String(formData.get("parentId") || "") || null,
                  unitKindCode: String(formData.get("unitKindCode") ?? "department"),
                  bianAreaCode: String(formData.get("bianAreaCode") || "") || null,
                  code: String(formData.get("code") ?? ""),
                  name: String(formData.get("name") ?? ""),
                  description: String(formData.get("description") ?? ""),
                });
                setOpen(false);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not create unit.");
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Finance" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" name="code" required placeholder="finance" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unitKindCode">Kind</Label>
            <select
              id="unitKindCode"
              name="unitKindCode"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              defaultValue="department"
            >
              {availableKinds.map((kind) => (
                <option key={kind.code} value={kind.code}>
                  {kind.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="parentId">Parent (optional)</Label>
            <select
              id="parentId"
              name="parentId"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              defaultValue=""
            >
              <option value="">None (top level)</option>
              {flatUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.code})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bianAreaCode">BIAN business area (optional)</Label>
            <select
              id="bianAreaCode"
              name="bianAreaCode"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              defaultValue=""
            >
              <option value="">None — custom / untagged</option>
              {availableBianAreas.map((area) => (
                <option key={area.code} value={area.code}>
                  {area.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" name="description" placeholder="What this unit covers" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Saving…" : "Create unit"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function UnitTree({ units }: { units: UnitNode[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (units.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No units yet. Seed a custom starter, seed the BIAN template, or add units manually.
      </p>
    );
  }

  function renderNode(node: UnitNode, depth: number) {
    return (
      <li key={node.id} className="space-y-2">
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
          style={{ marginLeft: depth * 16 }}
        >
          <div>
            <p className="font-medium">{node.name}</p>
            <p className="text-xs text-muted-foreground">
              {node.unitKindLabel} · {node.code}
              {node.bianAreaLabel ? ` · BIAN: ${node.bianAreaLabel}` : " · custom"}
            </p>
            {node.description ? <p className="mt-1 text-xs text-muted-foreground">{node.description}</p> : null}
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await archiveDirectoryUnitAction(node.id);
                router.refresh();
              });
            }}
          >
            Archive
          </Button>
        </div>
        {node.children.length > 0 ? (
          <ul className="space-y-2">{node.children.map((child) => renderNode(child, depth + 1))}</ul>
        ) : null}
      </li>
    );
  }

  return <ul className="space-y-2">{units.map((unit) => renderNode(unit, 0))}</ul>;
}
