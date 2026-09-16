import { IsOptional, IsString, IsUUID } from "class-validator";

export class CreateCheckInFormDefinitionDto {
  @IsString()
  visitorCategoryCode!: string; // type_definition code, domain 'visitor_type'

  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsOptional()
  @IsString()
  formName?: string;
}
