import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { LegalModule } from "../legal/legal.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { OnboardingStateModule } from "../onboarding-state/onboarding-state.module";
import { OrganisationStandardsModule } from "../organisation-standards/organisation-standards.module";
import { RbacModule } from "../rbac/rbac.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { BuffrIdService } from "./buffr-id.service";
import { OnboardingEvidenceService } from "./onboarding-evidence.service";
import { OnboardingPresenceService } from "./onboarding-presence.service";
import { OnboardingProgressController } from "./onboarding-progress.controller";
import { OnboardingProgressService } from "./onboarding-progress.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "8h" },
    }),
    LegalModule,
    NotificationsModule,
    OnboardingStateModule,
    OrganisationStandardsModule,
    RbacModule,
  ],
  controllers: [AuthController, OnboardingProgressController],
  providers: [
    AuthService,
    BuffrIdService,
    JwtStrategy,
    OnboardingEvidenceService,
    OnboardingPresenceService,
    OnboardingProgressService,
  ],
  exports: [AuthService, BuffrIdService, JwtModule, OnboardingEvidenceService],
})
export class AuthModule {}
