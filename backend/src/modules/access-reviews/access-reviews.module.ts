import { Module } from "@nestjs/common";

import { AccessReviewsController } from "./access-reviews.controller";
import { AccessReviewsService } from "./access-reviews.service";

// Customer-side membership attestation (migration 0029's
// organisation_access_review_log). Read-and-append only: role changes stay
// with RbacModule, which is the single writer for organisation_memberships in
// a customer org.
@Module({
  controllers: [AccessReviewsController],
  providers: [AccessReviewsService],
  exports: [AccessReviewsService],
})
export class AccessReviewsModule {}
