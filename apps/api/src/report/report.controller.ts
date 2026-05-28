import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ReportService } from "./report.service";

@Controller("reports")
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  async createReport(
    @Req() req: any,
    @Body() body: { reason: string; message: string; latitude: number; longitude: number; imageUrl?: string }
  ) {
    try {
      const userId = req.user.sub || req.user.id;
      return await this.reportService.createReport(userId, body);
    } catch (e) {
      throw new BadRequestException(`Report creation failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  @Get()
  async getReports(@Req() req: any, @Query("status") status?: string) {
    return this.reportService.getReports(req.user, status);
  }

  @Patch(":id/receive")
  async receiveReport(
    @Req() req: any,
    @Param("id") id: string
  ) {
    const isOfficerOrAdmin = req.user.roles.some((r: any) => 
      ['ADMIN', 'SYSTEM_ADMIN', 'OFFICER'].includes(r)
    );
    return this.reportService.receiveReport(id, isOfficerOrAdmin);
  }

  @Patch(":id/respond")
  async respondToReport(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: { responseMessage: string }
  ) {
    const isOfficerOrAdmin = req.user.roles.some((r: any) => 
      ['ADMIN', 'SYSTEM_ADMIN', 'OFFICER'].includes(r)
    );
    if (!isOfficerOrAdmin) {
      throw new Error("Không có quyền phản hồi.");
    }
    return this.reportService.respondToReport(id, body.responseMessage);
  }

  @Patch(":id/resolve")
  async resolveReport(
    @Req() req: any,
    @Param("id") id: string
  ) {
    const userId = req.user.sub || req.user.id;
    const isOfficerOrAdmin = req.user.roles.some((r: any) => 
      ['ADMIN', 'SYSTEM_ADMIN', 'OFFICER'].includes(r)
    );
    return this.reportService.resolveReport(id, userId, isOfficerOrAdmin);
  }
}
