import { structureBody } from "./email-structure";

describe("structureBody", () => {
  it("turns a lone link into an action button with the catalogued label", () => {
    expect(
      structureBody("Confirm within 24 hours:\n\nhttps://admin.example/verify?t=1\n\nIgnore this if it was not you.", {
        actionLabel: "Confirm my email",
      }),
    ).toEqual([
      { kind: "paragraph", text: "Confirm within 24 hours:" },
      { kind: "action", url: "https://admin.example/verify?t=1", label: "Confirm my email" },
      { kind: "paragraph", text: "Ignore this if it was not you." },
    ]);
  });

  it("turns a lone image link into a picture and not a button", () => {
    expect(structureBody("https://buffrcheckpoint.com/email/a.jpg")[0]).toEqual({
      kind: "image",
      url: "https://buffrcheckpoint.com/email/a.jpg",
      alt: "",
    });
    expect(structureBody("http://insecure.example/a.jpg")[0].kind).toBe("action");
  });

  it("reads consecutive Label: value lines as a facts table", () => {
    const [facts] = structureBody("Organisation: Hotel Etuna\nOrganisation ID: 123\nSector code: sme");
    expect(facts).toEqual({
      kind: "facts",
      rows: [
        { label: "Organisation", value: "Hotel Etuna" },
        { label: "Organisation ID", value: "123" },
        { label: "Sector code", value: "sme" },
      ],
    });
  });

  it("does not mistake a sentence, a URL or a lone sentence-with-colon for facts", () => {
    expect(structureBody("Note: this is a full sentence.")[0].kind).toBe("paragraph");
    expect(structureBody("https://example.com/a")[0].kind).toBe("action");
    expect(structureBody("See: https://example.com is where to go.\nAnd more text here.")[0].kind).toBe("paragraph");
  });

  it("reads numbered and bulleted lists, including a lead-in line", () => {
    expect(structureBody("1) Ask them\n2) Send a link")[0]).toEqual({
      kind: "list",
      ordered: true,
      items: ["Ask them", "Send a link"],
    });
    expect(structureBody("- one\n- two")[0]).toEqual({ kind: "list", ordered: false, items: ["one", "two"] });
    expect(structureBody("Outreach checklist:\n1) Ask\n2) Send")).toEqual([
      { kind: "paragraph", text: "Outreach checklist:" },
      { kind: "list", ordered: true, items: ["Ask", "Send"] },
    ]);
  });

  it("marks the 'if you did not do this' paragraph as a security callout", () => {
    expect(structureBody("If you did not create this account, ignore this email.")[0]).toEqual({
      kind: "callout",
      tone: "security",
      text: "If you did not create this account, ignore this email.",
    });
  });

  it("ignores empty blocks and keeps a plain body as paragraphs", () => {
    expect(structureBody("\n\n  \n\nOne.\n\nTwo.")).toEqual([
      { kind: "paragraph", text: "One." },
      { kind: "paragraph", text: "Two." },
    ]);
  });
});
