import { Module } from "@nestjs/common";

import { VisitSurveyController } from "./visit-survey.controller";
import { VisitSurveyService } from "./visit-survey.service";

@Module({
  controllers: [VisitSurveyController],
  providers: [VisitSurveyService],
})
export class VisitSurveyModule {}
