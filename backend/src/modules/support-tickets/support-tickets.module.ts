import { Module } from "@nestjs/common";

import { SupportTicketsCustomerController } from "./support-tickets-customer.controller";
import { SupportTicketsController } from "./support-tickets.controller";
import { SupportTicketsService } from "./support-tickets.service";

// Split out of the former platform-control-plane bundle (see
// ../rename-map.tsv) — ticketing workflow changes independently of
// billing/CRM/KYB. Two controllers, one service: platform staff's
// /platform/tickets and the customer-facing /tickets (added so a customer
// org can actually open a ticket and read staff replies — see migration
// 0028).
@Module({
  controllers: [SupportTicketsController, SupportTicketsCustomerController],
  providers: [SupportTicketsService],
  exports: [SupportTicketsService],
})
export class SupportTicketsModule {}
