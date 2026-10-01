import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/auth/backend-url";
import { getSessionToken } from "@/lib/auth/session";
import { billingCopy } from "@/lib/copy/billing";

interface Checkout {
  actionUrl: string;
  fields: Record<string, string>;
}

const START_ERRORS: Record<number, string> = { 409: "not_open", 503: "unavailable" };

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Starts a card payment for one invoice and hands the browser to Adumo
 * Online's hosted page with a self-submitting form. The amount and signed
 * token come from the backend (never the browser), so this page only relays
 * what the server built.
 */
export async function GET(request: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  const token = await getSessionToken();
  const billing = new URL("/dashboard/billing", request.url);
  if (!token) return NextResponse.redirect(new URL("/auth/login", request.url));

  const upstream = await fetch(backendUrl(`/platform/billing/invoices/${encodeURIComponent(invoiceId)}/card-payment`), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!upstream.ok) {
    const result = START_ERRORS[upstream.status] ?? "error";
    billing.searchParams.set("payment", result);
    return NextResponse.redirect(billing, 303);
  }

  const checkout = (await upstream.json()) as Checkout;
  const inputs = Object.entries(checkout.fields)
    .map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`)
    .join("");
  const copy = billingCopy.redirecting;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(copy.title)}</title>
<style>body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#f5f5f5;color:#171717;display:grid;min-height:100vh;place-items:center}main{max-width:420px;background:#fff;border:1px solid #d9d9d4;border-radius:16px;padding:28px}h1{font-size:20px;margin:0 0 8px}p{color:#5f5f5f;margin:0 0 20px}button{background:#e0b000;color:#171717;border:0;border-radius:8px;padding:12px 18px;font-weight:600;cursor:pointer}</style></head>
<body><main><h1>${escapeHtml(copy.title)}</h1><p>${escapeHtml(copy.body)}</p>
<form id="adumo" method="post" action="${escapeHtml(checkout.actionUrl)}">${inputs}<button type="submit">${escapeHtml(copy.button)}</button></form></main>
<script>document.getElementById("adumo").submit();</script></body></html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
