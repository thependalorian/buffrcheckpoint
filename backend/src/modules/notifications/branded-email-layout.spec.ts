import { brandedEmailLayout, escapeHtml } from "./branded-email-layout";

describe("brandedEmailLayout", () => {
  it("wraps plain text with mustard accent and escapes HTML", () => {
    const html = brandedEmailLayout({
      title: "Hello <script>",
      bodyText: "Line one\n\nhttps://example.com/path\n\nLine three",
      logoUrl: "https://example.com/logo.png",
    });
    expect(html).toContain("#E0B000");
    expect(html).toContain("Hello &lt;script&gt;");
    expect(html).toContain('href="https://example.com/path"');
    expect(html).toContain("Buffr Checkpoint");
  });

  it("escapeHtml encodes entities", () => {
    expect(escapeHtml(`a&b<"'`)).toContain("&amp;");
    expect(escapeHtml(`a&b<"'`)).toContain("&lt;");
  });
});
