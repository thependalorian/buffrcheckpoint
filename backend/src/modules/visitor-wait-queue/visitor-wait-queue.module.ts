import { Module } from "@nestjs/common";

import { VisitorWaitQueueController } from "./visitor-wait-queue.controller";
import { VisitorWaitQueueService } from "./visitor-wait-queue.service";

@Module({
  controllers: [VisitorWaitQueueController],
  providers: [VisitorWaitQueueService],
  exports: [VisitorWaitQueueService],
})
export class VisitorWaitQueueModule {}
