import { BadRequestException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import * as chain from "../../common/audit/audit-chain";
import { CreateOrganisationAdminDto } from "../onboarding/dto/create-organisation-admin.dto";
import { LegalService } from "./legal.service";
import { agreementActionCode, LEGAL_DOCUMENTS, SIGNUP_DOCUMENTS } from "./legal-documents";

const ORG = "3f2b8c1e-9a4d-4e7b-8c55-0d1f2a3b4c5d";
const USER = "11111111-2222-4333-8444-555555555555";

/** A db whose execute() answers the setting query and the accepted-actions query. */
function service(options: { setting?: unknown; accepted?: string[] } = {}) {
  const execute = jest.fn(async (query: { queryChunks?: unknown[] }) => {
    const text = JSON.stringify(query.queryChunks ?? query);
    if (text.includes("platform_configuration_setting")) {
      return { rows: options.setting === undefined ? [] : [{ setting_value: options.setting }] };
    }
    return { rows: (options.accepted ?? []).map((action_code) => ({ action_code })) };
  });
  return new LegalService({ execute } as never);
}

describe("LegalService", () => {
  const append = jest.spyOn(chain, "appendAuditEvent").mockResolvedValue();
  beforeEach(() => append.mockClear());

  it("uses the default versions unless a valid platform setting overrides one", async () => {
    expect(await service().currentVersions()).toEqual({
      terms: LEGAL_DOCUMENTS.terms.version,
      privacy: LEGAL_DOCUMENTS.privacy.version,
    });
    const overridden = await service({
      setting: { terms: { version: "2027-01-15" }, privacy: { version: "not valid!" } },
    }).currentVersions();
    expect(overridden.terms).toBe("2027-01-15");
    expect(overridden.privacy).toBe(LEGAL_DOCUMENTS.privacy.version);
  });

  it("reports what is pending and what is accepted, by exact version", async () => {
    const fresh = await service().status(ORG);
    expect(fresh.pending).toEqual(["terms", "privacy"]);
    const termsOnly = await service({ accepted: [agreementActionCode("terms", LEGAL_DOCUMENTS.terms.version)] }).status(
      ORG,
    );
    expect(termsOnly.pending).toEqual(["privacy"]);
    // An older accepted version does not satisfy a newer one.
    const stale = await service({
      setting: { terms: { version: "2027-01-15" } },
      accepted: [agreementActionCode("terms", "2026-10-07")],
    }).status(ORG);
    expect(stale.documents.find((d) => d.code === "terms")).toMatchObject({ version: "2027-01-15", accepted: false });
  });

  it("records each document once, as the user, in the audit chain", async () => {
    await service().accept({ userId: USER, organisationId: ORG }, SIGNUP_DOCUMENTS);
    expect(append).toHaveBeenCalledTimes(2);
    expect(append.mock.calls.map((c) => c[1].actionCode)).toEqual([
      `agreement.accepted:terms:${LEGAL_DOCUMENTS.terms.version}`,
      `agreement.accepted:privacy:${LEGAL_DOCUMENTS.privacy.version}`,
    ]);
    expect(append.mock.calls[0][1]).toMatchObject({
      organisationId: ORG,
      actorId: USER,
      resourceType: "organisation",
      resourceId: ORG,
    });
  });

  it("is idempotent: a version already accepted is not recorded again", async () => {
    const accepted = [agreementActionCode("terms", LEGAL_DOCUMENTS.terms.version)];
    await service({ accepted }).accept({ userId: USER, organisationId: ORG }, ["terms", "terms"]);
    expect(append).not.toHaveBeenCalled();
  });

  it("refuses an unknown or empty list", async () => {
    await expect(service().accept({ userId: USER, organisationId: ORG }, ["cookies"])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service().accept({ userId: USER, organisationId: ORG }, [])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(append).not.toHaveBeenCalled();
  });
});

describe("account creation requires acceptance", () => {
  const body = { organisationName: "Acme", sectorCode: "sme", email: "owner@example.com", password: "river stone lantern" };

  it("refuses a sign-up that does not accept, or accepts with anything but true", async () => {
    for (const acceptTerms of [undefined, false, "true", 1]) {
      const errors = await validate(plainToInstance(CreateOrganisationAdminDto, { ...body, acceptTerms }));
      expect(errors.map((e) => e.property)).toContain("acceptTerms");
    }
  });

  it("accepts a sign-up that accepts", async () => {
    expect(await validate(plainToInstance(CreateOrganisationAdminDto, { ...body, acceptTerms: true }))).toEqual([]);
  });
});
