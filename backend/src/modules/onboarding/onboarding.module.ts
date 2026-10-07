import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { HostsModule } from "../hosts/hosts.module";
import { LegalModule } from "../legal/legal.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { OnboardingStateModule } from "../onboarding-state/onboarding-state.module";
import { OrganisationStandardsModule } from "../organisation-standards/organisation-standards.module";
import { RetentionPolicyModule } from "../retention-policy/retention-policy.module";
import { SiteQrReferencesModule } from "../site-qr-references/site-qr-references.module";
import { SitesModule } from "../sites/sites.module";
import { VisitorPolicyModule } from "../visitor-policy/visitor-policy.module";
import { VisitsModule } from "../visits/visits.module";
import { OnboardingController } from "./onboarding.controller";
import { OnboardingService } from "./onboarding.service";
import { OnboardingTestVisitService } from "./onboarding-test-visit.service";
import { OrganisationDefaultsService } from "./organisation-defaults.service";
import { PlatformOnboardingController } from "./platform-onboarding.controller";
import { StaffTrainingService } from "./staff-training.service";

@Module({
  imports: [
    AuthModule,
    HostsModule,
    LegalModule,
    NotificationsModule,
    OnboardingStateModule,
    OrganisationStandardsModule,
    RetentionPolicyModule,
    SiteQrReferencesModule,
    SitesModule,
    VisitorPolicyModule,
    VisitsModule,
  ],
  controllers: [OnboardingController, PlatformOnboardingController],
  providers: [OnboardingService, OnboardingTestVisitService, OrganisationDefaultsService, StaffTrainingService],
})
export class OnboardingModule {}
