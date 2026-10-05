import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

import { ONBOARDING_STATUSES } from "../../onboarding-state/onboarding-transitions";

export class ReopenOnboardingDto {
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}

export class SetOnboardingStatusDto {
  @IsIn(ONBOARDING_STATUSES)
  status!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}
