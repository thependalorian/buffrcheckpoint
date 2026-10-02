import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsString, MaxLength } from "class-validator";

import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { PlatformScoped } from "../../common/decorators/platform-scoped.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { addDays, localDateIn } from "../analytics-etl/local-date";
import { VisitSurveyService } from "./visit-survey.service";

class SubmitSurveyBody {
  @IsString()
  @MaxLength(400)
  token!: string;

  @IsString()
  @MaxLength(40)
  ratingCode!: string;
}

/** Last N days ending yesterday, in Windhoek local dates (facts are built through the previous run). */
function lastDays(days: number) {
  const today = localDateIn(new Date(), process.env.ANALYTICS_TIMEZONE ?? "Africa/Windhoek");
  return { from: addDays(today, -days), to: today };
}

@Controller()
export class VisitSurveyController {
  constructor(private readonly survey: VisitSurveyService) {}

  @Public()
  @Get("public/visit-survey/options")
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  options() {
    return this.survey.ratingOptions();
  }

  @Public()
  @Post("public/visit-survey")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  submit(@Body() body: SubmitSurveyBody) {
    return this.survey.submit(body);
  }

  // Customer view: own organisation, narrowed to the user's site when the
  // user is site-scoped.
  @Get("analytics/satisfaction")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  organisationSummary(@Query("siteId") siteId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    const { from, to } = lastDays(28);
    return this.survey.summary({ organisationId: user.organisationId, from, to, siteId: user.siteId ?? siteId });
  }

  // Ops: platform-wide aggregate only, no organisation breakdown.
  @Get("platform/dashboard/satisfaction")
  @PlatformScoped()
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  platformSummary() {
    const { from, to } = lastDays(28);
    return this.survey.summary({ organisationId: null, from, to });
  }
}
