import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { HostsModule } from "../hosts/hosts.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { OnboardingStateModule } from "../onboarding-state/onboarding-state.module";
import { VisitorPolicyModule } from "../visitor-policy/visitor-policy.module";
import { VisitsModule } from "../visits/visits.module";
import { OnboardingController } from "./onboarding.controller";
import { OnboardingService } from "./onboarding.service";
import { OnboardingTestVisitService } from "./onboarding-test-visit.service";
import { PlatformOnboardingController } from "./platform-onboarding.controller";
import { StaffTrainingService } from "./staff-training.service";

@Module({
  imports: [AuthModule, HostsModule, NotificationsModule, OnboardingStateModule, VisitsModule, VisitorPolicyModule],
  controllers: [OnboardingController, PlatformOnboardingController],
  providers: [OnboardingService, OnboardingTestVisitService, StaffTrainingService],
})
export class OnboardingModule {}
