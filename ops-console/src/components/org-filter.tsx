"use client";

import { useRouter } from "next/navigation";

import type { OrgOption } from "@/components/org-select";
import { NativeSelect } from "@/components/ui/native-select";

/** Query-param org filter for a cross-org list page — navigates via `?organisationId=`, unlike OrgSelect's form-field role. */
export function OrgFilter({ orgs, basePath, selected }: { orgs: OrgOption[]; basePath: string; selected?: string }) {
  const router = useRouter();

  return (
    <NativeSelect
      size="sm"
      value={selected ?? ""}
      onChange={(e) => {
        const next = e.target.value;
        router.push(next ? `${basePath}?organisationId=${next}` : basePath);
      }}
    >
      <option value="">All organisations</option>
      {orgs.map((org) => (
        <option key={org.id} value={org.id}>
          {org.label}
        </option>
      ))}
    </NativeSelect>
  );
}
