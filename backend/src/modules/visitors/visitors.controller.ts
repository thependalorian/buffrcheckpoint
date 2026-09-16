import { Body, Controller, Get, Param, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";

import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { CreateVisitorDto } from "./dto/create-visitor.dto";
import { VisitorsService } from "./visitors.service";

@Controller("visitors")
export class VisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  @Post()
  @RequirePermission(PERMISSIONS.VISIT_WRITE)
  create(@Body() dto: CreateVisitorDto, @CurrentUser() user: AuthenticatedUser) {
    return this.visitorsService.create(dto, user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.visitorsService.list(user);
  }

  // Part Three §2's approved "visit reference + phone OTP" returning-visitor
  // method — never a public name search. @Res() manual response: NestJS
  // sends a completely empty body for a `null` return (identical to
  // `undefined`), which breaks the caller's `.json()` for the very common
  // case of a phone number with no matching visitor yet.
  @Get("by-phone")
  @RequirePermission(PERMISSIONS.VISIT_WRITE)
  async findByPhone(@Query("phone") phone: string, @CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    const result = await this.visitorsService.findByPhone(phone, user);
    res.status(200).json(result);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  getById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.visitorsService.getById(id, user);
  }
}
