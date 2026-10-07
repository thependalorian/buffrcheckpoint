import { Body, Controller, Get, Param, Patch, Post, Query, Res, StreamableFile } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { PlatformScoped } from "../../common/decorators/platform-scoped.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { EXPORT_CONTENT_TYPE, parseExportFormat, serialiseExport } from "../../common/export/tabular";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { bankPaymentInstructions } from "../documents/document-renderer.service";
import {
  BillingService,
  type CreateInvoiceInput,
  type CreateSubscriptionInput,
  type SubmitPopInput,
} from "./billing.service";

@Controller()
export class BillingController {
  constructor(private readonly service: BillingService) {}

  /** Marketing pricing page — 3 plans + one add-on list with per-add-on costs. */
  @Public()
  @Get("public/pricing")
  publicPricing() {
    return this.service.listPublicPricing();
  }

  @Get("platform/billing/catalog")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  catalog(@Query("kind") kind?: "plan" | "addon") {
    return this.service.listCatalog(kind ? { kind } : undefined);
  }

  @Get("platform/billing/rollup")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  rollup() {
    return this.service.portfolioRollup();
  }

  // @Res() manual response — see kyb.controller.ts's getForOrganisation for
  // why: NestJS sends a completely empty body for a `null` return
  // (identical to `undefined`), which breaks every caller's `.json()` for
  // any organisation with no subscription yet.
  @Get("platform/billing/subscriptions/organisation")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  @PlatformScoped()
  async getSubscription(@Query("organisationId") organisationId: string, @Res() res: Response) {
    const result = await this.service.getSubscriptionForOrganisation(organisationId);
    res.status(200).json(result);
  }

  @Post("platform/billing/subscriptions")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  @AuditLog({ action: "organisation_subscription.create", resourceType: "organisation_subscription" })
  createSubscription(@Body() body: CreateSubscriptionInput, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createSubscription(body, user);
  }

