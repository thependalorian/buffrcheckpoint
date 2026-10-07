import {
  BarChart3,
  BellRing,
  Building2,
  Calendar,
  CalendarDays,
  CreditCard,
  FileCheck2,
  FolderTree,
  Gavel,
  Hotel,
  KeyRound,
  LayoutDashboard,
  Lock,
  type LucideIcon,
  Mail,
  MessageCircle,
  Monitor,
  QrCode,
  ScrollText,
  ShieldAlert,
  Siren,
  Tablet,
  UserCheck,
  UserRound,
  UserSquare2,
  Users,
} from "lucide-react";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

// Buffr Checkpoint admin navigation — customer-tenant functions only.
// Platform Support and global Capability Status are internal control-plane
// functions and are not exposed in this sidebar.
export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Operations",
    items: [
      {
        id: "overview",
        title: "Overview",
        url: "/dashboard/overview",
        icon: LayoutDashboard,
      },
      {
        id: "analytics",
        title: "Analytics",
        url: "/dashboard/analytics",
        icon: BarChart3,
      },
      {
        id: "feedback",
        title: "Visit Feedback",
        url: "/dashboard/analytics/feedback",
        icon: MessageCircle,
        badge: "new",
      },
      {
        id: "front-desk",
        title: "Front Desk",
        url: "/dashboard/front-desk",
        icon: UserCheck,
      },
      {
        id: "visitors",
        title: "Visitors",
        url: "/dashboard/visitors",
        icon: UserSquare2,
      },
      {
        id: "schedule",
        title: "Schedule",
        url: "/dashboard/schedule",
        icon: Calendar,
      },
      {
        id: "calendar",
        title: "Calendar",
        url: "/dashboard/calendar",
        icon: CalendarDays,
      },
      {
        id: "emergency",
        title: "Emergency Roster",
        url: "/dashboard/emergency",
        icon: ShieldAlert,
      },
      {
        id: "anomalies",
        title: "Anomaly Alerts",
        url: "/dashboard/anomalies",
        icon: Siren,
      },
      {
        id: "billing",
        title: "Billing",
        url: "/dashboard/billing",
        icon: CreditCard,
      },
      {
        id: "kyb",
        title: "Business Verification",
        url: "/dashboard/kyb",
        icon: FileCheck2,
      },
      {
        id: "support",
        title: "Support",
        url: "/dashboard/support",
        icon: MessageCircle,
      },
      {
        id: "support-access",
        title: "Support Access",
        url: "/dashboard/support-access",
        icon: KeyRound,
      },
    ],
  },
  {
    id: 2,
    label: "Site Experience",
    items: [
      {
        id: "sites",
        title: "Sites & Zones",
        url: "/dashboard/sites",
        icon: Building2,
      },
      {
        id: "hosts",
        title: "Hosts & Departments",
        url: "/dashboard/hosts",
        icon: Users,
        badge: "new",
      },
      {
        id: "organisation-directory",
        title: "Organisation Directory",
        url: "/dashboard/organisation-directory",
        icon: FolderTree,
        badge: "new",
      },
      {
        id: "kiosk-experience",
        title: "Kiosk Experience",
        url: "/dashboard/site-experience/kiosk",
        icon: Monitor,
        badge: "new",
      },
      {
        id: "capabilities",
        title: "Capability Enablement",
        url: "/dashboard/site-experience/capabilities",
        icon: Lock,
        badge: "new",
      },
      {
        id: "cimso",
        title: "CiMSO INNterchange",
        url: "/dashboard/site-experience/cimso",
        icon: Hotel,
        badge: "new",
      },
      {
        id: "site-qr",
        title: "Site QR Codes",
        url: "/dashboard/site-experience/qr",
        icon: QrCode,
        badge: "new",
      },
      {
        id: "escalation",
        title: "Host Escalation",
        url: "/dashboard/site-experience/escalation",
        icon: BellRing,
        badge: "new",
      },
      {
        id: "site-notices",
        title: "Site Notices",
        url: "/dashboard/site-experience/notices",
        icon: ScrollText,
        badge: "new",
      },
      {
        id: "visitor-forms",
        title: "Visitor Types & Forms",
        url: "/dashboard/policies/forms",
        icon: FileCheck2,
      },
    ],
  },
  {
    id: 3,
    label: "Devices and Credentials",
    items: [
      {
        id: "devices",
        title: "Devices",
        url: "/dashboard/devices",
        icon: Tablet,
      },
      {
        id: "device-compliance",
        title: "Device Compliance Register",
        url: "/dashboard/devices/compliance",
        icon: FileCheck2,
      },
      {
        id: "credentials",
        title: "Credentials",
        url: "/dashboard/credentials",
        icon: Lock,
      },
    ],
  },
  {
    id: 4,
    label: "Governance and Compliance",
    items: [
      {
        id: "compliance",
        title: "Compliance Dashboard",
        url: "/dashboard/compliance",
        icon: Gavel,
      },
      {
        id: "privacy-requests",
        title: "Privacy Requests",
        url: "/dashboard/compliance/privacy-requests",
        icon: ShieldAlert,
      },
      {
        id: "legal-holds",
        title: "Legal Holds",
        url: "/dashboard/compliance/legal-holds",
        icon: Lock,
      },
      {
        id: "access-policies",
        title: "Access Policies",
        url: "/dashboard/policies/access",
        icon: Lock,
      },
      {
        id: "retention-policies",
        title: "Retention Policies",
        url: "/dashboard/policies/retention",
        icon: ScrollText,
      },
      {
        id: "audit",
        title: "Audit Log",
        url: "/dashboard/audit",
        icon: ScrollText,
      },
      {
        id: "evidence",
        title: "Evidence Packs",
        url: "/dashboard/evidence",
        icon: FileCheck2,
      },
      {
        id: "reports",
        title: "Scheduled Reports",
        url: "/dashboard/reports",
        icon: Mail,
      },
    ],
  },
  {
    id: 5,
    label: "Access Administration",
    items: [
      {
        id: "organisation",
        title: "Organisation Settings",
        url: "/dashboard/organisation",
        icon: Building2,
      },
      {
        id: "email-notifications",
        title: "Email Notifications",
        url: "/dashboard/organisation/notifications",
        icon: Mail,
        badge: "new",
      },
      {
        id: "users",
        title: "Users",
        url: "/dashboard/users",
        icon: Users,
      },
      {
        id: "roles",
        title: "Roles & Access",
        url: "/dashboard/roles",
        icon: Lock,
      },
      {
        id: "account",
        title: "My Account",
        url: "/dashboard/account",
        icon: UserRound,
      },
    ],
  },
];
