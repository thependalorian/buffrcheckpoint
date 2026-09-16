import { Body, Controller, Get, Param, Patch, Post, Query, Res, StreamableFile } from "@nestjs/common";
import type { Response } from "express";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { PlatformScoped } from "../../common/decorators/platform-scoped.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { BillingService, type CreateInvoiceInput, type SubmitPopInput } from "./billing.service";

@Controller("platform/billing")
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Get("rollup")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  rollup() {
    return this.service.portfolioRollup();
  }

  // @Res() manual response — see kyb.controller.ts's getForOrganisation for
  // why: NestJS sends a completely empty body for a `null` return
  // (identical to `undefined`), which breaks every caller's `.json()` for
  // any organisation with no subscription yet.
  @Get("subscriptions/organisation")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  @PlatformScoped()
  async getSubscription(@Query("organisationId") organisationId: string, @Res() res: Response) {
    const result = await this.service.getSubscriptionForOrganisation(organisationId);
    res.status(200).json(result);
  }

  @Post("subscriptions")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  @AuditLog({ action: "organisation_subscription.create", resourceType: "organisation_subscription" })
  createSubscription(
    @Body() body: { organisationId: string; planCode: string; mrrAmount: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createSubscription(body.organisationId, body.planCode, body.mrrAmount, user);
  }

  @Patch("subscriptions/:subscriptionId/status")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  @AuditLog({ action: "organisation_subscription.transition", resourceType: "organisation_subscription" })
  transitionSubscription(
    @Param("subscriptionId") subscriptionId: string,
    @Body() body: { statusCode: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.transitionSubscriptionStatus(subscriptionId, body.statusCode, user);
  }

  @Post("invoices")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  @AuditLog({ action: "invoice.create", resourceType: "invoice" })
  createInvoice(@Body() dto: CreateInvoiceInput) {
    return this.service.createInvoice(dto);
  }

  // Customer-facing — an org's own owner_operator/system_administrator can
  // list their own invoices and upload a POP. Scoped by organisationId
  // query param, matched against the caller's own org by TenantScopeGuard.
  @Get("invoices")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  listInvoices(@Query("organisationId") organisationId: string) {
    return this.service.listInvoicesForOrganisation(organisationId);
  }

  // Platform-side equivalent — the Ops Console's organisation detail view
  // reading a specific org's invoices without being scoped to that org
  // itself (TenantScopeGuard only applies to the customer-facing route
  // above; platform_support's own organisationId is their unrelated home
  // org).
  @Get("invoices/organisation")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  @PlatformScoped()
  listInvoicesForOrganisation(@Query("organisationId") organisationId: string) {
    return this.service.listInvoicesForOrganisation(organisationId);
  }

  @Get("invoices/:invoiceId")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  getInvoicePlatform(@Param("invoiceId") invoiceId: string) {
    return this.service.getInvoiceById(invoiceId);
  }

  @Get("invoices/:invoiceId/customer")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  getInvoiceCustomer(
    @Param("invoiceId") invoiceId: string,
    @Query("organisationId") organisationId: string,
  ) {
    return this.service.getInvoiceById(invoiceId, organisationId);
  }

  @Post("payments/pop")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  @AuditLog({ action: "payment_transaction.submit_pop", resourceType: "payment_transaction" })
  submitPop(@Body() dto: SubmitPopInput, @CurrentUser() user: AuthenticatedUser) {
    return this.service.submitProofOfPayment(dto, user);
  }

  @Get("payments/pending-review")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  pendingReview() {
    return this.service.listPendingReview();
  }

  @Patch("payments/bulk-review")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  @AuditLog({ action: "payment_transaction.review_bulk", resourceType: "payment_transaction" })
  reviewPaymentBulk(
    @Body() body: { paymentTransactionIds: string[]; decision: "confirmed" | "rejected"; note?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.reviewPaymentBulk(body.paymentTransactionIds ?? [], body.decision, user, body.note);
  }

  @Get("payments/:paymentTransactionId/document")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  async getPopDocument(@Param("paymentTransactionId") paymentTransactionId: string) {
    const { name, content } = await this.service.getPopDocument(paymentTransactionId);
    return new StreamableFile(content, {
      disposition: `attachment; filename="${name.replace(/"/g, "")}"`,
    });
  }

  @Patch("payments/:paymentTransactionId/review")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  @AuditLog({ action: "payment_transaction.review", resourceType: "payment_transaction" })
  reviewPayment(
    @Param("paymentTransactionId") paymentTransactionId: string,
    @Body() body: { decision: "confirmed" | "rejected"; note?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.reviewPayment(paymentTransactionId, body.decision, user, body.note);
  }
}
