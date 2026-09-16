import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { AcknowledgePolicyDto } from "./dto/acknowledge-policy.dto";
import { PreCheckinAcknowledgePolicyDto } from "./dto/pre-checkin-acknowledge.dto";
import { CreateCheckInFormDefinitionDto } from "./dto/check-in-form.dto";
import { VisitorPolicyService } from "./visitor-policy.service";

class CreatePolicyDocumentDto {
  @IsString()
  @MinLength(1)
  policyCode!: string;

  @IsOptional()
  @IsString()
  policyName?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

class CreatePolicyVersionDto {
  @IsString()
  @MinLength(1)
  contentText!: string;

  @IsString()
  languageCode!: string;
}

class CreateFormFieldDto {
  @IsString()
  @MinLength(1)
  fieldCode!: string;

  @IsOptional()
  @IsString()
  fieldLabel?: string;

  @IsString()
  dataClassificationCode!: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsObject()
  visibilityRule?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  validationSchema?: Record<string, unknown>;
}

class UpdateFormFieldDto {
  @IsOptional()
  @IsString()
  fieldLabel?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsObject()
  visibilityRule?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  validationSchema?: Record<string, unknown>;
}

class CreateVisitorCategoryDto {
  @IsString()
  visitorCategoryCode!: string;

  @IsUUID()
  formDefinitionId!: string;

  @IsString()
  defaultAssuranceLevelCode!: string;

  @IsOptional()
  @IsString()
  defaultRiskTierCode?: string;
}

@Controller("visitor-policy/forms")
export class VisitorPolicyController {
  constructor(private readonly visitorPolicyService: VisitorPolicyService) {}

  @Get("effective")
  @RequirePermission(PERMISSIONS.VISIT_WRITE)
  effectiveForm(
    @Query("siteId") siteId: string | undefined,
    @Query("visitorTypeCode") visitorTypeCode: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.visitorPolicyService.resolveEffectiveFormForUser(
      siteId,
      visitorTypeCode?.trim() || "general",
      user,
    );
  }

  @Post()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "check_in_form_definition.create", resourceType: "check_in_form_definition" })
  create(@Body() dto: CreateCheckInFormDefinitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.visitorPolicyService.create(dto, user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.visitorPolicyService.list(user);
  }

  @Post(":id/versions")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "check_in_form_version.create", resourceType: "check_in_form_version" })
  createVersion(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.visitorPolicyService.createFormVersion(id, user);
  }

  @Get(":id/versions")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  listVersions(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.visitorPolicyService.listFormVersions(id, user);
  }

  @Post("versions/:versionId/fields")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "check_in_form_field.create", resourceType: "check_in_form_field" })
  addField(
    @Param("versionId") versionId: string,
    @Body() dto: CreateFormFieldDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.visitorPolicyService.addFormField(versionId, dto, user);
  }

  @Patch("fields/:fieldId")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "check_in_form_field.update", resourceType: "check_in_form_field" })
  updateField(
    @Param("fieldId") fieldId: string,
    @Body() dto: UpdateFormFieldDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.visitorPolicyService.updateFormField(fieldId, dto, user);
  }

  @Post("versions/:versionId/publish")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "check_in_form_version.publish", resourceType: "check_in_form_version" })
  publishVersion(@Param("versionId") versionId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.visitorPolicyService.publishFormVersion(versionId, user);
  }

  @Get("versions/:versionId")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  getVersion(@Param("versionId") versionId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.visitorPolicyService.getFormVersionWithFields(versionId, user);
  }
}

@Controller("visitor-policy")
export class VisitorPolicyAcknowledgementsController {
  constructor(private readonly visitorPolicyService: VisitorPolicyService) {}

  @Post("documents")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "visitor_policy_document.create", resourceType: "visitor_policy_document" })
  createDocument(@Body() dto: CreatePolicyDocumentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.visitorPolicyService.createPolicyDocument(dto, user);
  }

  @Get("documents")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  listDocuments(@CurrentUser() user: AuthenticatedUser) {
    return this.visitorPolicyService.listPolicyDocuments(user);
  }

  @Post("documents/:id/versions")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "visitor_policy_version.create", resourceType: "visitor_policy_version" })
  createDocumentVersion(
    @Param("id") id: string,
    @Body() dto: CreatePolicyVersionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.visitorPolicyService.createPolicyVersion(id, dto, user);
  }

  @Post("versions/:id/publish")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "visitor_policy_version.publish", resourceType: "visitor_policy_version" })
  publishDocumentVersion(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.visitorPolicyService.publishPolicyVersion(id, user);
  }

  @Post("versions/:id/archive")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "visitor_policy_version.archive", resourceType: "visitor_policy_version" })
  archiveDocumentVersion(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.visitorPolicyService.archivePolicyVersion(id, user);
  }

  @Post("visitor-categories")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "visitor_category.create", resourceType: "visitor_category" })
  createCategory(@Body() dto: CreateVisitorCategoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.visitorPolicyService.createVisitorCategory(dto, user);
  }

  @Get("visitor-categories")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  listCategories(@CurrentUser() user: AuthenticatedUser) {
    return this.visitorPolicyService.listVisitorCategories(user);
  }

  @Post("acknowledgements")
  @RequirePermission(PERMISSIONS.VISIT_WRITE)
  @AuditLog({ action: "visitor_policy_acknowledgement.record", resourceType: "visitor_policy_acknowledgement" })
  acknowledge(@Body() dto: AcknowledgePolicyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.visitorPolicyService.acknowledge(dto, user);
  }

  @Post("acknowledgements/pre-checkin")
  @RequirePermission(PERMISSIONS.VISIT_WRITE)
  @AuditLog({
    action: "visitor_policy_pre_checkin_acknowledgement.record",
    resourceType: "kiosk_privacy_pre_checkin_acknowledgement",
  })
  acknowledgePreCheckin(@Body() dto: PreCheckinAcknowledgePolicyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.visitorPolicyService.acknowledgePreCheckin(dto, user);
  }

  @Get("versions")
  listVersions(@CurrentUser() user: AuthenticatedUser) {
    return this.visitorPolicyService.listVersions(user);
  }

  @Get("versions/:versionId/content")
  getVersionContent(@Param("versionId") versionId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.visitorPolicyService.getVersionContent(versionId, user);
  }
}
