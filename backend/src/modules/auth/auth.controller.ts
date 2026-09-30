import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsEmail, IsOptional, IsString, Length, MinLength } from "class-validator";

import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { ConfirmPasswordResetDto, RequestPasswordResetDto } from "./dto/password-reset.dto";
import { RegisterDto } from "./dto/register.dto";

const AUTH_THROTTLE = { default: { ttl: 300_000, limit: 10 } };
// Ops front door: its own, tighter bucket (5 attempts per 15 minutes per IP), separate from customers.
const PLATFORM_AUTH_THROTTLE = { default: { ttl: 900_000, limit: 5 } };

class VerifyEmailDto {
  @IsString()
  @MinLength(16)
  token!: string;
}

class ResendVerificationDto {
  @IsEmail()
  email!: string;
}

class ConfirmMfaDto {
  // Allow spaced pastes ("123 456"); AuthService.normalizeTotpCode strips them.
  @IsString()
  @Length(6, 12)
  code!: string;
}

class VerifyMfaChallengeDto {
  @IsString()
  @MinLength(16)
  challengeToken!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  recoveryCode?: string;
}

class CompleteOnboardingStepDto {
  @IsString()
  stepCode!: string;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @RequirePermission(PERMISSIONS.USER_MANAGE)
  @RequireVerifiedEmail()
  register(@Body() dto: RegisterDto, @CurrentUser() user: AuthenticatedUser) {
    return this.authService.register({ ...dto, organisationId: user.organisationId });
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post("email-verification/verify")
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post("email-verification/resend")
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendEmailVerification(dto.email);
  }

  @Post("mfa/enroll/start")
  @RequireVerifiedEmail()
  startMfa(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.startMfaEnrollment(user);
  }

  @Post("mfa/enroll/confirm")
  @RequireVerifiedEmail()
  confirmMfa(@Body() dto: ConfirmMfaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.authService.confirmMfaEnrollment(user, dto.code);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post("mfa/challenge/verify")
  verifyMfaChallenge(@Body() dto: VerifyMfaChallengeDto) {
    return this.authService.verifyMfaChallenge(dto.challengeToken, dto.code ?? "", dto.recoveryCode, "admin");
  }

  /** Platform Ops Console sign-in (buffrcheckpoint.md §9.2a). platform_support only; MFA mandatory. */
  @Public()
  @Throttle(PLATFORM_AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post("platform/login")
  platformLogin(@Body() dto: LoginDto) {
    return this.authService.platformLogin(dto.email, dto.password);
  }

  @Public()
  @Throttle(PLATFORM_AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post("platform/mfa/challenge/verify")
  verifyPlatformMfaChallenge(@Body() dto: VerifyMfaChallengeDto) {
    return this.authService.verifyMfaChallenge(dto.challengeToken, dto.code ?? "", dto.recoveryCode, "ops");
  }

  @Get("onboarding")
  @RequireVerifiedEmail()
  onboardingStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getOnboardingStatus(user);
  }

  @Get("onboarding/evidence")
  @RequireVerifiedEmail()
  onboardingEvidence(@CurrentUser() user: AuthenticatedUser, @Query("step") step: string) {
    return this.authService.getOnboardingEvidence(user, step as never);
  }

  @Post("onboarding/complete-step")
  @RequireVerifiedEmail()
  completeOnboardingStep(@Body() dto: CompleteOnboardingStepDto, @CurrentUser() user: AuthenticatedUser) {
    return this.authService.completeOnboardingStep(user, dto.stepCode as never);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post("password-reset/request")
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post("password-reset/confirm")
  confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    return this.authService.confirmPasswordReset(dto);
  }

  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }
}
