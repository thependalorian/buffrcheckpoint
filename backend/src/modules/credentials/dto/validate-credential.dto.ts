import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class ValidateCredentialDto {
  @IsOptional()
  @IsUUID()
  readerSessionReference?: string;

  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(512)
  credentialReference?: string;

  @IsOptional()
  @IsUUID()
  requestedZoneReference?: string;

  @IsOptional()
  @IsString()
  @MinLength(32)
  @MaxLength(4096)
  challengeResponse?: string;

  /** @deprecated use credentialReference */
  @IsOptional()
  @IsString()
  credentialReferenceHmac?: string;
}

export class OpenReaderSessionDto {
  @IsUUID()
  deviceId!: string;
}
