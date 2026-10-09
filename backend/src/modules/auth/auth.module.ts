import { Module } from "@nestjs/common";

import { LegalModule } from "../legal/legal.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { OnboardingStateModule } from "../onboarding-state/onboarding-state.module";
import { OrganisationStandardsModule } from "../organisation-standards/organisation-standards.module";
import { RbacModule } from "../rbac/rbac.module";
import { AccessTokenAuthenticator } from "./access-token-authenticator.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { BuffrIdService } from "./buffr-id.service";
import { JwksController } from "./jwks.controller";
import { OnboardingEvidenceService } from "./onboarding-evidence.service";
import { OnboardingPresenceService } from "./onboarding-presence.service";
import { OnboardingProgressController } from "./onboarding-progress.controller";
import { OnboardingProgressService } from "./onboarding-progress.service";
import { RefreshTokenService } from "./refresh-token.service";
import { DrizzleSigningKeyStore } from "./signing-key.store";
import { TokenIssuerService } from "./token-issuer.service";

@Module({
  imports: [LegalModule, NotificationsModule, OnboardingStateModule, OrganisationStandardsModule, RbacModule],
  controllers: [AuthController, JwksController, OnboardingProgressController],
  providers: [
    AuthService,
    BuffrIdService,
    AccessTokenAuthenticator,
    DrizzleSigningKeyStore,
    RefreshTokenService,
    TokenIssuerService,
    OnboardingEvidenceService,
    OnboardingPresenceService,
    OnboardingProgressService,
  ],
  exports: [
    AuthService,
    BuffrIdService,
    AccessTokenAuthenticator,
    RefreshTokenService,
    TokenIssuerService,
    OnboardingEvidenceService,
  ],
})
export class AuthModule {}
