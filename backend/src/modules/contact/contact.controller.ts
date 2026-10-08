import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

import { Public } from "../../common/decorators/public.decorator";
import { RequireTurnstile } from "../../common/turnstile/turnstile.guard";
import { ContactService } from "./contact.service";

class PublicContactDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message!: string;

  /** Honeypot — must be empty. */
  @IsOptional()
  @IsString()
  website?: string;
}

@Controller("public/contact")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @RequireTurnstile()
  @Throttle({ default: { ttl: 300_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @Post()
  submit(@Body() dto: PublicContactDto) {
    return this.contactService.submit(dto);
  }
}
