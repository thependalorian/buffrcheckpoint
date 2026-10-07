import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { and, asc, eq, isNull, sql } from "drizzle-orm";

import {
  PersonalDataProtectionService,
  type ProtectedPersonalDataEnvelope,
} from "../../common/data-protection/personal-data-protection.service";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.token";
import { typeDefinition, visitorVisits, visitSurveyResponseStatusEvents, visitSurveyResponses } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import {
  clampLimit,
  type Distribution,
  distributionFrom,
  isStarScore,
  normaliseComment,
  SurveyRuleError,
  summarise,
} from "./survey-rules";
import { verifySurveyToken } from "./survey-token";
import { randomUUID } from "node:crypto";

export interface SurveySummary {
  responses: number;
  averageRating: number | null;
  satisfiedShare: number | null;
}

// Post-visit satisfaction micro-survey (Section 8.7, migration 0044). Offered
// only after a visitor signs themselves out; one response per visit, a repeat
// submit is accepted and ignored so retries are safe.
@Injectable()
export class VisitSurveyService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly dataProtection: PersonalDataProtectionService,
  ) {}

  /** The five rating options in display order (score = sortOrder). */
  async ratingOptions() {
    return this.db
      .select({ code: typeDefinition.code, label: typeDefinition.label, score: typeDefinition.sortOrder })
      .from(typeDefinition)
      .where(eq(typeDefinition.domain, "satisfaction_rating"))
      .orderBy(asc(typeDefinition.sortOrder));
  }

  /** Either the star count (1 to 5) or the rating code; the star count wins when both are given. */
  async submit(input: { token: string; ratingCode?: string; rating?: number; comment?: string }) {
    const verified = verifySurveyToken(input.token);
    if (!verified) throw new UnauthorizedException("This survey link has expired");
    const { visitId, channel } = verified;

    let comment: string | null;
    try {
      comment = normaliseComment(input.comment);
    } catch (error) {
      if (error instanceof SurveyRuleError) throw new BadRequestException(error.message);
      throw error;
    }

    let ratingCode = input.ratingCode;
    if (input.rating !== undefined && input.rating !== null) {
      if (!isStarScore(input.rating)) throw new BadRequestException("Rating must be a whole number from 1 to 5");
      const options = await this.ratingOptions();
      ratingCode = options.find((option) => Number(option.score) === input.rating)?.code;
    }
    if (!ratingCode) throw new BadRequestException("Choose a rating from 1 to 5");

    let ratingId: string;
    try {
      ratingId = await this.typeDefs.id("satisfaction_rating", ratingCode);
    } catch {
      throw new BadRequestException("Unknown rating");
    }

    const visit = await this.db.query.visitorVisits.findFirst({
      where: and(eq(visitorVisits.id, visitId), isNull(visitorVisits.deletedAt)),
    });
    if (!visit) throw new NotFoundException("Visit not found");
    if (!visit.checkedOutAt) throw new BadRequestException("The survey opens after sign-out");

    const [submitted, captureChannel] = await Promise.all([
      this.typeDefs.id("survey_response_status", "submitted"),
      this.typeDefs.id("capture_channel", channel),
    ]);
    const id = randomUUID();
    const inserted = await this.db
      .insert(visitSurveyResponses)
      .values({
        id,
        organisationId: visit.organisationId,
        siteId: visit.siteId,
        visitId: visit.id,
        ratingCode: ratingId,
        statusCode: submitted,
        captureChannelCode: captureChannel,
        // The comment is personal data: it is stored only as an encrypted envelope and is never logged.
        commentProtected: comment ? this.dataProtection.encrypt(comment) : null,
      })
      .onConflictDoNothing({
        target: [visitSurveyResponses.organisationId, visitSurveyResponses.visitId],
        where: sql`deleted_at IS NULL`,
      })
      .returning({ id: visitSurveyResponses.id });
    if (inserted.length === 0) return { recorded: true, duplicate: true };

    await this.db.insert(visitSurveyResponseStatusEvents).values({
      id: randomUUID(),
      organisationId: visit.organisationId,
      responseId: id,
      fromStatusCode: null,
      toStatusCode: submitted,
    });
    return { recorded: true, duplicate: false };
  }

  /**
   * Staff view for one organisation: average, count, a 1 to 5 distribution, a breakdown by site and the most recent comments.
   * Read live from the responses (the daily fact table has no distribution or comments). Tenant-scoped by organisationId.
   */
  async detail(input: {
    organisationId: string;
    from: string;
    to: string;
    siteId?: string;
    commentLimit?: number;
    includeComments?: boolean;
  }) {
    const timeZone = process.env.ANALYTICS_TIMEZONE ?? "Africa/Windhoek";
    const inPeriod = sql`(r.submitted_at AT TIME ZONE ${timeZone})::date BETWEEN ${input.from}::date AND ${input.to}::date`;
    const siteFilter = input.siteId ? sql`AND r.site_id = ${input.siteId}` : sql``;
    const limit = clampLimit(input.commentLimit);

    const [distributionResult, siteResult, commentResult] = await Promise.all([
      this.db.execute(sql`
        SELECT t.sort_order::int AS score, count(*)::int AS n
          FROM visit_survey_responses r
          JOIN type_definition t ON t.id = r.rating_code
         WHERE r.organisation_id = ${input.organisationId} AND r.deleted_at IS NULL AND ${inPeriod} ${siteFilter}
         GROUP BY t.sort_order`),
      this.db.execute(sql`
        SELECT r.site_id AS site_id, s.name AS site_name, count(*)::int AS n, sum(t.sort_order)::int AS total
          FROM visit_survey_responses r
          JOIN type_definition t ON t.id = r.rating_code
          JOIN sites s ON s.id = r.site_id
         WHERE r.organisation_id = ${input.organisationId} AND r.deleted_at IS NULL AND ${inPeriod} ${siteFilter}
         GROUP BY r.site_id, s.name
         ORDER BY count(*) DESC, s.name`),
      // Comments are personal data: they are read only when the caller holds the permission that allows it.
      input.includeComments === false
        ? Promise.resolve({ rows: [] as unknown[] })
        : this.db.execute(sql`
        SELECT r.id AS id, r.site_id AS site_id, s.name AS site_name, r.submitted_at AS submitted_at,
               t.sort_order::int AS score, r.comment_protected AS comment_protected
          FROM visit_survey_responses r
          JOIN type_definition t ON t.id = r.rating_code
          JOIN sites s ON s.id = r.site_id
         WHERE r.organisation_id = ${input.organisationId} AND r.deleted_at IS NULL AND r.comment_protected IS NOT NULL
           AND ${inPeriod} ${siteFilter}
         ORDER BY r.submitted_at DESC
         LIMIT ${limit}`),
    ]);

    const distribution: Distribution = distributionFrom(distributionResult.rows as Array<{ score: number; n: number }>);
    const comments: Array<{
      id: string;
      siteId: string;
      siteName: string;
      submittedAt: string;
      rating: number;
      comment: string;
    }> = [];
    for (const row of commentResult.rows as Array<{
      id: string;
      site_id: string;
      site_name: string;
      submitted_at: string | Date;
      score: number;
      comment_protected: unknown;
    }>) {
      try {
        const text = this.dataProtection.decrypt(row.comment_protected as ProtectedPersonalDataEnvelope);
        comments.push({
          id: row.id,
          siteId: row.site_id,
          siteName: row.site_name,
          submittedAt: new Date(row.submitted_at).toISOString(),
          rating: Number(row.score),
          comment: text,
        });
      } catch {
        // An unreadable envelope is skipped, never shown or logged.
      }
    }

    return {
      period: { from: input.from, to: input.to },
      ...summarise(distribution),
      distribution,
      bySite: (siteResult.rows as Array<{ site_id: string; site_name: string; n: number; total: number }>).map(
        (row) => ({
          siteId: row.site_id,
          siteName: row.site_name,
          responses: Number(row.n),
          averageRating: Number(row.n) ? Math.round((Number(row.total) / Number(row.n)) * 100) / 100 : null,
        }),
      ),
      recentComments: comments,
      commentsIncluded: input.includeComments !== false,
    };
  }

  /**
   * Satisfaction from the PII-free daily fact table. organisationId null means
   * platform-wide (ops). Satisfied means a rating of 4 or 5.
   */
  async summary(input: {
    organisationId: string | null;
    from: string;
    to: string;
    siteId?: string;
  }): Promise<SurveySummary> {
    const result = await this.db.execute(sql`
      SELECT COALESCE(sum(response_count), 0)::int AS responses,
             COALESCE(sum(rating_total), 0)::int AS rating_total,
             COALESCE(sum(satisfied_count), 0)::int AS satisfied
        FROM visit_survey_daily_fact
       WHERE local_date BETWEEN ${input.from}::date AND ${input.to}::date
         ${input.organisationId ? sql`AND organisation_id = ${input.organisationId}` : sql``}
         ${input.siteId ? sql`AND site_id = ${input.siteId}` : sql``}
    `);
    const row = result.rows[0] as { responses: number; rating_total: number; satisfied: number };
    const responses = Number(row.responses);
    return {
      responses,
      averageRating: responses ? Math.round((Number(row.rating_total) / responses) * 100) / 100 : null,
      satisfiedShare: responses ? Number(row.satisfied) / responses : null,
    };
  }
}
