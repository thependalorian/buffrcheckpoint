import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Logger, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsEmail, IsIn, IsOptional, IsString, Length, MinLength } from "class-validator";

import { AuthenticatedOnly } from "../../common/decorators/authenticated-only.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { NormaliseEmail } from "../../common/decorators/normalise-email.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { AuthService } from "./auth.service";
import { BuffrIdService } from "./buffr-id.service";
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
  @NormaliseEmail()
  @IsEmail()
  email!: string;
}

class BuffrIdExchangeDto {
  @IsString()
  @MinLength(20)
  idToken!: string;

  @IsIn(["admin", "ops"])
  surface!: "admin" | "ops";

  @IsOptional()
  @IsString()
  nonce?: string;
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

const REQUEST_ID_HEADER = "x-bc-request-id";

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly buffrId: BuffrIdService,
  ) {}

  /** Whether Buffr ID sign-in is configured, and how long password sign-in stays open. The admin and ops apps read this. */
  @Public()
  @Get("buffr-id/config")
  buffrIdConfig() {
    return this.buffrId.publicConfig();
  }

  /** Trade a Buffr ID ID token for an ordinary Checkpoint session. */
  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post("buffr-id/exchange")
  buffrIdExchange(@Body() dto: BuffrIdExchangeDto) {
    return this.authService.signInWithBuffrId(dto.idToken, dto.surface, dto.nonce);
  }

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
  @AuthenticatedOnly()
  @RequireVerifiedEmail()
  startMfa(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.startMfaEnrollment(user);
  }

  @Post("mfa/enroll/confirm")
  @AuthenticatedOnly()
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

  /** Platform Ops Console sign-in (buffrcheckpoint.md §5.3). platform_support only; MFA mandatory. */
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
  me(@CurrentUser() user: AuthenticatedUser, @Headers(REQUEST_ID_HEADER) requestId?: string) {
    return this.timed("me", requestId, () => this.authService.me(user));
  }

  /** Admin proxy gate: one cached SQL statement instead of the full /auth/me payload. */
  @Get("session-gate")
  sessionGate(@CurrentUser() user: AuthenticatedUser, @Headers(REQUEST_ID_HEADER) requestId?: string) {
    return this.timed("gate", requestId, () => this.authService.sessionGate(user));
  }

  // Session-resolution latency per call, grouped by the admin navigation's
  // request id so p50/p95 and calls-per-navigation come straight from logs.
  private async timed<T>(kind: string, requestId: string | undefined, run: () => Promise<T>): Promise<T> {
    const started = performance.now();
    try {
      return await run();
    } finally {
      const ms = Math.round(performance.now() - started);
      this.logger.log(`session_resolution kind=${kind} ms=${ms} request_id=${requestId?.slice(0, 64) ?? "none"}`);
    }
  }
}
