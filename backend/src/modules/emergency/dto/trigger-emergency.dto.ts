import { IsUUID } from "class-validator";

export class TriggerEmergencyDto {
  @IsUUID()
  siteId!: string;
}
