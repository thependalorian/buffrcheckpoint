import { brandedEmailLayout } from "./branded-email-layout";

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const html = brandedEmailLayout({
  title: "t",
  bodyText: "Para.\n\nA: b\nC: d\n\nhttps://example.com/x\n\nIf you did not do this, ignore it.\n\n1) one\n2) two",
  actionLabel: "Open",
  greeting: "Hello,",
  signature: { name: "Team", role: "Role" },
});

// [text, background] pairs as drawn, light palette first, then the dark palette from the prefers-color-scheme block.
const LIGHT: Array<[string, string, string]> = [
  ["body text", "#111111", "#FFFFFF"],
  ["muted text on card", "#5C5C5C", "#FFFFFF"],
  ["footer muted", "#5C5C5C", "#F5F5F5"],
  ["callout text", "#111111", "#F5F5F5"],
  ["button label", "#E0B000", "#111111"],
  ["link", "#111111", "#FFFFFF"],
];
const DARK: Array<[string, string, string]> = [
  ["body text", "#F2F2F2", "#1C1C1E"],
  ["muted text", "#B8B8B8", "#1C1C1E"],
  ["footer muted", "#B8B8B8", "#2A2A2C"],
  ["callout text", "#F2F2F2", "#2A2A2C"],
  ["button label", "#E0B000", "#111111"],
  ["link", "#F2F2F2", "#1C1C1E"],
];

describe("email contrast (WCAG AA is 4.5)", () => {
  it.each(LIGHT)("light: %s", (_n, fg, bg) => expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5));
  it.each(DARK)("dark: %s", (_n, fg, bg) => expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5));

  it("draws exactly the colours checked above, so the table cannot drift from the layout", () => {
    for (const hex of ["#111111", "#5C5C5C", "#F5F5F5", "#E0B000", "#F2F2F2", "#1C1C1E", "#B8B8B8", "#2A2A2C"])
      expect(html.toUpperCase()).toContain(hex.toUpperCase());
  });

  it("never sets light text on a light ground or dark text on a dark ground in the inline styles", () => {
    for (const tag of html.match(/<(td|p|h1|ul|ol|li|a|span)\b[^>]*style="[^"]*"/g) ?? []) {
      const color = /(?:^|[;"\s])color:(#[0-9A-Fa-f]{6})/.exec(tag)?.[1];
      const bg = /background-color:(#[0-9A-Fa-f]{6})/.exec(tag)?.[1];
      if (color && bg)
        expect({ tag: tag.slice(0, 60), ratio: ratio(color, bg) >= 4.5 }).toEqual({
          tag: tag.slice(0, 60),
          ratio: true,
        });
    }
  });
});
