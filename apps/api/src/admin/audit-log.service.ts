import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type Delegate = {
  findMany?: (args?: unknown) => Promise<unknown[]>;
  create?: (args: unknown) => Promise<unknown>;
};

type AuditPrisma = {
  auditLog: Required<Pick<Delegate, "findMany" | "create">>;
};

type ListAuditLogsInput = {
  action?: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
};

@Injectable()
export class AuditLogService {
  constructor(@Inject(PrismaService) private readonly prisma: AuditPrisma) {}

  listAuditLogs(filters: ListAuditLogsInput = {}) {
    const where: Record<string, unknown> = {};

    if (filters.action) {
      where.action = { contains: filters.action };
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.actorUserId) {
      where.actorUserId = filters.actorUserId;
    }

    const createdAt = this.auditDateRange(filters.from, filters.to);
    if (createdAt) {
      where.createdAt = createdAt;
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true
          }
        }
      }
    });
  }

  async logAction(data: {
    actorUserId?: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: any;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId: data.actorUserId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: data.metadata
      }
    });
  }

  private auditDateRange(from?: string, to?: string) {
    const range: { gte?: Date; lte?: Date } = {};

    if (from) {
      const start = new Date(`${from}T00:00:00.000Z`);
      if (Number.isFinite(start.getTime())) {
        range.gte = start;
      }
    }

    if (to) {
      const end = new Date(`${to}T23:59:59.999Z`);
      if (Number.isFinite(end.getTime())) {
        range.lte = end;
      }
    }

    return range.gte || range.lte ? range : undefined;
  }
}
