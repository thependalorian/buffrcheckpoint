import { STANDARD_FORM_FIELDS, STANDARD_RETENTION_DAYS } from "../organisation-standards/standard-defaults";
import { OrganisationDefaultsService } from "./organisation-defaults.service";

const USER = { userId: "u-1", organisationId: "org-1", roleCode: "owner_operator" } as never;

interface World {
  sites?: Array<{ id: string }>;
  hosts?: unknown[];
  retention?: Array<{ retentionDays: number }>;
  documents?: Array<{ policyCode: string }>;
  forms?: unknown[];
  qr?: Array<{ qrTypeCode: string }>;
  retentionStandard?: number;
}

function setup(world: World = {}) {
  const calls: string[] = [];
  // The fake answers the one existence query (all six EXISTS columns) from the world it was given, and the owner lookup otherwise.
  const db = {
    execute: jest.fn(async (query: { queryChunks?: unknown[] }) => {
      const text = JSON.stringify(query.queryChunks ?? query);
      if (text.includes("EXISTS")) {
        return {
          rows: [
            {
              site: (world.sites ?? []).length > 0,
              host: (world.hosts ?? []).length > 0,
              retention: (world.retention ?? []).length > 0,
              notice: (world.documents ?? []).some((d) => d.policyCode === "privacy_notice"),
              form: (world.forms ?? []).length > 0,
              qr: (world.qr ?? []).some((r) => r.qrTypeCode === "public_site_checkin"),
            },
          ],
        };
      }
      return { rows: [{ email: "owner@acme.test", organisation_name: "Acme Trading" }] };
    }),
  };
  const sites = {
    list: jest.fn(async () => world.sites ?? []),
    create: jest.fn(async (input: { name: string }) => {
      calls.push("site");
      return { id: "site-new", name: input.name };
    }),
  };
  const hosts = {
    listBySite: jest.fn(async () => world.hosts ?? []),
    create: jest.fn(async () => {
      calls.push("host");
      return { id: "host-new" };
    }),
  };
  const retention = {
    list: jest.fn(async () => world.retention ?? []),
    create: jest.fn(async () => {
      calls.push("retention");
      return {};
    }),
  };
  const fields: Array<Record<string, unknown>> = [];
  const policy = {
    listPolicyDocuments: jest.fn(async () => world.documents ?? []),
    createPolicyDocument: jest.fn(async () => {
      calls.push("privacy_notice");
      return { id: "doc-1" };
    }),
    createPolicyVersion: jest.fn(async () => ({ id: "ver-1" })),
    publishPolicyVersion: jest.fn(async () => ({})),
    list: jest.fn(async () => world.forms ?? []),
    create: jest.fn(async () => {
      calls.push("check_in_form");
      return { id: "form-1" };
    }),
    createFormVersion: jest.fn(async () => ({ id: "fver-1" })),
    addFormField: jest.fn(async (_v: string, input: Record<string, unknown>) => {
      fields.push(input);
      return {};
    }),
    publishFormVersion: jest.fn(async () => ({})),
  };
  const qr = {
    list: jest.fn(async () => world.qr ?? []),
    create: jest.fn(async () => {
      calls.push("site_qr");
      return {};
    }),
  };
  const standards = { standardRetentionDays: jest.fn(async () => world.retentionStandard ?? STANDARD_RETENTION_DAYS) };
  const state = { notifyChanged: jest.fn() };
  const service = new OrganisationDefaultsService(
    db as never,
    sites as never,
    hosts as never,
    retention as never,
    policy as never,
    qr as never,
    standards as never,
    state as never,
  );
  return { service, calls, db, sites, hosts, retention, policy, qr, state, fields };
}

