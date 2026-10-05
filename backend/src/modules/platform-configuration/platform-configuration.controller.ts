import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { TemplatedEmailService } from "../notifications/templated-email.service";
import {
  HEALTH_SCORE_WEIGHTS_KEY,
  type HealthScoreWeights,
  PlatformConfigurationService,
} from "./platform-configuration.service";
import {
  PlatformNotificationTemplateService,
  type UpdateTemplateInput,
} from "./platform-notification-template.service";

@Controller("platform/configuration")
export class PlatformConfigurationController {
  constructor(
    private readonly configuration: PlatformConfigurationService,
    private readonly templates: PlatformNotificationTemplateService,
    private readonly templatedEmail: TemplatedEmailService,
  ) {}

  @Get("notification-templates")
  @RequirePermission(PERMISSIONS.PLATFORM_CONFIGURATION_MANAGE)
  listTemplates() {
    return this.templates.list();
  }

  @Get("notification-templates/:templateId/changes")
  @RequirePermission(PERMISSIONS.PLATFORM_CONFIGURATION_MANAGE)
  templateChanges(@Param("templateId") templateId: string) {
    return this.templates.changeLog(templateId);
  }

  @Patch("notification-templates/:templateId")
  @RequirePermission(PERMISSIONS.PLATFORM_CONFIGURATION_MANAGE)
  @AuditLog({ action: "platform_notification_template.update", resourceType: "platform_notification_template" })
  updateTemplate(
    @Param("templateId") templateId: string,
    @Body() body: UpdateTemplateInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.templates.update(templateId, body, user);
  }

  @Post("notification-templates/:templateId/test-send")
  @RequirePermission(PERMISSIONS.PLATFORM_CONFIGURATION_MANAGE)
  @AuditLog({ action: "platform_notification_template.test_send", resourceType: "platform_notification_template" })
  async testSend(@Param("templateId") templateId: string, @CurrentUser() user: AuthenticatedUser) {
    const rows = await this.templates.list();
    const row = rows.find((t) => t.id === templateId);
    if (!row) {
      return { ok: false, error: "Template not found" };
    }
    const opsInbox = TemplatedEmailService.resolveOpsInbox();
    if (!opsInbox) {
      return { ok: false, error: "CONTACT_OPS_EMAIL is not configured" };
    }
    const sampleVars: Record<string, string> = {
      verifyUrl: "https://admin.buffrcheckpoint.com/auth/verify-email?token=sample",
      resetUrl: "https://admin.buffrcheckpoint.com/auth/reset-password?token=sample",
      forgotPasswordUrl: "https://admin.buffrcheckpoint.com/auth/forgot-password",
      email: opsInbox,
      organisationName: "Sample Organisation",
      organisationId: user.organisationId,
      adminEmail: opsInbox,
      adminUrl: "https://admin.buffrcheckpoint.com",
      opsOrgUrl: "https://ops.buffrcheckpoint.com/organisations",
      sectorCode: "hospitality",
      name: "Sample Contact",
      company: "Sample Co",
      message: "This is a test enquiry body.",
      signupUrl: "https://admin.buffrcheckpoint.com/auth/register",
      invoiceNumber: "BC-TEST-001",
      amount: "1500.00",
      currencyCode: "NAD",
      dueAt: "2026-10-01",
      invoiceUrl: "https://admin.buffrcheckpoint.com/dashboard/billing",
      receiptUrl: "https://admin.buffrcheckpoint.com/dashboard/billing",
      billingUrl: "https://admin.buffrcheckpoint.com/dashboard/billing",
      submittedByEmail: opsInbox,
      opsBillingUrl: "https://ops.buffrcheckpoint.com/organisations",
      note: "Sample review note.",
      statusCode: "active",
      visitorName: "Jane Visitor",
      siteLabel: "Front Desk",
      detailBlock: "Visitor type: Guest\nPurpose: Meeting",
      actionCode: "notify_alternate",
      visitId: "00000000-0000-4000-8000-000000000099",
      lockoutMinutes: "15",
      lockedAtUtc: new Date().toISOString(),
      ticketReference: "SUP-TEST-1",
      visitDate: "2026-10-15",
      preregUrl: "https://www.buffrcheckpoint.com/prereg/sample",
      creditNoteNumber: "CN-TEST-1",
    };
    await this.templatedEmail.send({
      templateCode: row.templateCode,
      organisationId: user.organisationId,
      to: opsInbox,
      variables: sampleVars,
      fallback: {
        subject: row.subject ?? `Test: ${row.templateCode}`,
        body: row.body,
      },
      bodySuffix: "\n\n[TEST SEND from Ops Configuration]",
    });
    return { ok: true, to: opsInbox, templateCode: row.templateCode };
  }

  @Get("health-score-weights")
  @RequirePermission(PERMISSIONS.PLATFORM_CONFIGURATION_MANAGE)
  healthScoreWeights() {
    return this.configuration.getHealthScoreWeightsWithMeta();
  }

  @Patch("health-score-weights")
  @RequirePermission(PERMISSIONS.PLATFORM_CONFIGURATION_MANAGE)
  @AuditLog({ action: "platform_configuration_setting.update", resourceType: "platform_configuration_setting" })
  updateHealthScoreWeights(
    @Body() body: Partial<HealthScoreWeights> & { note?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { note, ...weights } = body;
    return this.configuration.updateHealthScoreWeights(weights, user, note);
  }

  @Get("changes")
  @RequirePermission(PERMISSIONS.PLATFORM_CONFIGURATION_MANAGE)
  changeLog(@Query("settingKey") settingKey?: string) {
    return this.configuration.changeLog(settingKey ?? HEALTH_SCORE_WEIGHTS_KEY);
  }
}
