import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ReportController } from "./report.controller";
import { ReportService } from "./report.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService]
})
export class ReportModule {}
