import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type Delegate = {
  findUnique?: (args: unknown) => Promise<unknown>;
  upsert?: (args: unknown) => Promise<unknown>;
  create?: (args: unknown) => Promise<unknown>;
  findMany?: (args: unknown) => Promise<unknown[]>;
};

type MapAssetsPrisma = {
  assetDisplayUserConfig: Required<Pick<Delegate, "findUnique" | "upsert">>;
  auditLog: Required<Pick<Delegate, "create" | "findMany">>;
};

type AssetDisplayState = {
  labelMode: "off" | "code" | "name";
  colorMode: "type" | "priority";
  popupFields: string[];
};

type AssetConfigRow = {
  state: AssetDisplayState;
};

const DEFAULT_ASSET_DISPLAY_STATE: AssetDisplayState = {
  labelMode: "off",
  colorMode: "type",
  popupFields: ["code", "name", "status", "type", "updatedAt"]
};

const VALID_LABEL_MODES = new Set(["off", "code", "name"]);
const VALID_COLOR_MODES = new Set(["type", "priority"]);
const VALID_POPUP_FIELDS = new Set([
  "code",
  "name",
  "status",
  "type",
  "priority",
  "updatedAt",
  "ownerUnit",
  "category"
]);

@Injectable()
export class MapAssetsService {
  constructor(@Inject(PrismaService) private readonly prisma: MapAssetsPrisma) {}

  async getConfig(userId: string) {
    const config = (await this.prisma.assetDisplayUserConfig.findUnique({
      where: { userId },
      select: { state: true }
    })) as AssetConfigRow | null;

    return { state: config?.state ?? DEFAULT_ASSET_DISPLAY_STATE };
  }

  async saveConfig(userId: string, state: unknown) {
    const validState = this.validAssetDisplayState(state);
    const config = (await this.prisma.assetDisplayUserConfig.upsert({
      where: { userId },
      update: { state: validState },
      create: { userId, state: validState }
    })) as AssetConfigRow;

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: "map.assets.config.update",
        entityType: "AssetDisplayUserConfig",
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
        action: { startsWith: "map.assets." }
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

  private validAssetDisplayState(state: unknown): AssetDisplayState {
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      throw new BadRequestException("Asset display state must be an object");
    }

    const candidate = state as Partial<AssetDisplayState>;
    if (!VALID_LABEL_MODES.has(candidate.labelMode || "")) {
      throw new BadRequestException("Asset display labelMode is invalid");
    }

    if (!VALID_COLOR_MODES.has(candidate.colorMode || "")) {
      throw new BadRequestException("Asset display colorMode is invalid");
    }

    if (
      !Array.isArray(candidate.popupFields) ||
      !candidate.popupFields.every((field) => VALID_POPUP_FIELDS.has(field))
    ) {
      throw new BadRequestException("Asset display popupFields are invalid");
    }

    const labelMode = candidate.labelMode as AssetDisplayState["labelMode"];
    const colorMode = candidate.colorMode as AssetDisplayState["colorMode"];

    return {
      labelMode,
      colorMode,
      popupFields: [...new Set(candidate.popupFields)]
    };
  }
}