  @Post("platform/billing/subscriptions/:subscriptionId/addons")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  @AuditLog({ action: "organisation_subscription_addon.attach", resourceType: "organisation_subscription_addon" })
  attachAddon(
    @Param("subscriptionId") subscriptionId: string,
    @Body() body: { addonCode: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.attachAddon(subscriptionId, body.addonCode, user);
  }

  @Patch("platform/billing/subscriptions/:subscriptionId/addons/:addonCode/detach")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  @AuditLog({ action: "organisation_subscription_addon.detach", resourceType: "organisation_subscription_addon" })
  detachAddon(
    @Param("subscriptionId") subscriptionId: string,
    @Param("addonCode") addonCode: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.detachAddon(subscriptionId, addonCode, user);
  }

  @Patch("platform/billing/subscriptions/:subscriptionId/sites")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  @AuditLog({ action: "organisation_subscription.site_quantity", resourceType: "organisation_subscription" })
  setSiteQuantity(
    @Param("subscriptionId") subscriptionId: string,
    @Body() body: { siteQuantity: number; note?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.setSiteQuantity(subscriptionId, Number(body.siteQuantity), user, body.note);
  }

  @Patch("platform/billing/subscriptions/:subscriptionId/status")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  @AuditLog({ action: "organisation_subscription.transition", resourceType: "organisation_subscription" })
  transitionSubscription(
    @Param("subscriptionId") subscriptionId: string,
    @Body() body: { statusCode: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.transitionSubscriptionStatus(subscriptionId, body.statusCode, user);
  }

  @Post("platform/billing/invoices")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  @AuditLog({ action: "invoice.create", resourceType: "invoice" })
  createInvoice(@Body() dto: CreateInvoiceInput) {
    return this.service.createInvoice(dto);
  }

  // Customer-facing — an org's own owner_operator/system_administrator can
  // list their own invoices and upload a POP. Scoped by organisationId
  // query param, matched against the caller's own org by TenantScopeGuard.
  @Get("platform/billing/invoices")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  listInvoices(@Query("organisationId") organisationId: string) {
    return this.service.listInvoicesForOrganisation(organisationId);
  }

  // Platform-side equivalent — the Ops Console's organisation detail view
  // reading a specific org's invoices without being scoped to that org
  // itself (TenantScopeGuard only applies to the customer-facing route
  // above; platform_support's own organisationId is their unrelated home
  // org).
  @Get("platform/billing/invoices/organisation")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  @PlatformScoped()
  listInvoicesForOrganisation(@Query("organisationId") organisationId: string) {
    return this.service.listInvoicesForOrganisation(organisationId);
  }

  @Get("platform/billing/invoices/:invoiceId")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  getInvoicePlatform(@Param("invoiceId") invoiceId: string) {
    return this.service.getInvoiceById(invoiceId);
  }

  @Post("platform/billing/invoices/:invoiceId/remind")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  @AuditLog({ action: "invoice.remind", resourceType: "invoice" })
  remindInvoice(@Param("invoiceId") invoiceId: string) {
    return this.service.sendInvoiceReminder(invoiceId);
  }

  @Post("platform/billing/invoices/:invoiceId/credit-notes")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  @AuditLog({ action: "invoice.credit_note", resourceType: "invoice" })
  issueCreditNote(
    @Param("invoiceId") invoiceId: string,
    @Body() dto: { amount: string; reason: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.issueCreditNote(invoiceId, dto, user);
  }

  @Get("platform/billing/invoices/:invoiceId/document")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  async downloadInvoicePlatform(
    @Param("invoiceId") invoiceId: string,
    @Query("format") format: "html" | "pdf" = "pdf",
  ) {
    const doc = await this.service.renderInvoiceDocument(invoiceId, undefined, format === "html" ? "html" : "pdf");
    return new StreamableFile(doc.content, {
      type: doc.contentType,
      disposition: `attachment; filename="${doc.filename.replace(/"/g, "")}"`,
    });
  }

  @Get("platform/billing/invoices/:invoiceId/receipt")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  async downloadReceiptPlatform(
    @Param("invoiceId") invoiceId: string,
    @Query("format") format: "html" | "pdf" = "pdf",
  ) {
    const doc = await this.service.renderReceiptDocument(invoiceId, undefined, format === "html" ? "html" : "pdf");
    return new StreamableFile(doc.content, {
      type: doc.contentType,
      disposition: `attachment; filename="${doc.filename.replace(/"/g, "")}"`,
    });
  }

  @Get("platform/billing/invoices/:invoiceId/customer")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  getInvoiceCustomer(@Param("invoiceId") invoiceId: string, @Query("organisationId") organisationId: string) {
    return this.service.getInvoiceById(invoiceId, organisationId);
  }

  @Get("platform/billing/invoices/:invoiceId/customer/document")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  async downloadInvoiceCustomer(
    @Param("invoiceId") invoiceId: string,
    @Query("organisationId") organisationId: string,
    @Query("format") format: "html" | "pdf" = "pdf",
  ) {
    const doc = await this.service.renderInvoiceDocument(invoiceId, organisationId, format === "html" ? "html" : "pdf");
    return new StreamableFile(doc.content, {
      type: doc.contentType,
      disposition: `attachment; filename="${doc.filename.replace(/"/g, "")}"`,
    });
  }

  // Bank transfer details for the customer's invoice page (no secrets: the
  // same details printed on every invoice).
  @Get("platform/billing/payment-instructions")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  paymentInstructions() {
    return bankPaymentInstructions();
  }

  @Get("platform/billing/payments/card/enabled")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  cardPaymentsEnabled() {
    return this.service.cardPaymentsEnabled();
  }

  // Customer starts a card payment for one of its own invoices. The amount
  // comes from the invoice server-side; the response is the signed form post
  // for Adumo's hosted page.
  @Post("platform/billing/invoices/:invoiceId/card-payment")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  @AuditLog({ action: "payment_transaction.card_start", resourceType: "invoice" })
  startCardPayment(@Param("invoiceId") invoiceId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.startCardPayment(invoiceId, user);
  }

  // Adumo result (browser return relayed by admin, or Adumo's own
  // notificationURL webhook). Public: the signed _RESPONSE_TOKEN is the
  // authentication and is verified before anything changes. The body is a
  // plain record on purpose so the global whitelist does not reject Adumo's
  // posted fields; only the token's verified claims are trusted.
  @Public()
  @Post("public/payments/adumo/result")
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  adumoResult(@Body() body: Record<string, unknown>) {
    return this.service.handleAdumoResult(body ?? {});
  }

  @Post("platform/billing/payments/pop")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  @AuditLog({ action: "payment_transaction.submit_pop", resourceType: "payment_transaction" })
  submitPop(@Body() dto: SubmitPopInput, @CurrentUser() user: AuthenticatedUser) {
    return this.service.submitProofOfPayment(dto, user);
  }

  @Get("platform/billing/payments/export")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  @PlatformScoped()
  @AuditLog({ action: "payment_register.export", resourceType: "payment_transaction" })
  async exportPaymentRegister(
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Query("format") format: string | undefined,
  ) {
    const exportFormat = parseExportFormat(format);
    const table = await this.service.paymentRegister({ from, to });
    return new StreamableFile(await serialiseExport(table, exportFormat, "Payment register"), {
      type: EXPORT_CONTENT_TYPE[exportFormat],
      disposition: `attachment; filename="payment-register.${exportFormat}"`,
    });
  }

  @Get("platform/billing/payments/pending-review")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  pendingReview() {
    return this.service.listPendingReview();
  }

  @Patch("platform/billing/payments/bulk-review")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  @AuditLog({ action: "payment_transaction.review_bulk", resourceType: "payment_transaction" })
  reviewPaymentBulk(
    @Body() body: { paymentTransactionIds: string[]; decision: "confirmed" | "rejected"; note?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.reviewPaymentBulk(body.paymentTransactionIds ?? [], body.decision, user, body.note);
  }

  @Get("platform/billing/payments/:paymentTransactionId/document")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  async getPopDocument(@Param("paymentTransactionId") paymentTransactionId: string) {
    const { name, content } = await this.service.getPopDocument(paymentTransactionId);
    return new StreamableFile(content, {
      disposition: `attachment; filename="${name.replace(/"/g, "")}"`,
    });
  }

  @Patch("platform/billing/payments/:paymentTransactionId/review")
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
