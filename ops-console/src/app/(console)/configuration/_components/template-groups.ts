// Pure grouping helpers, kept out of the "use client" forms module so the
// server-rendered page can call them.
export interface TemplateRow {
  id: string;
  templateCode: string;
  templateLabel: string;
  subject: string | null;
  body: string;
  updatedAt: string | null;
}

function categoryFor(code: string): string {
  if (code.startsWith("ops_")) return "Ops intake";
  if (code.startsWith("kyb_")) return "KYB";
  if (code.startsWith("host_")) return "Visitor / host";
  if (
    code.startsWith("invoice_") ||
    code.startsWith("pop_") ||
    code.startsWith("payment_") ||
    code.startsWith("receipt_") ||
    code.startsWith("subscription_") ||
    code.startsWith("suspension_") ||
    code.startsWith("credit_")
  ) {
    return "Billing";
  }
  if (code.startsWith("support_") || code === "platform_staff_invitation") return "Access & support";
  if (
    code.startsWith("email_") ||
    code.startsWith("password_") ||
    code.startsWith("account_") ||
    code.startsWith("mfa_") ||
    code === "org_welcome"
  ) {
    return "Identity & security";
  }
  if (code.startsWith("visitor_")) return "Dormant / future";
  return "Other";
}

export function groupTemplates(templates: TemplateRow[]): Array<{ category: string; items: TemplateRow[] }> {
  const order = [
    "Identity & security",
    "Access & support",
    "Ops intake",
    "Billing",
    "KYB",
    "Visitor / host",
    "Dormant / future",
    "Other",
  ];
  const map = new Map<string, TemplateRow[]>();
  for (const t of templates) {
    const cat = categoryFor(t.templateCode);
    const list = map.get(cat) ?? [];
    list.push(t);
    map.set(cat, list);
  }
  return order.filter((c) => map.has(c)).map((c) => ({ category: c, items: map.get(c) ?? [] }));
}
