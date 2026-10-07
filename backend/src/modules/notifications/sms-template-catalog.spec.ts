import { SMS_MAX_CHARACTERS } from "../integrations/telecoms/bulksmsnam.client";
import { SMS_TEMPLATE_CATALOG } from "./sms-template-catalog";
import { fillTemplate, fitSms, toGsm7 } from "./sms-text";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS = join(__dirname, "..", "..", "..", "db", "migrations");
const smsSeed = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(join(MIGRATIONS, f), "utf8"))
  .filter(
    (sql) =>
      sql.includes("platform_notification_template") && /notification_channel'\s*AND\s*ch\.code\s*=\s*'sms'/.test(sql),
  )
  .join("\n");

// The longest values the system can produce: a long organisation name, the 8-character reference, and the two short links.
const LONGEST = {
  organisationName: "Namibia Revenue Agency Windhoek Regional Head Office and Customer Service Centre",
  visitReference: "ABCD1234",
  signOutUrl: `https://buffrcheckpoint.com/o/${"A".repeat(41)}`,
  ratingUrl: `https://buffrcheckpoint.com/r/${"A".repeat(41)}`,
  visitDate: "31 Dec 2026",
  checkInUrl: `https://buffrcheckpoint.com/check-in?site=${"a".repeat(8)}`,
};

describe("SMS template catalog", () => {
  it("fits one 160-character segment for the longest organisation name, or shortens only the name", () => {
    for (const [code, spec] of Object.entries(SMS_TEMPLATE_CATALOG)) {
      const fitted = fitSms(spec.defaultBody, LONGEST);
      expect({ code, fits: fitted !== null }).toEqual({ code, fits: true });
      expect(fitted?.text.length).toBeLessThanOrEqual(SMS_MAX_CHARACTERS);
      // Links and the reference are never cut.
      if (spec.variables.includes("signOutUrl")) expect(fitted?.text).toContain(LONGEST.signOutUrl);
      if (spec.variables.includes("ratingUrl")) expect(fitted?.text).toContain(LONGEST.ratingUrl);
      if (spec.variables.includes("visitReference")) expect(fitted?.text).toContain(LONGEST.visitReference);
    }
  });

  it("is neutral: no visitor name, host, purpose or ID can reach a message", () => {
    for (const [code, spec] of Object.entries(SMS_TEMPLATE_CATALOG)) {
      const forbidden = spec.variables.filter((v) => /visitor|host|purpose|idnumber|passport|phone|email/i.test(v));
      expect({ code, forbidden }).toEqual({ code, forbidden: [] });
    }
  });

  it("names exactly the variables the body uses", () => {
    for (const [code, spec] of Object.entries(SMS_TEMPLATE_CATALOG)) {
      const used = [...spec.defaultBody.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((m) => m[1]).sort();
      expect({ code, used }).toEqual({ code, used: [...spec.variables].sort() });
    }
  });

  it("is plain GSM 7-bit text with no emoji, so it stays one segment", () => {
    for (const spec of Object.values(SMS_TEMPLATE_CATALOG)) {
      // The {{tokens}} are filled before sending, so check the wording around them.
      const wording = spec.defaultBody.replace(/\{\{\s*[a-zA-Z0-9_]+\s*\}\}/g, "X");
      expect(toGsm7(wording)).toBe(wording);
    }
  });

  it("is seeded: every catalogued code has an editable sms template row with the same wording", () => {
    for (const [code, spec] of Object.entries(SMS_TEMPLATE_CATALOG)) {
      expect({ code, seeded: smsSeed.includes(`'${code}'`) }).toEqual({ code, seeded: true });
      expect({ code, sameBody: smsSeed.includes(spec.defaultBody) }).toEqual({ code, sameBody: true });
    }
  });
});

describe("sms text rules", () => {
  it("folds accents and typographic punctuation and drops what cannot be sent in one segment", () => {
    expect(toGsm7("Müller’s café — open")).toBe("Mullers cafe - open".replace("Mullers", "Muller's"));
    expect(toGsm7("Hello \u{1F600} world")).toBe("Hello  world");
    expect(toGsm7("a|b~c^d{e}f[g]h\\i")).toBe("abcdefghi");
  });

  it("shortens only the organisation name, never a link", () => {
    const body =
      "{{organisationName}}: visit recorded, ref {{visitReference}}. Sign out when you leave: {{signOutUrl}}";
    const url = `https://buffrcheckpoint.com/o/${"B".repeat(41)}`;
    const fitted = fitSms(body, { organisationName: "N".repeat(120), visitReference: "ABCD1234", signOutUrl: url });
    expect(fitted?.shortened).toBe(true);
    expect(fitted?.text.length).toBeLessThanOrEqual(160);
    expect(fitted?.text).toContain(url);
  });

  it("refuses rather than cutting a message whose fixed part is already too long", () => {
    expect(fitSms("x".repeat(170), { organisationName: "Acme Trading" })).toBeNull();
    expect(fitSms("{{organisationName}}", { organisationName: "" })).toBeNull();
  });

  it("fills tokens and blanks unknown ones", () => {
    expect(fillTemplate("{{a}} and {{b}}", { a: "one" })).toBe("one and ");
  });
});
