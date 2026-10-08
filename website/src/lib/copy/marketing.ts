// Marketing page copy in one place (lib/copy rule): the lists the pages render. The legal documents (/terms, /privacy) keep their text with the
// page, because a legal document is versioned as a document and is not edited as interface copy.

export const HOME_CAPABILITIES = [
  {
    title: "QR-first phone check-in",
    body: "Print your site QR code from admin. Visitors scan it and check in on their own phone browser.",
  },
  {
    title: "Assisted front desk",
    body: "Reception checks in visitors who have no phone, a basic phone, or trouble with the form. Their record gets the same encryption as a self check-in.",
  },
  {
    title: "Keeps working offline",
    body: "With a kiosk on site, check-in carries on through a network outage. Records stay encrypted on the device and sync once the connection returns, with no duplicates and a full audit trail.",
  },
  {
    title: "Checks sized to the risk",
    body: "A courier at a branch office and a contractor entering a server room need different identity checks. You set the level per site, visit, and zone.",
  },
  {
    title: "Audit-ready evidence",
    body: "Each time someone views, exports, corrects, or deletes a sensitive record, the system writes an audit event nobody edits afterwards.",
  },
  {
    title: "Optional fast lanes",
    body: "Add NFC badges, a dedicated kiosk, or SMS later. Each writes to the same record and switches on once our status page lists it as Live.",
  },
];

export const HOME_STEPS = [
  {
    n: "01",
    title: "Arrival",
    body: "The visitor uses their own phone, a badge, the kiosk, or the front desk.",
  },
  {
    n: "02",
    title: "Verification",
    body: "The identity check matches the site. A bank vault asks for more than a clinic waiting room.",
  },
  {
    n: "03",
    title: "Record",
    body: "The visit becomes one encrypted record. Other visitors never see it.",
  },
  {
    n: "04",
    title: "Notify",
    body: "The host gets a notification. Sites with approval rules hold entry until the host says yes.",
  },
  {
    n: "05",
    title: "Access & sign-out",
    body: "Reception logs entry, escort rules apply, and sign-out closes the record.",
  },
];

export const PLATFORM_LAYERS = [
  {
    title: "Check-in channels",
    items: [
      "Site QR on the visitor's phone",
      "Assisted front desk",
      "QR invitation",
      "NFC badge or phone",
      "Tablet kiosk",
      "SMS (add-on)",
    ],
  },
  {
    title: "Site edge",
    items: ["Android kiosk", "Encrypted local cache", "NFC reader", "MDM-managed device policy"],
  },
  {
    title: "API and identity gateway",
    items: ["Authenticated API", "Rate limits", "Idempotency", "Signed device claims"],
  },
  {
    title: "Core application",
    items: ["Visit workflow", "Risk-based access", "RBAC", "Retention", "DSAR"],
  },
  {
    title: "Credential checks",
    items: ["Contact-channel confirmation", "Site-issued credentials", "NFC credential validation"],
  },
  {
    title: "Data and evidence",
    items: ["Encrypted Postgres", "Append-only audit log", "Evidence packs"],
  },
];

export const PLATFORM_ROLES = [
  ["Visitor", "Own confirmation only", "Complete own check-in", "None"],
  ["Host / Staff", "Their own visitors", "Approve, reject, update status", "None by default"],
  [
    "Owner-Operator",
    "Site roster and history for one site",
    "Front desk work, site config, compliance review, day-to-day admin",
    "Site reports and configuration exports",
  ],
  [
    "Front Desk Operator",
    "Current-day roster for assigned site",
    "Assisted check-in, sign-out, badge issue",
    "Current-day operational list",
  ],
  ["Site Manager", "Full history for assigned site", "Site fields, hosts, local configuration", "Site reports"],
  ["Regional Manager", "Aggregated sites in assigned region", "Limited regional configuration", "Regional reports"],
  [
    "Compliance / Audit Officer",
    "Organisation-wide records and audit trail",
    "Legal holds, retention review, DSAR workflow",
    "Evidence packs",
  ],
  [
    "System Administrator",
    "Configuration and operational metadata",
    "Roles, sites, policy, integrations",
    "Configuration and audit exports",
  ],
  ["Platform Support", "None by default", "Time-bound, approved support access only", "No routine export"],
];

export const PLATFORM_FAQS = [
  {
    q: "How does offline operation work?",
    a: "The kiosk keeps taking visitors during outages with an encrypted local cache, then syncs when the network returns. The screen shows notification pending until delivery succeeds. It never claims the host heard early.",
  },
  {
    q: "Where does Checkpoint enforce access control?",
    a: "In the API and database. Hiding a sidebar link never grants access. Sensitive reads, exports, corrections, and deletions follow the signed-in user's role and site, and each one writes an immutable audit event.",
  },
  {
    q: "Do we invent our own roles and permissions?",
    a: "No. You invite people into a fixed role catalogue (Owner-Operator for a small site, or Front Desk, Site Manager, and the rest as you grow). Role changes are audited. Permission sets stay platform-owned.",
  },
  {
    q: "Does Checkpoint use AI to build check-in forms?",
    a: "Admins can optionally ask for field suggestions or translations when Form AI is enabled. Suggestions never publish themselves. Your team still sets each field's classification, and high-risk fields still need an approval reference before publish.",
  },
  {
    q: "Are public check-in forms available in multiple languages?",
    a: "Yes. Visitors can pick English, Afrikaans, or Portuguese on the public check-in page (or pass ?lang=). Field labels resolve from published translations when available, with English fallback.",
  },
];

