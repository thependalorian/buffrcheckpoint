import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { SentryGlobalFilter, SentryModule } from "@sentry/nestjs/setup";

import { AppController } from "./app.controller";
import { AccessControlModule } from "./common/access-control/access-control.module";
import { DataProtectionModule } from "./common/data-protection/data-protection.module";
import { RbacGuard } from "./common/guards/rbac.guard";
import { SessionAudienceGuard } from "./common/guards/session-audience.guard";
import { TenantScopeGuard } from "./common/guards/tenant-scope.guard";
import { AuditInterceptor } from "./common/interceptors/audit.interceptor";
import { DbModule } from "./db/db.module";
import { AccessPoliciesModule } from "./modules/access-policies/access-policies.module";
import { AccessReviewsModule } from "./modules/access-reviews/access-reviews.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AnalyticsEtlModule } from "./modules/analytics-etl/analytics-etl.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { JwtAuthGuard } from "./modules/auth/guards/jwt-auth.guard";
import { BillingModule } from "./modules/billing/billing.module";
import { CapabilityStatusModule } from "./modules/capability-status/capability-status.module";
import { ComplianceModule } from "./modules/compliance/compliance.module";
import { ContactModule } from "./modules/contact/contact.module";
import { CredentialsModule } from "./modules/credentials/credentials.module";
import { CrmModule } from "./modules/crm/crm.module";
import { DevicesModule } from "./modules/devices/devices.module";
import { DsarModule } from "./modules/dsar/dsar.module";
import { EmergencyModule } from "./modules/emergency/emergency.module";
import { EvidenceModule } from "./modules/evidence/evidence.module";
import { HostNotificationEscalationModule } from "./modules/host-notification-escalation/host-notification-escalation.module";
import { HostsModule } from "./modules/hosts/hosts.module";
import { IdentityVerificationModule } from "./modules/identity-verification/identity-verification.module";
import { CimsoModule } from "./modules/integrations/cimso/cimso.module";
import { TelecomsModule } from "./modules/integrations/telecoms/telecoms.module";
import { InvitationsModule } from "./modules/invitations/invitations.module";
import { KioskExperienceModule } from "./modules/kiosk-experience/kiosk-experience.module";
import { KybModule } from "./modules/kyb/kyb.module";
import { LegalHoldsModule } from "./modules/legal-holds/legal-holds.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OnboardingModule } from "./modules/onboarding/onboarding.module";
import { OrganisationDirectoryModule } from "./modules/organisation-directory/organisation-directory.module";
import { OrganisationHealthModule } from "./modules/organisation-health/organisation-health.module";
import { OrganisationsModule } from "./modules/organisations/organisations.module";
import { PlatformConfigurationModule } from "./modules/platform-configuration/platform-configuration.module";
import { PlatformDashboardModule } from "./modules/platform-dashboard/platform-dashboard.module";
import { PlatformIncidentsModule } from "./modules/platform-incidents/platform-incidents.module";
import { PlatformSearchModule } from "./modules/platform-search/platform-search.module";
import { PlatformStaffModule } from "./modules/platform-staff/platform-staff.module";
import { RbacModule } from "./modules/rbac/rbac.module";
import { RegionsModule } from "./modules/regions/regions.module";
import { RetentionDispositionModule } from "./modules/retention-disposition/retention-disposition.module";
import { RetentionPolicyModule } from "./modules/retention-policy/retention-policy.module";
import { ScheduleModule } from "./modules/schedule/schedule.module";
import { SecurityZonesModule } from "./modules/security-zones/security-zones.module";
import { SiteBrandingModule } from "./modules/site-branding/site-branding.module";
import { SiteQrReferencesModule } from "./modules/site-qr-references/site-qr-references.module";
import { SitesModule } from "./modules/sites/sites.module";
import { SupportSessionsModule } from "./modules/support-sessions/support-sessions.module";
import { SupportTicketsModule } from "./modules/support-tickets/support-tickets.module";
import { TypeDefinitionsModule } from "./modules/type-definitions/type-definitions.module";
import { VisitorPolicyModule } from "./modules/visitor-policy/visitor-policy.module";
import { VisitorWaitQueueModule } from "./modules/visitor-wait-queue/visitor-wait-queue.module";
import { VisitorsModule } from "./modules/visitors/visitors.module";
import { VisitsModule } from "./modules/visits/visits.module";

@Module({
  imports: [
    SentryModule.forRoot(),
    // Section 5's "rate-limit login, registration, password-reset...
    // without creating account-enumeration leaks." Global default is
    // deliberately generous (ordinary API usage shouldn't ever hit it);
    // the auth/onboarding endpoints layer a much tighter @Throttle()
    // override on top (see auth.controller.ts, onboarding.controller.ts).
    // Uniform 429 + generic message on every throttled route either way —
    // never a different error shape for "this email doesn't exist" vs
    // "this email exists," which is what would leak enumeration.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    // In-process domain events (e.g. visit.checked_in) so modules react to
    // each other without directly importing/calling one another's services.
    EventEmitterModule.forRoot(),
    DbModule,
    AccessControlModule,
    DataProtectionModule,
    AuthModule,
    OnboardingModule,
    CapabilityStatusModule,
    OrganisationsModule,
    OrganisationDirectoryModule,
    SitesModule,
    HostsModule,
    VisitorWaitQueueModule,
    VisitorsModule,
    VisitsModule,
    IdentityVerificationModule,
    CredentialsModule,
    NotificationsModule,
    EmergencyModule,
    DsarModule,
    LegalHoldsModule,
    RbacModule,
    EvidenceModule,
    AuditModule,
    DevicesModule,
    RetentionPolicyModule,
    RetentionDispositionModule,
    TypeDefinitionsModule,
    InvitationsModule,
    ScheduleModule,
    ComplianceModule,
    AccessPoliciesModule,
    VisitorPolicyModule,
    AnalyticsModule,
    AnalyticsEtlModule,
    SiteBrandingModule,
    KioskExperienceModule,
    SiteQrReferencesModule,
    HostNotificationEscalationModule,
    RegionsModule,
    SecurityZonesModule,
    ContactModule,
    TelecomsModule,
    CimsoModule,
    SupportSessionsModule,
    PlatformDashboardModule,
    PlatformIncidentsModule,
    SupportTicketsModule,
    BillingModule,
    CrmModule,
    KybModule,
    OrganisationHealthModule,
    PlatformConfigurationModule,
    PlatformStaffModule,
    PlatformSearchModule,
    AccessReviewsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    // Global guard order matters: JwtAuthGuard populates request.user first,
    // TenantScopeGuard checks any org/site path params against that user,
    // then RbacGuard checks the route's @RequirePermission() against the
    // user's role. Section 9.2 rule 1: enforced here, not only in the UI.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: SessionAudienceGuard },
    { provide: APP_GUARD, useClass: TenantScopeGuard },
    { provide: APP_GUARD, useClass: RbacGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