describe("OrganisationDefaultsService", () => {
  it("gives an empty organisation a complete working setup, in dependency order", async () => {
    const t = setup();
    const result = await t.service.ensure(USER);
    expect(result.created).toEqual(["site", "host", "retention", "privacy_notice", "check_in_form", "site_qr"]);
    expect(t.calls).toEqual(["site", "host", "retention", "privacy_notice", "check_in_form", "site_qr"]);
    expect(t.state.notifyChanged).toHaveBeenCalledWith("org-1");
  });

  it("makes the owner the first host contact and attaches it to the first site", async () => {
    const t = setup();
    await t.service.ensure(USER);
    expect(t.hosts.create).toHaveBeenCalledWith(
      expect.objectContaining({ siteId: "site-new", name: "Reception", contactReference: "owner@acme.test" }),
      USER,
    );
    expect(t.qr.create).toHaveBeenCalledWith(
      expect.objectContaining({ siteId: "site-new", qrTypeCode: "public_site_checkin" }),
      USER,
    );
  });

  it("publishes the standard form exactly as defined, with no high-risk field", async () => {
    const t = setup();
    await t.service.ensure(USER);
    expect(t.fields.map((f) => f.fieldCode)).toEqual(STANDARD_FORM_FIELDS.map((f) => f.fieldCode));
    expect(t.fields.map((f) => f.dataClassificationCode)).not.toContain("high_risk");
    expect(t.policy.publishFormVersion).toHaveBeenCalledWith("fver-1", USER);
    expect(t.policy.publishPolicyVersion).toHaveBeenCalledWith("ver-1", USER);
  });

  it("states the platform retention period in the notice and uses it for the policy", async () => {
    const t = setup({ retentionStandard: 180 });
    await t.service.ensure(USER);
    expect(t.retention.create).toHaveBeenCalledWith({ retentionDays: 180 }, USER);
    const text = (t.policy.createPolicyVersion.mock.calls[0] as unknown as [string, { contentText: string }])[1]
      .contentText;
    expect(text).toContain("for 180 days");
    expect(text).toContain("Acme Trading");
  });

  it("creates nothing and changes nothing when the organisation already has everything", async () => {
    const t = setup({
      sites: [{ id: "s1" }],
      hosts: [{}],
      retention: [{ retentionDays: 90 }],
      documents: [{ policyCode: "privacy_notice" }],
      forms: [{}],
      qr: [{ qrTypeCode: "public_site_checkin" }],
    });
    const result = await t.service.ensure(USER);
    expect(result.created).toEqual([]);
    expect(t.calls).toEqual([]);
    expect(t.state.notifyChanged).not.toHaveBeenCalled();
  });

  it("answers the usual case with a single query: nothing else is read when everything exists", async () => {
    const t = setup({
      sites: [{ id: "s1" }],
      hosts: [{}],
      retention: [{ retentionDays: 90 }],
      documents: [{ policyCode: "privacy_notice" }],
      forms: [{}],
      qr: [{ qrTypeCode: "public_site_checkin" }],
    });
    await t.service.ensure(USER);
    expect(t.db.execute).toHaveBeenCalledTimes(1);
    for (const read of [
      t.sites.list,
      t.hosts.listBySite,
      t.retention.list,
      t.policy.listPolicyDocuments,
      t.policy.list,
      t.qr.list,
    ]) {
      expect(read).not.toHaveBeenCalled();
    }
  });

  it("only fills gaps: an existing site is kept and the rest is built around it", async () => {
    const t = setup({ sites: [{ id: "their-site" }], retention: [{ retentionDays: 90 }] });
    const result = await t.service.ensure(USER);
    expect(result.created).toEqual(["host", "privacy_notice", "check_in_form", "site_qr"]);
    expect(t.hosts.create).toHaveBeenCalledWith(expect.objectContaining({ siteId: "their-site" }), USER);
    expect(t.qr.create).toHaveBeenCalledWith(expect.objectContaining({ siteId: "their-site" }), USER);
    // The notice must state the 90 days they chose, not the platform standard.
    const text = (t.policy.createPolicyVersion.mock.calls[0] as unknown as [string, { contentText: string }])[1]
      .contentText;
    expect(text).toContain("for 90 days");
  });

  it("never overwrites a privacy notice or form the organisation has started, in any state", async () => {
    const t = setup({ documents: [{ policyCode: "privacy_notice" }], forms: [{}] });
    const result = await t.service.ensure(USER);
    expect(result.created).toEqual(["site", "host", "retention", "site_qr"]);
    expect(t.policy.createPolicyDocument).not.toHaveBeenCalled();
    expect(t.policy.create).not.toHaveBeenCalled();
  });

  it("does not mistake another kind of notice for a privacy notice", async () => {
    const t = setup({ documents: [{ policyCode: "emergency_information" }] });
    expect((await t.service.ensure(USER)).created).toContain("privacy_notice");
  });

  it("shares one execution between simultaneous runs for the same organisation", async () => {
    const t = setup();
    const [a, b] = await Promise.all([t.service.ensure(USER), t.service.ensure(USER)]);
    expect(a).toBe(b);
    expect(t.sites.create).toHaveBeenCalledTimes(1);
    // A run after the first has finished starts fresh (and finds the world unchanged here, since the fakes do not store).
    await t.service.ensure(USER);
    expect(t.sites.list).toHaveBeenCalledTimes(2);
  });
});
