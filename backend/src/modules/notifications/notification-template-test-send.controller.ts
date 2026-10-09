import { Controller, Param, Post } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { PlatformNotificationTemplateService } from "../platform-configuration/platform-notification-template.service";
import { TemplatedEmailService } from "./templated-email.service";

/**
 * Sends one notification template to the ops inbox with sample values so staff can review the wording and layout.
 * Lives with the notifications module, which owns the send path, so platform configuration does not depend on it.
 */
@Controller("platform/configuration")
export class NotificationTemplateTestSendController {
  constructor(
    private readonly templates: PlatformNotificationTemplateService,
    private readonly templatedEmail: TemplatedEmailService,
  ) {}

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
      sectorCode: "hospitality_tourism",
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
}
