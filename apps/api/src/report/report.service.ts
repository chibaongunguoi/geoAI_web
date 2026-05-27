import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(userId: string, data: { reason: string; message: string; latitude: number; longitude: number }) {
    return this.prisma.report.create({
      data: {
        userId,
        reason: data.reason,
        message: data.message,
        latitude: data.latitude,
        longitude: data.longitude,
        status: "PENDING"
      }
    });
  }

  async getReports(user: any, status?: string) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    // Only Officer and Admin can see all reports
    const isOfficerOrAdmin = user.roles.some((r: any) => 
      ['ADMIN', 'SYSTEM_ADMIN', 'OFFICER'].includes(r)
    );

    if (!isOfficerOrAdmin) {
      // Citizen can only see their own reports
      where.userId = user.id;
    }

    return this.prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });
  }

  async respondToReport(id: string, responseMessage: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException("Report not found");

    return this.prisma.report.update({
      where: { id },
      data: {
        status: "RESPONDED",
        responseMessage
      }
    });
  }

  async resolveReport(id: string, userId: string, isOfficerOrAdmin: boolean) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException("Report not found");

    // Only creator or Officer/Admin can resolve
    if (report.userId !== userId && !isOfficerOrAdmin) {
      throw new Error("Không có quyền đóng phản ánh này.");
    }

    return this.prisma.report.update({
      where: { id },
      data: {
        status: "RESOLVED"
      }
    });
  }
}
