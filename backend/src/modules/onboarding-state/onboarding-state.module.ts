import { Module } from "@nestjs/common";

import { OnboardingStateService } from "./onboarding-state.service";

// Shared by AuthModule (user activation) and OnboardingModule (ops overrides)
// so neither has to import the other for status changes.
@Module({
  providers: [OnboardingStateService],
  exports: [OnboardingStateService],
})
export class OnboardingStateModule {}
