import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PoiImportFeature, PoiImportSummary, ConvertResult } from "./poi.types";

@Injectable()
export class PoiImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importPlaces(
    features: PoiImportFeature[],
    sourceVersion?: string
  ): Promise<PoiImportSummary> {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const feature of features) {
      if (!this.isValidGeometry(feature)) {
        skipped++;
        continue;
      }

      if (!feature.overtureId || !feature.name || !feature.category) {
        skipped++;
        continue;
      }

      const data = {
        name: feature.name,
        category: feature.category,
        subcategories: feature.subcategories || [],
        address: feature.address || null,
        street: feature.street || null,
        ward: feature.ward || null,
        district: feature.district || null,
        latitude: feature.latitude!,
        longitude: feature.longitude!,
        geometry: feature.geometry as object,
        confidence: feature.confidence || 0,
        source: feature.source || "overture-places",
        sourceVersion: sourceVersion || null
      };

      const existing = await this.prisma.place.findUnique({
        where: { overtureId: feature.overtureId }
      });

      if (existing) {
        await this.prisma.place.update({
          where: { overtureId: feature.overtureId },
          data
        });
        updated++;
      } else {
        await this.prisma.place.create({
          data: { overtureId: feature.overtureId, ...data }
        });
        created++;
      }
    }

    return { created, updated, skipped };
  }

  async convertToAsset(
    placeId: string,
    actorUserId: string
  ): Promise<ConvertResult> {
    const place = await this.prisma.place.findUnique({
      where: { id: placeId }
    });

    if (!place) {
      throw new NotFoundException("Place not found");
    }

    // Check for duplicate
    const existing = await this.prisma.buildingProperty.findUnique({
      where: { overtureId: place.overtureId }
    });

    if (existing) {
      throw new ConflictException("POI đã được thêm vào tài sản");
    }

    // Generate code
    const count = await this.prisma.buildingProperty.count();
    const code = `DN-POI-${String(count + 1).padStart(6, "0")}`;

    // Create BuildingProperty
    const asset = await this.prisma.buildingProperty.create({
      data: {
        code,
        overtureId: place.overtureId,
        name: place.name,
        street: place.street,
        ward: place.ward,
        district: place.district,
        city: place.city,
        centroidLat: place.latitude,
        centroidLng: place.longitude,
        geometry: place.geometry as object,
        source: "overture",
        propertyType: place.category || "poi",
        searchText: `${code} ${place.name || ""} ${place.category || ""} ${place.street || ""} ${place.ward || ""} ${place.district || ""}`.trim(),
        searchTextNormalized: `${code} ${place.name || ""} ${place.category || ""} ${place.street || ""} ${place.ward || ""} ${place.district || ""}`
          .toLowerCase()
          .trim()
      }
    });

    // Create AuditLog
    await this.prisma.auditLog.create({
      data: {
        action: "poi_to_asset",
        entityType: "BuildingProperty",
        entityId: asset.id,
        actorUserId,
        metadata: { placeId, placeName: place.name, category: place.category }
      }
    });

    return { success: true, assetId: asset.id, assetCode: code };
  }

  private isValidGeometry(feature: PoiImportFeature): boolean {
    if (feature.latitude == null || feature.longitude == null) return false;
    if (!Number.isFinite(feature.latitude) || !Number.isFinite(feature.longitude)) return false;
    if (feature.geometry == null) return false;
    return true;
  }
}
