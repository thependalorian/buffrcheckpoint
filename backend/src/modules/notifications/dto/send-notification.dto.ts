import { IsOptional, IsString, IsUUID, Matches } from "class-validator";

export class SendNotificationDto {
  // Optional: a password-reset or account-level notification isn't tied to
  // a visit (notification_delivery_instructions.visit_id is nullable).
  @IsOptional()
  @IsUUID()
  visitId?: string;

  // Which channels exist is configuration; the service checks the code against it. The shape check only keeps junk out.
  @IsString()
  @Matches(/^[a-z][a-z_]{1,30}$/)
  channelCode!: string;

  @IsString()
  recipientReference!: string;

  @IsString()
  message!: string;
}
