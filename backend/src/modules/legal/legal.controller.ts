import { Body, Controller, Get, Post } from "@nestjs/common";
import { ArrayNotEmpty, IsArray, IsString } from "class-validator";

import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { LegalService } from "./legal.service";

class AcceptAgreementsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  documents!: string[];
}

@Controller("legal")
export class LegalController {
  constructor(private readonly legal: LegalService) {}

  /** Which agreements are current, and which this organisation still has to accept. */
  @Get("status")
  @RequirePermission(PERMISSIONS.ONBOARDING_MANAGE)
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.legal.status(user.organisationId);
  }

  /** The organisation's owner accepts the current version of the named agreements. Written to the audit chain. */
  @Post("accept")
  @RequirePermission(PERMISSIONS.ONBOARDING_MANAGE)
  @RequireVerifiedEmail()
  accept(@Body() dto: AcceptAgreementsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.legal.accept(user, dto.documents);
  }
}