export const ABOUT_VALUES = [
  {
    title: "Privacy done for you",
    body: "The privacy notice, retention period, data-request deadlines and evidence are built in and switched on, so you do not have to set them up.",
  },
  { title: "Evidence-led", body: "Each control leaves evidence an auditor, board, or regulator reviews." },
  { title: "Offline-resilient", body: "A dropped connection should never send your front desk back to paper." },
  { title: "Risk-based", body: "Identity checks match the risk of the site, the visit, and the zone." },
];

export const DEVELOPER_RESOURCES = [
  {
    title: "Core API",
    body: "REST API at api.buffrcheckpoint.com. Tenant-scoped JWTs. RBAC on every route. Audit events on mutating calls.",
  },
  {
    title: "Webhooks and outbox",
    body: "Host notifications and delivery instructions are processed asynchronously. Do not expect SMS or email to go out inside the check-in request.",
  },
  {
    title: "Kiosk and MDM",
    body: "Device provisioning, CRAN compliance evidence, and kiosk experience sync are customer-admin flows, not public self-service APIs.",
  },
  {
    title: "Regulated capabilities",
    body: "NFC badges and SMS are capability-gated platform features. Switching one on for your organisation has no effect until the platform marks it live.",
  },
];

export const PRICING_CHANNEL_COSTS = [
  ["Public site QR + phone web", "Zero marginal cost", "Site default, no tablet required"],
  ["Assisted front-desk entry", "Zero marginal cost", "Included on every plan"],
  ["Dedicated kiosk / tablet", "Hardware CAPEX separate", "Optional add-on / Network"],
  ["QR (visitor's phone)", "Zero marginal cost", "Site (public site) / Network (invitation)"],
  ["SMS", "Per-message cost, billed by use", "Optional add-on when live"],
  ["NFC (phone tap)", "Zero marginal cost", "Network when enabled"],
  ["NFC badge (physical)", "Hardware cost separate", "Optional hardware"],
];

export const MARKETING_PAGES = {
  home: {
    eyebrow: "Visitor and access management",
    h1: "Your next visitor reads every name in your register.",
    lead: "Name, phone number, ID number, who they came to see. Checkpoint gives each visitor a private, encrypted record instead of a line on a shared page. It keeps working when the network drops, and people without a smartphone still check in.",
    paperTitle: "Look at the last page of your visitor book.",
    paperLead:
      "Every line holds a name and phone number, and often an ID or passport number, a car registration, an employer, and the person the visitor came to see. The next visitor reads all of it while they sign. Nobody logs who photographed the page. When an auditor asks who saw a record last March, the book has no answer.",
    doorTitle: "Built for every visitor and every door.",
    phoneTitle: "Smartphone, basic phone, or no phone at all.",
    phoneLead: "Pick the channel that suits each visitor. The data protection stays the same on every one.",
    seeTitle: "What your front desk and compliance team see.",
  },
  platform: {
    lead: "Every visitor gets through the door, whatever they carry. The channel changes from visitor to visitor. The data protection stays fixed.",
    rbacLead1:
      "Each person on your team sees the visitor records their job needs and nothing more. The server checks access on every request, so hiding a menu item never stands in for a permission.",
    rbacLead2:
      "On a small site, one trusted Owner-Operator account covers front desk, site setup, and day-to-day admin. As the team grows, hand out the separate roles below from the same fixed catalogue.",
  },
  about: {
    lead: "Walk into a bank branch, clinic, or government office in Namibia and you often sign a shared visitor book. Whoever holds the pen reads the names, phone numbers, and ID numbers above their own line. We built Checkpoint to replace that book for every visitor, whatever phone they carry.",
  },
  developers: {
    lead: "Checkpoint is a three-surface product: marketing site, customer admin, and internal platform ops. Customer integrations run against the Core API with organisation-scoped credentials, never against platform-only routes.",
  },
  pricing: {
    lead: "Site covers phone check-in and assisted entry at one location. Add kiosks, NFC, and SMS messaging when your sites need them.",
    fallback: "Showing published list prices. Live catalog temporarily unavailable.",
    costsLead:
      "Every channel produces the same encrypted record. The running cost differs, from nothing for a QR scan to a per-message fee for SMS.",
  },
  status: {
    lead: "Each service below is checked when this page loads. We send incidents and maintenance windows to your admin contacts and support tickets, so you will not find a public incident board here.",
    capsLead: "Each label below reads from our live capability register when this page loads. We never hardcode them.",
  },
} as const;
