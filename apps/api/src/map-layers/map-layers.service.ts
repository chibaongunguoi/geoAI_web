import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type Delegate = {
  findUnique?: (args: unknown) => Promise<unknown>;
  upsert?: (args: unknown) => Promise<unknown>;
  create?: (args: unknown) => Promise<unknown>;
  findMany?: (args: unknown) => Promise<unknown[]>;
};

type MapLayersPrisma = {
  layerUserConfig: Required<Pick<Delegate, "findUnique" | "upsert">>;
  auditLog: Required<Pick<Delegate, "create" | "findMany">>;
};

type LayerState = {
  visible?: Record<string, boolean>;
  opacity?: Record<string, number>;
  order?: string[];
};

type LayerConfigRow = {
  state: LayerState;
};

@Injectable()
export class MapLayersService {
  constructor(@Inject(PrismaService) private readonly prisma: MapLayersPrisma) {}

  async getConfig(userId: string) {
    const config = (await this.prisma.layerUserConfig.findUnique({
      where: { userId },
      select: { state: true }
    })) as LayerConfigRow | null;

    return { state: config?.state ?? null };
  }

  async saveConfig(userId: string, state: unknown) {
    const validState = this.validLayerState(state);
    const config = (await this.prisma.layerUserConfig.upsert({
      where: { userId },
      update: { state: validState },
      create: { userId, state: validState }
    })) as LayerConfigRow;

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: "map.layers.config.update",
        entityType: "LayerUserConfig",
        entityId: userId,
        metadata: { state: validState }
      }
    });

    return { state: config.state };
  }

  async getHistory(userId: string, take = 20) {
    const boundedTake = Math.min(50, Math.max(1, Number.isFinite(take) ? take : 20));
    const items = await this.prisma.auditLog.findMany({
      where: {
        actorUserId: userId,
        action: { startsWith: "map.layers." }
      },
      orderBy: { createdAt: "desc" },
      take: boundedTake,
      select: {
        id: true,
        action: true,
        entityId: true,
        metadata: true,
        createdAt: true
      }
    });

    return { items };
  }

  async exportConfig(userId: string) {
    const [{ state }, { items }] = await Promise.all([
      this.getConfig(userId),
      this.getHistory(userId, 20)
    ]);

    return {
      exportedAt: new Date().toISOString(),
      userId,
      config: state,
      history: items
    };
  }

  private validLayerState(state: unknown): LayerState {
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      throw new BadRequestException("Layer state must be an object");
    }

    const candidate = state as LayerState;
    const visible = this.validBooleanRecord(candidate.visible, "visible");
    const opacity = this.validNumberRecord(candidate.opacity, "opacity");

    if (!Array.isArray(candidate.order) || !candidate.order.every((id) => typeof id === "string")) {
      throw new BadRequestException("Layer state order must be an array of ids");
    }

    return {
      visible,
      opacity,
      order: candidate.order
    };
  }

  private validBooleanRecord(value: unknown, field: string) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new BadRequestException(`Layer state ${field} must be an object`);
    }

    const entries = Object.entries(value);
    if (!entries.every(([id, item]) => typeof id === "string" && typeof item === "boolean")) {
      throw new BadRequestException(`Layer state ${field} values must be boolean`);
    }

    return Object.fromEntries(entries) as Record<string, boolean>;
  }

  private validNumberRecord(value: unknown, field: string) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new BadRequestException(`Layer state ${field} must be an object`);
    }

    const entries = Object.entries(value);
    if (!entries.every(([id, item]) => typeof id === "string" && typeof item === "number")) {
      throw new BadRequestException(`Layer state ${field} values must be numeric`);
    }

    return Object.fromEntries(entries) as Record<string, number>;
  }
}
