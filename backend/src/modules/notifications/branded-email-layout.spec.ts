import { brandedEmailLayout, DEFAULT_EMAIL_LOGO, escapeHtml } from "./branded-email-layout";

describe("brandedEmailLayout", () => {
  const html = brandedEmailLayout({
    title: "Hello <script>",
    bodyText:
      "Line one\n\nOrganisation: Hotel Etuna\nTime (UTC): 2026-10-07\n\nhttps://example.com/path\n\nIf you did not do this, reply to us.",
    actionLabel: "Open it",
  });

  it("uses the brand: mustard bar, the email logo plate, and the Checkpoint footer with hello@buffr.ai", () => {
    expect(html).toContain("#E0B000");
    expect(html).toContain(DEFAULT_EMAIL_LOGO);
    expect(html).toContain("mailto:hello@buffr.ai");
    expect(html).not.toContain("buffranalytics.com");
    expect(html).toContain("The Buffr Checkpoint team");
  });

  it("lays out facts, the action button, and the security callout; escapes the title", () => {
    expect(html).toContain("Hello &lt;script&gt;");
    expect(html).toContain("text-transform:uppercase");
    expect(html).toContain('href="https://example.com/path"');
    expect(html).toContain(">Open it</a>");
    expect(html).toContain("border-left:4px solid #E0B000");
  });

  it("stays legible when a mail app recolours it: no forced light ground, a dark palette for apps that honour it, a button that keeps its contrast", () => {
    expect(html).not.toContain("linear-gradient");
    expect(html).toContain("prefers-color-scheme: dark");
    expect(html).toContain('name="color-scheme" content="light dark"');
    // Button: mustard text on charcoal with a mustard border, so inversion cannot turn it white on yellow.
    expect(html).toMatch(/bgcolor="#111111"[^>]*border:2px solid #E0B000/);
    expect(html).toMatch(/color:#E0B000;text-decoration:none;">Open it<\/a>/);
  });

  it("omits the greeting and signature for internal alerts and honours a custom logo", () => {
    const alert = brandedEmailLayout({
      title: "t",
      bodyText: "x",
      signature: null,
      greeting: null,
      logoUrl: "https://example.com/l.png",
    });
    expect(alert).not.toContain("Kind regards");
    expect(alert).toContain("https://example.com/l.png");
  });

  it("greets by name, signs as the part of the company writing, and escapes both", () => {
    const personal = brandedEmailLayout({
      title: "t",
      bodyText: "x",
      greeting: "Hello <b>Maria</b>,",
      signature: { name: "Buffr Checkpoint Billing", role: "Accounts" },
    });
    expect(personal).toContain("Hello &lt;b&gt;Maria&lt;/b&gt;,");
    expect(personal).toContain("Buffr Checkpoint Billing");
    expect(personal).toContain("Accounts");
    expect(personal).toContain("Kind regards,");
  });

  it("signs once, with no contact details repeated outside the footer", () => {
    const out = brandedEmailLayout({ title: "t", bodyText: "x", greeting: null, signature: { name: "Team" } });
    expect(out.match(/Kind regards/g)).toHaveLength(1);
    expect(out.match(/mailto:hello@buffr\.ai/g)).toHaveLength(1); // the footer only
    expect(out.match(/>buffrcheckpoint\.com</g)).toHaveLength(1); // the footer only
  });

  it("draws a hero picture under the title and an inline picture, both with alt text", () => {
    const out = brandedEmailLayout({
      title: "t",
      bodyText: "Look:\n\nhttps://buffrcheckpoint.com/email/x.jpg",
      heroImage: { url: "https://buffrcheckpoint.com/email/hero.jpg", alt: "A desk" },
    });
    expect(out).not.toContain("close.jpg");
    expect(out).toContain('src="https://buffrcheckpoint.com/email/hero.jpg" alt="A desk"');
    expect(out).toContain('src="https://buffrcheckpoint.com/email/x.jpg"');
  });

  it("escapes entities", () => {
    expect(escapeHtml(`a&b<"'`)).toContain("&amp;");
    expect(escapeHtml(`a&b<"'`)).toContain("&lt;");
  });
});
