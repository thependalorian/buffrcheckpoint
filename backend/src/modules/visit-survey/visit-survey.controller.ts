import { BadRequestException, Body, Controller, Get, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { PlatformScoped } from "../../common/decorators/platform-scoped.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { addDays, localDateIn } from "../analytics-etl/local-date";
import { MAX_COMMENT_LENGTH, periodBounds, SurveyRuleError } from "./survey-rules";
import { VisitSurveyService } from "./visit-survey.service";

class SubmitSurveyBody {
  @IsString()
  @MaxLength(400)
  token!: string;

  /** Stars, 1 to 5. Either this or ratingCode. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  ratingCode?: string;

  /** Optional comment, at most 1000 characters. Stored encrypted. */
  @IsOptional()
  @IsString()
  @MaxLength(MAX_COMMENT_LENGTH)
  comment?: string;
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

  // Customer view with the 1 to 5 distribution and a breakdown by site. Own organisation only, narrowed to the user's site when the
  // user is site-scoped. No comments here: any read-only role can open this, and comments are personal data.
  @Get("analytics/satisfaction/detail")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  organisationDetail(
    @Query("siteId") siteId: string | undefined,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.detailFor(user, siteId, from, to, undefined, false);
  }

  // The same figures plus the recent comments, for people who configure the site (owners and site managers).
  @Get("analytics/satisfaction/comments")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  organisationComments(
    @Query("siteId") siteId: string | undefined,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Query("commentLimit") commentLimit: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.detailFor(user, siteId, from, to, commentLimit, true);
  }

  private detailFor(
    user: AuthenticatedUser,
    siteId: string | undefined,
    from: string | undefined,
    to: string | undefined,
    commentLimit: string | undefined,
    includeComments: boolean,
  ) {
    if (siteId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(siteId)) {
      throw new BadRequestException("siteId must be a UUID");
    }
    const timeZone = process.env.ANALYTICS_TIMEZONE ?? "Africa/Windhoek";
    let period: { from: string; to: string };
    try {
      period = periodBounds(from, to, localDateIn(new Date(), timeZone), addDays);
    } catch (error) {
      if (error instanceof SurveyRuleError) throw new BadRequestException(error.message);
      throw error;
    }
    return this.survey.detail({
      organisationId: user.organisationId,
      siteId: user.siteId ?? siteId,
      ...period,
      commentLimit: commentLimit ? Number(commentLimit) : undefined,
      includeComments,
    });
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
