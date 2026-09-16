import { IsIn, IsOptional, IsString, IsUUID } from "class-validator";

export class SendNotificationDto {
  // Optional: a password-reset or account-level notification isn't tied to
  // a visit (notification_delivery_instructions.visit_id is nullable).
  @IsOptional()
  @IsUUID()
  visitId?: string;

  @IsIn(["email", "sms", "ussd", "whatsapp"])
  channelCode!: "email" | "sms" | "ussd" | "whatsapp";

  @IsString()
  recipientReference!: string;

  @IsString()
  message!: string;
}
