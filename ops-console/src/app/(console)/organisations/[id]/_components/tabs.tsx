import Link from "next/link";

const TABS = [
  { key: "rollup", label: "Rollup" },
  { key: "crm", label: "CRM" },
  { key: "billing", label: "Billing" },
  { key: "kyb", label: "KYB" },
  { key: "devices", label: "Devices" },
  { key: "sites", label: "Sites" },
] as const;

export function OrgDetailTabs({ id, active }: { id: string; active: string }) {
  return (
    <div className="flex gap-1 border-border border-b">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={`/organisations/${id}?tab=${tab.key}`}
          className={
            tab.key === active
              ? "border-primary border-b-2 px-3 py-2 font-medium text-foreground text-sm"
              : "px-3 py-2 text-slate text-sm hover:text-foreground"
          }
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
