import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { resolveInlineArtifactText, resolvePublicAssetUrl } from "../../common/assets/public-asset-url";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  checkInFormDefinitions,
  checkInFormFields,
  checkInFormFieldTranslations,
  checkInFormVersions,
  kioskPrivacyPreCheckinAcknowledgements,
  sites,
  typeDefinition,
  visitorCategories,
  visitorPolicyAcknowledgements,
  visitorPolicyDocuments,
  visitorPolicyVersions,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { VisitorDataMinimisationService } from "./visitor-data-minimisation.service";
import { createHash, randomUUID } from "node:crypto";

export type EffectiveFormField = {
  fieldCode: string;
  fieldLabel: string;
  helpText: string | null;
  fieldTypeCode: string;
  required: boolean;
  displayOrder: number;
  dataClassificationCode: string;
  visibilityRule: Record<string, unknown>;
  validationSchema: Record<string, unknown>;
};

export type EffectiveCheckInForm = {
  formDefinitionId: string;
  formVersionId: string;
  formName: string | null;
  visitorTypeCode: string;
  fields: EffectiveFormField[];
};

export interface CreateCheckInFormDefinitionInput {
  visitorCategoryCode: string;
  siteId?: string;
  formName?: string;
}

export interface AcknowledgePolicyInput {
  visitId: string;
  policyVersionId: string;
  legalBasisCode: string;
  languageShownCode: string;
  acknowledgementMethodCode: string;
  displayedAt: string;
  acceptedAt?: string;
  signatureArtifactId?: string;
  deviceId?: string;
  siteId?: string;
  captureChannelCode?: string;
}

export interface PreCheckinAcknowledgePolicyInput {
  siteId: string;
  kioskSessionId: string;
  policyVersionId: string;
  legalBasisCode: string;
  languageShownCode: string;
  acknowledgementMethodCode: string;
  displayedAt: string;
  acceptedAt?: string;
  deviceId?: string;
  captureChannelCode?: string;
}

