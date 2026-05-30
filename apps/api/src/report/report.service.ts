import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationService } from "../notification/notification.service";

@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService
  ) {}

  async createReport(userId: string, data: { reason: string; message: string; latitude: number; longitude: number; imageUrl?: string }) {
    const report = await this.prisma.report.create({
      data: {
        userId,
        reason: data.reason,
        message: data.message,
        latitude: data.latitude,
        longitude: data.longitude,
        imageUrl: data.imageUrl,
        status: "PENDING"
      }
    });

    // Notify managers
    const managers = await this.prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: { code: { in: ['ADMIN', 'SYSTEM_ADMIN', 'OFFICER'] } }
          }
        }
      }
    });

    for (const manager of managers) {
      await this.notificationService.createNotification(
        manager.id,
        'Có báo cáo sự cố mới',
        `Người dân vừa gửi báo cáo về: ${data.reason}`,
        'REPORT_NEW'
      );
    }

    return report;
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

  async receiveReport(id: string, isOfficerOrAdmin: boolean) {
    if (!isOfficerOrAdmin) throw new Error("Không có quyền tiếp nhận.");
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException("Report not found");

    const updatedReport = await this.prisma.report.update({
      where: { id },
      data: { status: "RECEIVED" }
    });

    await this.notificationService.createNotification(
      report.userId,
      'Sự cố đã được tiếp nhận',
      `Cán bộ đã tiếp nhận sự cố: ${report.reason}`,
      'REPORT_RECEIVED'
    );

    return updatedReport;
  }

  async respondToReport(id: string, responseMessage: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException("Report not found");

    const updatedReport = await this.prisma.report.update({
      where: { id },
      data: {
        status: "RESPONDED",
        responseMessage
      }
    });

    await this.notificationService.createNotification(
      report.userId,
      'Cán bộ đã phản hồi',
      `Cán bộ vừa phản hồi sự cố của bạn: ${report.reason}`,
      'REPORT_RESPONDED'
    );

    return updatedReport;
  }

  async resolveReport(id: string, userId: string, isOfficerOrAdmin: boolean) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException("Report not found");

    // Only creator or Officer/Admin can resolve
    if (report.userId !== userId && !isOfficerOrAdmin) {
      throw new Error("Không có quyền đóng phản ánh này.");
    }

    const updatedReport = await this.prisma.report.update({
      where: { id },
      data: {
        status: "RESOLVED"
      }
    });

    // If user resolves it, notify managers
    if (report.userId === userId) {
      const managers = await this.prisma.user.findMany({
        where: {
          roles: {
            some: { role: { code: { in: ['ADMIN', 'SYSTEM_ADMIN', 'OFFICER'] } } }
          }
        }
      });
      for (const manager of managers) {
        await this.notificationService.createNotification(
          manager.id,
          'Sự cố đã đóng',
          `Người dân đã đóng sự cố: ${report.reason}`,
          'REPORT_RESOLVED'
        );
      }
    }

    return updatedReport;
  }
}
