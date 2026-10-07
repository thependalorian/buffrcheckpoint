import { TemplatedEmailService } from "./templated-email.service";

function setup(enabled = true) {
  const sent: Array<{ message: string; html: string; recipientReference: string }> = [];
  const templates = {
    render: jest.fn(async (_code: string, vars: Record<string, string>) => ({
      subject: `Re: ${vars.subject ?? "x"}`,
      body: `Body for ${vars.subject ?? "x"}.`,
    })),
  };
  const notifications = {
    sendForOrganisation: jest.fn(async (payload: never) => {
      sent.push(payload);
      return { id: "n1" };
    }),
  };
  const preferences = { isEnabled: jest.fn(async () => enabled) };
  return {
    service: new TemplatedEmailService(templates as never, notifications as never, preferences as never),
    sent,
    preferences,
  };
}

const base = {
  templateCode: "support_ticket_reply",
  organisationId: "org-1",
  to: "a@example.com",
  variables: { subject: "Door" },
  fallback: { subject: "s", body: "b" },
};

describe("TemplatedEmailService", () => {
  it("greets by name and signs with the part of the company writing, in both text and HTML", async () => {
    const { service, sent } = setup();
    await service.send({ ...base, recipientName: "Maria" });
    expect(sent[0].message).toBe(
      "Hello Maria,\n\nBody for Door.\n\nKind regards,\nBuffr Checkpoint Support, Customer support\n",
    );
    expect(sent[0].html).toContain("Hello Maria,");
    expect(sent[0].html).toContain("Buffr Checkpoint Support");
  });

  it("signs as a named person when given a usable name, otherwise as the team", async () => {
    const named = setup();
    await named.service.send({ ...base, signedBy: { name: "Joseph Amukoto", role: "Support" } });
    expect(named.sent[0].message).toContain("Kind regards,\nJoseph Amukoto, Support");
    const unusable = setup();
    await unusable.service.send({ ...base, signedBy: { name: "joseph@buffr.ai" } });
    expect(unusable.sent[0].message).toContain("Buffr Checkpoint Support");
  });

  it("puts a hero picture under the title of customer mail and none on ops mail, with no closing picture", async () => {
    const customer = setup();
    await customer.service.send(base);
    expect(customer.sent[0].html).toContain("/email/hero-contact-consultation.jpg");
    expect(customer.sent[0].html).not.toContain("closing-");
    const ops = setup();
    await ops.service.send({ ...base, templateCode: "ops_contact_enquiry" });
    expect(ops.sent[0].html).not.toContain("/email/hero-");
    expect(ops.sent[0].message).toBe("Body for Door.");
  });

  it("sends nothing when the organisation has switched the optional email off", async () => {
    const { service, sent, preferences } = setup(false);
    expect(await service.send({ ...base, templateCode: "visitor_visit_receipt" })).toBeNull();
    expect(sent).toHaveLength(0);
    expect(preferences.isEnabled).toHaveBeenCalledWith("org-1", "visitor_visit_receipt");
  });
});