@Injectable()
export class VisitorPolicyService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly dataMinimisation: VisitorDataMinimisationService,
  ) {}

  async create(input: CreateCheckInFormDefinitionInput, user: AuthenticatedUser) {
    const visitorCategoryCode = await this.typeDefs.id("visitor_type", input.visitorCategoryCode);
    const [created] = await this.db
      .insert(checkInFormDefinitions)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        visitorCategoryCode,
        siteId: input.siteId ?? null,
        formName: input.formName ?? null,
      })
      .returning();
    return created;
  }

  async list(user: AuthenticatedUser) {
    return this.db.query.checkInFormDefinitions.findMany({
      where: and(
        eq(checkInFormDefinitions.organisationId, user.organisationId),
        isNull(checkInFormDefinitions.deletedAt),
      ),
    });
  }

  async createFormVersion(formDefinitionId: string, user: AuthenticatedUser) {
    const form = await this.requireForm(formDefinitionId, user);
    const existing = await this.db.query.checkInFormVersions.findMany({
      where: and(eq(checkInFormVersions.formDefinitionId, form.id), isNull(checkInFormVersions.deletedAt)),
    });
    const versionNumber = existing.reduce((max, row) => Math.max(max, row.versionNumber), 0) + 1;
    const draftStatus = await this.typeDefs.id("form_version_status", "draft");
    const [created] = await this.db
      .insert(checkInFormVersions)
      .values({
        id: randomUUID(),
        formDefinitionId: form.id,
        versionNumber,
        statusCode: draftStatus,
        effectiveFrom: new Date(),
      })
      .returning();
    return created;
  }

  async listFormVersions(formDefinitionId: string, user: AuthenticatedUser) {
    await this.requireForm(formDefinitionId, user);
    const rows = await this.db.query.checkInFormVersions.findMany({
      where: and(eq(checkInFormVersions.formDefinitionId, formDefinitionId), isNull(checkInFormVersions.deletedAt)),
      orderBy: [desc(checkInFormVersions.versionNumber)],
    });
    const statuses = await this.db.query.typeDefinition.findMany({
      where: and(eq(typeDefinition.domain, "form_version_status"), isNull(typeDefinition.deletedAt)),
    });
    const byId = new Map(statuses.map((s) => [s.id, s.code]));
    return rows.map((r) => ({
      ...r,
      status: byId.get(r.statusCode ?? "") ?? "unknown",
    }));
  }

  async addFormField(
    versionId: string,
    input: {
      fieldCode: string;
      fieldLabel?: string;
      fieldTypeCode?: string;
      helpText?: string;
      dataClassificationCode: string;
      required?: boolean;
      displayOrder?: number;
      visibilityRule?: Record<string, unknown>;
      validationSchema?: Record<string, unknown>;
    },
    user: AuthenticatedUser,
  ) {
    const version = await this.requireDraftFormVersion(versionId, user);
    const dataClassificationCode = await this.typeDefs.id("field_class", input.dataClassificationCode);
    const fieldTypeCode = await this.typeDefs.id("field_type", input.fieldTypeCode ?? "text");
    const [created] = await this.db
      .insert(checkInFormFields)
      .values({
        id: randomUUID(),
        formVersionId: version.id,
        fieldCode: input.fieldCode,
        fieldLabel: input.fieldLabel ?? null,
        fieldTypeCode,
        helpText: input.helpText ?? null,
        dataClassificationCode,
        required: input.required ?? false,
        displayOrder: input.displayOrder ?? 0,
        visibilityRule: input.visibilityRule ?? {},
        validationSchema: input.validationSchema ?? {},
      })
      .returning();
    return created;
  }

  async updateFormField(
    fieldId: string,
    input: {
      fieldLabel?: string;
      fieldTypeCode?: string;
      helpText?: string;
      dataClassificationCode?: string;
      required?: boolean;
      displayOrder?: number;
      visibilityRule?: Record<string, unknown>;
      validationSchema?: Record<string, unknown>;
    },
    user: AuthenticatedUser,
  ) {
    const field = await this.db.query.checkInFormFields.findFirst({
      where: and(eq(checkInFormFields.id, fieldId), isNull(checkInFormFields.deletedAt)),
    });
    if (!field) throw new NotFoundException("Form field not found");
    await this.requireDraftFormVersion(field.formVersionId, user);
    const fieldTypeCode =
      input.fieldTypeCode !== undefined ? await this.typeDefs.id("field_type", input.fieldTypeCode) : undefined;
    const dataClassificationCode =
      input.dataClassificationCode !== undefined
        ? await this.typeDefs.id("field_class", input.dataClassificationCode)
        : undefined;
    const [updated] = await this.db
      .update(checkInFormFields)
      .set({
        ...(input.fieldLabel !== undefined ? { fieldLabel: input.fieldLabel } : {}),
        ...(input.helpText !== undefined ? { helpText: input.helpText } : {}),
        ...(fieldTypeCode !== undefined ? { fieldTypeCode } : {}),
        ...(dataClassificationCode !== undefined ? { dataClassificationCode } : {}),
        ...(input.required !== undefined ? { required: input.required } : {}),
        ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
        ...(input.visibilityRule !== undefined ? { visibilityRule: input.visibilityRule } : {}),
        ...(input.validationSchema !== undefined ? { validationSchema: input.validationSchema } : {}),
      })
      .where(eq(checkInFormFields.id, fieldId))
      .returning();
    return updated;
  }

  async softDeleteFormField(fieldId: string, user: AuthenticatedUser) {
    const field = await this.db.query.checkInFormFields.findFirst({
      where: and(eq(checkInFormFields.id, fieldId), isNull(checkInFormFields.deletedAt)),
    });
    if (!field) throw new NotFoundException("Form field not found");
    await this.requireDraftFormVersion(field.formVersionId, user);
    const [updated] = await this.db
      .update(checkInFormFields)
      .set({ deletedAt: new Date() })
      .where(eq(checkInFormFields.id, fieldId))
      .returning();
    return updated;
  }

  async reorderFormFields(versionId: string, fieldIdsInOrder: string[], user: AuthenticatedUser) {
    await this.requireDraftFormVersion(versionId, user);
    for (let i = 0; i < fieldIdsInOrder.length; i++) {
      await this.db
        .update(checkInFormFields)
        .set({ displayOrder: i })
        .where(
          and(
            eq(checkInFormFields.id, fieldIdsInOrder[i]),
            eq(checkInFormFields.formVersionId, versionId),
            isNull(checkInFormFields.deletedAt),
          ),
        );
    }
    return this.getFormVersionWithFields(versionId, user);
  }

  async cloneFormVersion(sourceVersionId: string, user: AuthenticatedUser) {
    const source = await this.requireFormVersion(sourceVersionId, user);
    const draft = await this.createFormVersion(source.formDefinitionId, user);
    const fields = await this.db.query.checkInFormFields.findMany({
      where: and(eq(checkInFormFields.formVersionId, source.id), isNull(checkInFormFields.deletedAt)),
      orderBy: [asc(checkInFormFields.displayOrder)],
    });
    for (const field of fields) {
      const newFieldId = randomUUID();
      await this.db.insert(checkInFormFields).values({
        id: newFieldId,
        formVersionId: draft.id,
        fieldCode: field.fieldCode,
        fieldLabel: field.fieldLabel,
        fieldTypeCode: field.fieldTypeCode,
        helpText: field.helpText,
        dataClassificationCode: field.dataClassificationCode,
        required: field.required,
        displayOrder: field.displayOrder,
        visibilityRule: field.visibilityRule ?? {},
        validationSchema: field.validationSchema ?? {},
      });
      const translations = await this.db.query.checkInFormFieldTranslations.findMany({
        where: and(eq(checkInFormFieldTranslations.fieldId, field.id), isNull(checkInFormFieldTranslations.deletedAt)),
      });
      for (const tr of translations) {
        await this.db.insert(checkInFormFieldTranslations).values({
          id: randomUUID(),
          fieldId: newFieldId,
          languageCode: tr.languageCode,
          fieldLabel: tr.fieldLabel,
          helpText: tr.helpText,
        });
      }
    }
    if (source.approvalReference) {
      await this.db
        .update(checkInFormVersions)
        .set({ approvalReference: source.approvalReference })
        .where(eq(checkInFormVersions.id, draft.id));
    }
    return this.getFormVersionWithFields(draft.id, user);
  }

  async upsertFieldTranslation(
    fieldId: string,
    input: { languageCode: string; fieldLabel?: string; helpText?: string },
    user: AuthenticatedUser,
  ) {
    const field = await this.db.query.checkInFormFields.findFirst({
      where: and(eq(checkInFormFields.id, fieldId), isNull(checkInFormFields.deletedAt)),
    });
    if (!field) throw new NotFoundException("Form field not found");
    await this.requireDraftFormVersion(field.formVersionId, user);
    const languageCode = await this.typeDefs.id("language_code", input.languageCode);
    const existing = await this.db.query.checkInFormFieldTranslations.findFirst({
      where: and(
        eq(checkInFormFieldTranslations.fieldId, fieldId),
        eq(checkInFormFieldTranslations.languageCode, languageCode),
        isNull(checkInFormFieldTranslations.deletedAt),
      ),
    });
    if (existing) {
      const [updated] = await this.db
        .update(checkInFormFieldTranslations)
        .set({
          ...(input.fieldLabel !== undefined ? { fieldLabel: input.fieldLabel } : {}),
          ...(input.helpText !== undefined ? { helpText: input.helpText } : {}),
        })
        .where(eq(checkInFormFieldTranslations.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await this.db
      .insert(checkInFormFieldTranslations)
      .values({
        id: randomUUID(),
        fieldId,
        languageCode,
        fieldLabel: input.fieldLabel ?? null,
        helpText: input.helpText ?? null,
      })
      .returning();
    return created;
  }

  async setFormVersionApprovalReference(versionId: string, approvalReference: string, user: AuthenticatedUser) {
    await this.requireDraftFormVersion(versionId, user);
    const [updated] = await this.db
      .update(checkInFormVersions)
      .set({ approvalReference: approvalReference.trim() || null })
      .where(eq(checkInFormVersions.id, versionId))
      .returning();
    return updated;
  }

  async getFormDefinition(formDefinitionId: string, user: AuthenticatedUser) {
    return this.requireForm(formDefinitionId, user);
  }

  async listFieldLibrary() {
    const [fieldCodes, fieldTypes, fieldClasses, languages] = await Promise.all([
      this.db.query.typeDefinition.findMany({
        where: and(eq(typeDefinition.domain, "check_in_field_code"), isNull(typeDefinition.deletedAt)),
        orderBy: [asc(typeDefinition.sortOrder)],
      }),
      this.db.query.typeDefinition.findMany({
        where: and(eq(typeDefinition.domain, "field_type"), isNull(typeDefinition.deletedAt)),
        orderBy: [asc(typeDefinition.sortOrder)],
      }),
      this.db.query.typeDefinition.findMany({
        where: and(eq(typeDefinition.domain, "field_class"), isNull(typeDefinition.deletedAt)),
        orderBy: [asc(typeDefinition.sortOrder)],
      }),
      this.db.query.typeDefinition.findMany({
        where: and(eq(typeDefinition.domain, "language_code"), isNull(typeDefinition.deletedAt)),
        orderBy: [asc(typeDefinition.sortOrder)],
      }),
    ]);
    return {
      fieldCodes: fieldCodes.map((r) => ({ code: r.code, label: r.label })),
      fieldTypes: fieldTypes.map((r) => ({ code: r.code, label: r.label })),
      fieldClasses: fieldClasses.map((r) => ({ code: r.code, label: r.label })),
      languages: languages.map((r) => ({ code: r.code, label: r.label })),
    };
  }

  async publishFormVersion(versionId: string, user: AuthenticatedUser, options?: { approvalReference?: string }) {
    const version = await this.requireDraftFormVersion(versionId, user);
    if (options?.approvalReference !== undefined) {
      await this.db
        .update(checkInFormVersions)
        .set({ approvalReference: options.approvalReference.trim() || null })
        .where(eq(checkInFormVersions.id, version.id));
    }
    const refreshed = await this.db.query.checkInFormVersions.findFirst({
      where: eq(checkInFormVersions.id, version.id),
    });
    const fields = await this.db.query.checkInFormFields.findMany({
      where: and(eq(checkInFormFields.formVersionId, version.id), isNull(checkInFormFields.deletedAt)),
    });
    if (fields.length === 0) {
      throw new BadRequestException("Publish requires at least one form field");
    }
    const classRows = await this.db.query.typeDefinition.findMany({
      where: and(eq(typeDefinition.domain, "field_class"), isNull(typeDefinition.deletedAt)),
    });
    const classById = new Map(classRows.map((r) => [r.id, r.code]));
    this.dataMinimisation.assertPublishAllowed(
      fields.map((f) => ({
        dataClassificationCode: classById.get(f.dataClassificationCode) ?? "basic",
      })),
      refreshed?.approvalReference ?? version.approvalReference,
    );
    const publishedStatus = await this.typeDefs.id("form_version_status", "published");
    const archivedStatus = await this.typeDefs.id("form_version_status", "archived");
    const siblings = await this.db.query.checkInFormVersions.findMany({
      where: and(
        eq(checkInFormVersions.formDefinitionId, version.formDefinitionId),
        isNull(checkInFormVersions.deletedAt),
      ),
    });
    for (const sibling of siblings) {
      if (sibling.id === version.id) continue;
      if (sibling.statusCode === publishedStatus) {
        await this.db
          .update(checkInFormVersions)
          .set({ statusCode: archivedStatus, effectiveUntil: new Date() })
          .where(eq(checkInFormVersions.id, sibling.id));
      }
    }
    const [updated] = await this.db
      .update(checkInFormVersions)
      .set({ statusCode: publishedStatus, effectiveFrom: new Date() })
      .where(eq(checkInFormVersions.id, version.id))
      .returning();
    return { ...updated, fields };
  }

  async getFormVersionWithFields(versionId: string, user: AuthenticatedUser) {
    const version = await this.requireFormVersion(versionId, user);
    const fields = await this.db.query.checkInFormFields.findMany({
      where: and(eq(checkInFormFields.formVersionId, version.id), isNull(checkInFormFields.deletedAt)),
      orderBy: [asc(checkInFormFields.displayOrder)],
    });
    const fieldIds = fields.map((f) => f.id);
    const translations =
      fieldIds.length === 0
        ? []
        : await this.db.query.checkInFormFieldTranslations.findMany({
            where: isNull(checkInFormFieldTranslations.deletedAt),
          });
    const typeRows = await this.db.query.typeDefinition.findMany({
      where: isNull(typeDefinition.deletedAt),
    });
    const typeById = new Map(typeRows.map((r) => [r.id, r]));
    const trByField = new Map<string, typeof translations>();
    for (const tr of translations) {
      if (!fieldIds.includes(tr.fieldId)) continue;
      const list = trByField.get(tr.fieldId) ?? [];
      list.push(tr);
      trByField.set(tr.fieldId, list);
    }
    return {
      ...version,
      fields: fields.map((f) => ({
        ...f,
        fieldTypeCode: typeById.get(f.fieldTypeCode)?.code ?? "text",
        dataClassificationCode: typeById.get(f.dataClassificationCode)?.code ?? "basic",
        translations: (trByField.get(f.id) ?? []).map((tr) => ({
          id: tr.id,
          languageCode: typeById.get(tr.languageCode)?.code ?? "",
          fieldLabel: tr.fieldLabel,
          helpText: tr.helpText,
        })),
      })),
    };
  }

  /**
   * Resolve the published check-in form for a site + visitor type.
   * Prefers site-scoped definitions, then organisation-wide.
   * Returns null when no published form exists (clients keep static defaults).
   */
  async resolveEffectiveForm(
    organisationId: string,
    siteId: string | null | undefined,
    visitorTypeCode: string,
    languageCode?: string | null,
  ): Promise<EffectiveCheckInForm | null> {
    const visitorType = await this.db.query.typeDefinition.findFirst({
      where: and(
        eq(typeDefinition.domain, "visitor_type"),
        eq(typeDefinition.code, visitorTypeCode),
        isNull(typeDefinition.deletedAt),
      ),
    });
    if (!visitorType) return null;

    const publishedStatus = await this.typeDefs.id("form_version_status", "published");
    const definitions = await this.db.query.checkInFormDefinitions.findMany({
      where: and(
        eq(checkInFormDefinitions.organisationId, organisationId),
        eq(checkInFormDefinitions.visitorCategoryCode, visitorType.id),
        isNull(checkInFormDefinitions.deletedAt),
      ),
    });
    if (definitions.length === 0) return null;

    const preferred =
      (siteId ? definitions.find((d) => d.siteId === siteId) : undefined) ??
      definitions.find((d) => d.siteId == null) ??
      definitions[0];

    const version = await this.db.query.checkInFormVersions.findFirst({
      where: and(
        eq(checkInFormVersions.formDefinitionId, preferred.id),
        eq(checkInFormVersions.statusCode, publishedStatus),
        isNull(checkInFormVersions.deletedAt),
      ),
      orderBy: [desc(checkInFormVersions.versionNumber)],
    });
    if (!version) return null;

    const fields = await this.db.query.checkInFormFields.findMany({
      where: and(eq(checkInFormFields.formVersionId, version.id), isNull(checkInFormFields.deletedAt)),
      orderBy: [asc(checkInFormFields.displayOrder)],
    });

    const typeRows = await this.db.query.typeDefinition.findMany({
      where: isNull(typeDefinition.deletedAt),
    });
    const typeById = new Map(typeRows.map((r) => [r.id, r]));

    let languageId: string | null = null;
    if (languageCode?.trim()) {
      const lang = typeRows.find((r) => r.domain === "language_code" && r.code === languageCode.trim());
      languageId = lang?.id ?? null;
    }

    const translations =
      languageId && fields.length
        ? await this.db.query.checkInFormFieldTranslations.findMany({
            where: and(
              eq(checkInFormFieldTranslations.languageCode, languageId),
              isNull(checkInFormFieldTranslations.deletedAt),
            ),
          })
        : [];
    const trByField = new Map(
      translations.filter((t) => fields.some((f) => f.id === t.fieldId)).map((t) => [t.fieldId, t]),
    );

    return {
      formDefinitionId: preferred.id,
      formVersionId: version.id,
      formName: preferred.formName,
      visitorTypeCode,
      fields: fields.map((f) => {
        const tr = trByField.get(f.id);
        return {
          fieldCode: f.fieldCode,
          fieldLabel: tr?.fieldLabel?.trim() || f.fieldLabel?.trim() || f.fieldCode,
          helpText: tr?.helpText ?? f.helpText ?? null,
          fieldTypeCode: typeById.get(f.fieldTypeCode)?.code ?? "text",
          required: f.required,
          displayOrder: f.displayOrder,
          dataClassificationCode: typeById.get(f.dataClassificationCode)?.code ?? "basic",
          visibilityRule: (f.visibilityRule ?? {}) as Record<string, unknown>,
          validationSchema: (f.validationSchema ?? {}) as Record<string, unknown>,
        };
      }),
    };
  }

  async resolveEffectiveFormForUser(
    siteId: string | undefined,
    visitorTypeCode: string,
    user: AuthenticatedUser,
    languageCode?: string,
  ): Promise<EffectiveCheckInForm | null> {
    return this.resolveEffectiveForm(user.organisationId, siteId ?? user.siteId, visitorTypeCode, languageCode);
  }

  async createVisitorCategory(
    input: {
      visitorCategoryCode: string;
      formDefinitionId: string;
      defaultAssuranceLevelCode: string;
      defaultRiskTierCode?: string;
    },
    user: AuthenticatedUser,
  ) {
    await this.requireForm(input.formDefinitionId, user);
    const [visitorCategoryCode, defaultAssuranceLevelCode] = await Promise.all([
      this.typeDefs.id("visitor_type", input.visitorCategoryCode),
      this.typeDefs.id("assurance_level", input.defaultAssuranceLevelCode),
    ]);
    const defaultRiskTierCode = input.defaultRiskTierCode
      ? await this.typeDefs.id("risk_tier", input.defaultRiskTierCode)
      : null;
    const [created] = await this.db
      .insert(visitorCategories)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        visitorCategoryCode,
        formDefinitionId: input.formDefinitionId,
        defaultAssuranceLevelCode,
        defaultRiskTierCode,
      })
      .returning();
    return created;
  }

  async listVisitorCategories(user: AuthenticatedUser) {
    return this.db.query.visitorCategories.findMany({
      where: and(eq(visitorCategories.organisationId, user.organisationId), isNull(visitorCategories.deletedAt)),
    });
  }

  async createPolicyDocument(
    input: { policyCode: string; policyName?: string; category?: string },
    user: AuthenticatedUser,
  ) {
    const [created] = await this.db
      .insert(visitorPolicyDocuments)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        policyCode: input.policyCode,
        policyName: input.policyName ?? null,
        category: input.category ?? null,
      })
      .returning();
    return created;
  }

  async listPolicyDocuments(user: AuthenticatedUser) {
    return this.db.query.visitorPolicyDocuments.findMany({
      where: and(
        eq(visitorPolicyDocuments.organisationId, user.organisationId),
        isNull(visitorPolicyDocuments.deletedAt),
      ),
    });
  }

  async createPolicyVersion(
    documentId: string,
    input: { contentText: string; languageCode: string },
    user: AuthenticatedUser,
  ) {
    const doc = await this.requirePolicyDocument(documentId, user);
    const existing = await this.db.query.visitorPolicyVersions.findMany({
      where: and(eq(visitorPolicyVersions.policyDocumentId, doc.id), isNull(visitorPolicyVersions.deletedAt)),
    });
    const versionNumber = existing.reduce((max, row) => Math.max(max, row.versionNumber), 0) + 1;
    const languageCode = await this.typeDefs.id("language_code", input.languageCode);
    const draftStatus = await this.typeDefs.id("policy_version_status", "draft");
    const contentHash = createHash("sha256").update(input.contentText).digest("hex");
    const [created] = await this.db
      .insert(visitorPolicyVersions)
      .values({
        id: randomUUID(),
        policyDocumentId: doc.id,
        versionNumber,
        contentArtifactId: `inline:${input.contentText}`,
        contentHash,
        languageCode,
        statusCode: draftStatus,
        effectiveFrom: new Date(),
      })
      .returning();
    return created;
  }

  async publishPolicyVersion(versionId: string, user: AuthenticatedUser) {
    const version = await this.requirePolicyVersion(versionId, user);
    const publishedStatus = await this.typeDefs.id("policy_version_status", "published");
    const supersededStatus = await this.typeDefs.id("policy_version_status", "superseded");
    const siblings = await this.db.query.visitorPolicyVersions.findMany({
      where: and(
        eq(visitorPolicyVersions.policyDocumentId, version.policyDocumentId),
        isNull(visitorPolicyVersions.deletedAt),
      ),
    });
    for (const sibling of siblings) {
      if (sibling.id === version.id) continue;
      if (sibling.statusCode === publishedStatus) {
        await this.db
          .update(visitorPolicyVersions)
          .set({ statusCode: supersededStatus })
          .where(eq(visitorPolicyVersions.id, sibling.id));
      }
    }
    const [updated] = await this.db
      .update(visitorPolicyVersions)
      .set({ statusCode: publishedStatus, effectiveFrom: new Date() })
      .where(eq(visitorPolicyVersions.id, version.id))
      .returning();
    return updated;
  }

  async archivePolicyVersion(versionId: string, user: AuthenticatedUser) {
    await this.requirePolicyVersion(versionId, user);
    const archivedStatus = await this.typeDefs.id("policy_version_status", "archived");
    const [updated] = await this.db
      .update(visitorPolicyVersions)
      .set({ statusCode: archivedStatus })
      .where(eq(visitorPolicyVersions.id, versionId))
      .returning();
    return updated;
  }

  async acknowledge(input: AcknowledgePolicyInput, user: AuthenticatedUser) {
    const lookups = [
      this.typeDefs.id("legal_basis_code", input.legalBasisCode),
      this.typeDefs.id("language_code", input.languageShownCode),
      this.typeDefs.id("acknowledgement_method", input.acknowledgementMethodCode),
    ];
    if (input.captureChannelCode) {
      lookups.push(this.typeDefs.id("capture_channel", input.captureChannelCode));
    }
    const resolved = await Promise.all(lookups);
    const [legalBasisCode, languageShownCode, acknowledgementMethodCode] = resolved;
    const captureChannelCode = input.captureChannelCode ? resolved[3] : null;

    const [created] = await this.db
      .insert(visitorPolicyAcknowledgements)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        visitId: input.visitId,
        policyVersionId: input.policyVersionId,
        legalBasisCode,
        languageShownCode,
        displayedAt: new Date(input.displayedAt),
        acceptedAt: input.acceptedAt ? new Date(input.acceptedAt) : null,
        acknowledgementMethodCode,
        signatureArtifactId: input.signatureArtifactId ?? null,
        deviceId: input.deviceId ?? null,
        siteId: input.siteId ?? user.siteId ?? null,
        captureChannelCode,
      })
      .returning();

    return created;
  }

  async acknowledgePreCheckin(input: PreCheckinAcknowledgePolicyInput, user: AuthenticatedUser) {
    const siteRow = await this.db.query.sites.findFirst({
      where: and(eq(sites.id, input.siteId), eq(sites.organisationId, user.organisationId)),
    });
    if (!siteRow) throw new NotFoundException("Site not found");

    const existing = await this.db.query.kioskPrivacyPreCheckinAcknowledgements.findFirst({
      where: eq(kioskPrivacyPreCheckinAcknowledgements.kioskSessionId, input.kioskSessionId),
    });
    if (existing) return existing;

    const lookups = [
      this.typeDefs.id("legal_basis_code", input.legalBasisCode),
      this.typeDefs.id("language_code", input.languageShownCode),
      this.typeDefs.id("acknowledgement_method", input.acknowledgementMethodCode),
    ];
    if (input.captureChannelCode) {
      lookups.push(this.typeDefs.id("capture_channel", input.captureChannelCode));
    }
    const resolved = await Promise.all(lookups);
    const [legalBasisCode, languageShownCode, acknowledgementMethodCode] = resolved;
    const captureChannelCode = input.captureChannelCode ? resolved[3] : null;

    const [created] = await this.db
      .insert(kioskPrivacyPreCheckinAcknowledgements)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        siteId: input.siteId,
        kioskSessionId: input.kioskSessionId,
        policyVersionId: input.policyVersionId,
        legalBasisCode,
        languageShownCode,
        acknowledgementMethodCode,
        displayedAt: new Date(input.displayedAt),
        acceptedAt: input.acceptedAt ? new Date(input.acceptedAt) : null,
        deviceId: input.deviceId ?? null,
        captureChannelCode,
      })
      .returning();

    return created;
  }

  async listVersions(user: AuthenticatedUser) {
    return this.db
      .select({
        id: visitorPolicyVersions.id,
        policyDocumentId: visitorPolicyVersions.policyDocumentId,
        policyCode: visitorPolicyDocuments.policyCode,
        policyName: visitorPolicyDocuments.policyName,
        category: visitorPolicyDocuments.category,
        versionNumber: visitorPolicyVersions.versionNumber,
        contentArtifactId: visitorPolicyVersions.contentArtifactId,
        contentHash: visitorPolicyVersions.contentHash,
        effectiveFrom: visitorPolicyVersions.effectiveFrom,
        statusCode: visitorPolicyVersions.statusCode,
      })
      .from(visitorPolicyVersions)
      .innerJoin(visitorPolicyDocuments, eq(visitorPolicyVersions.policyDocumentId, visitorPolicyDocuments.id))
      .where(
        and(eq(visitorPolicyDocuments.organisationId, user.organisationId), isNull(visitorPolicyVersions.deletedAt)),
      )
      .orderBy(visitorPolicyDocuments.policyCode, desc(visitorPolicyVersions.versionNumber));
  }

  async getVersionContent(versionId: string, user: AuthenticatedUser) {
    const row = await this.db
      .select({
        id: visitorPolicyVersions.id,
        policyCode: visitorPolicyDocuments.policyCode,
        policyName: visitorPolicyDocuments.policyName,
        versionNumber: visitorPolicyVersions.versionNumber,
        contentArtifactId: visitorPolicyVersions.contentArtifactId,
      })
      .from(visitorPolicyVersions)
      .innerJoin(visitorPolicyDocuments, eq(visitorPolicyVersions.policyDocumentId, visitorPolicyDocuments.id))
      .where(
        and(
          eq(visitorPolicyVersions.id, versionId),
          eq(visitorPolicyDocuments.organisationId, user.organisationId),
          isNull(visitorPolicyVersions.deletedAt),
        ),
      )
      .limit(1);

    const found = row[0];
    if (!found) throw new NotFoundException("Policy version not found");

    const inlineText = resolveInlineArtifactText(found.contentArtifactId);
    const contentUrl = resolvePublicAssetUrl(found.contentArtifactId);

    return {
      ...found,
      contentText:
        inlineText ??
        `This site processes visitor personal data for access control and host notification under the ${found.policyName ?? found.policyCode} policy (version ${found.versionNumber}). Contact reception for questions about retention or your rights.`,
      contentUrl,
    };
  }

  private async requireForm(formDefinitionId: string, user: AuthenticatedUser) {
    const form = await this.db.query.checkInFormDefinitions.findFirst({
      where: and(
        eq(checkInFormDefinitions.id, formDefinitionId),
        eq(checkInFormDefinitions.organisationId, user.organisationId),
        isNull(checkInFormDefinitions.deletedAt),
      ),
    });
    if (!form) throw new NotFoundException("Form definition not found");
    return form;
  }

  private async requireFormVersion(versionId: string, user: AuthenticatedUser) {
    const version = await this.db.query.checkInFormVersions.findFirst({
      where: and(eq(checkInFormVersions.id, versionId), isNull(checkInFormVersions.deletedAt)),
    });
    if (!version) throw new NotFoundException("Form version not found");
    await this.requireForm(version.formDefinitionId, user);
    return version;
  }

  private async requireDraftFormVersion(versionId: string, user: AuthenticatedUser) {
    const version = await this.requireFormVersion(versionId, user);
    const draftStatus = await this.typeDefs.id("form_version_status", "draft");
    if (version.statusCode !== draftStatus) {
      throw new BadRequestException("Only draft form versions can be edited");
    }
    return version;
  }

  private async requirePolicyDocument(documentId: string, user: AuthenticatedUser) {
    const doc = await this.db.query.visitorPolicyDocuments.findFirst({
      where: and(
        eq(visitorPolicyDocuments.id, documentId),
        eq(visitorPolicyDocuments.organisationId, user.organisationId),
        isNull(visitorPolicyDocuments.deletedAt),
      ),
    });
    if (!doc) throw new NotFoundException("Policy document not found");
    return doc;
  }

  private async requirePolicyVersion(versionId: string, user: AuthenticatedUser) {
    const version = await this.db.query.visitorPolicyVersions.findFirst({
      where: and(eq(visitorPolicyVersions.id, versionId), isNull(visitorPolicyVersions.deletedAt)),
    });
    if (!version) throw new NotFoundException("Policy version not found");
    await this.requirePolicyDocument(version.policyDocumentId, user);
    return version;
  }
}
