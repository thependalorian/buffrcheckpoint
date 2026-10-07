import { describe, expect, it } from "vitest";

import { emailAudience, emailName, notificationPrefsCopy } from "./notifications";

describe("notification preferences copy", () => {
  it("names every kind of text message in plain words", () => {
    for (const code of ["visitor_visit_receipt_sms", "visitor_signout_thanks_sms", "visitor_prereg_invite_sms"]) {
      expect(emailName(code)).toMatch(/text message/);
    }
  });

  it("says a text goes to a mobile number, an email to an address", () => {
    expect(emailAudience("visitor", "sms")).toMatch(/mobile number/);
    expect(emailAudience("visitor")).toMatch(/address/);
    expect(emailAudience("visitor", "email")).toMatch(/address/);
  });

  it("tells the organisation that texts need the add-on and never carry personal detail", () => {
    expect(notificationPrefsCopy.smsNote).toMatch(/SMS add-on/);
    expect(notificationPrefsCopy.smsNote).toMatch(/name, host or purpose/);
  });
});
