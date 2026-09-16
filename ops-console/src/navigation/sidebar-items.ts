import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Building2,
  ClipboardCheck,
  CreditCard,
  FileWarning,
  Handshake,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Ticket,
  Users,
} from "lucide-react";

export type OpsNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

/** Platform-control IA — never customer admin groups (§11.9.1). */
export const opsNavItems: OpsNavItem[] = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
  { title: "Organisations", url: "/organisations", icon: Building2 },
  { title: "CRM", url: "/crm", icon: Handshake },
  { title: "Billing", url: "/billing", icon: CreditCard },
  { title: "KYB", url: "/kyb", icon: ClipboardCheck },
  { title: "Devices", url: "/devices", icon: Smartphone },
  { title: "Sites", url: "/sites", icon: MapPin },
  { title: "Capability Status", url: "/capability-status", icon: ShieldCheck },
  { title: "Support Access", url: "/support-access", icon: LifeBuoy },
  { title: "Incidents", url: "/incidents", icon: FileWarning },
  { title: "Tickets", url: "/tickets", icon: Ticket },
  { title: "Analytics", url: "/analytics", icon: Activity },
  { title: "Search", url: "/search", icon: Search },
  { title: "Audit", url: "/audit", icon: ScrollText },
  // Internal administration last — Buffr's own staff list and platform-wide
  // settings, not a customer-facing surface.
  { title: "Platform Staff", url: "/staff", icon: Users },
  { title: "Configuration", url: "/configuration", icon: Settings },
];
