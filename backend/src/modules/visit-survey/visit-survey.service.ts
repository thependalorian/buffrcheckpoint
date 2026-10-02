import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { and, asc, eq, isNull, sql } from "drizzle-orm";

import type { Database } from "../../db/client";
import { DB } from "../../db/db.token";
import { typeDefinition, visitorVisits, visitSurveyResponseStatusEvents, visitSurveyResponses } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
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
  ) {}

  /** The five rating options in display order (score = sortOrder). */
  async ratingOptions() {
    return this.db
      .select({ code: typeDefinition.code, label: typeDefinition.label, score: typeDefinition.sortOrder })
      .from(typeDefinition)
      .where(eq(typeDefinition.domain, "satisfaction_rating"))
      .orderBy(asc(typeDefinition.sortOrder));
  }

  async submit(input: { token: string; ratingCode: string }) {
    const verified = verifySurveyToken(input.token);
    if (!verified) throw new UnauthorizedException("This survey link has expired");
    const { visitId, channel } = verified;

    let ratingId: string;
    try {
      ratingId = await this.typeDefs.id("satisfaction_rating", input.ratingCode);
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
