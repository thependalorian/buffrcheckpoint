import { IsArray, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateSiteBrandingProfileDto {
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsOptional()
  @IsString()
  profileName?: string;
}

export class CreateSiteBrandingVersionDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  logoArtifactId?: string;

  @IsOptional()
  @IsString()
  brandColourToken?: string;

  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @IsOptional()
  @IsString()
  backgroundArtifactId?: string;

  @IsOptional()
  @IsString()
  organisationDisplayName?: string;

  @IsOptional()
  @IsString()
  siteDisplayName?: string;

  @IsOptional()
  @IsString()
  helpContactReference?: string;

  @IsOptional()
  @IsUUID()
  privacyNoticeVersionId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languageCodes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  captureChannelCodes?: string[];
}

export class SetupSiteBrandingDto extends CreateSiteBrandingVersionDto {
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  profileName?: string;
}
