import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CategoryMapper } from "./category-mapper";
import { PoiSearchQuery, PoiSearchResult, PoiSearchItem } from "./poi.types";

@Injectable()
export class PoiSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryMapper: CategoryMapper
  ) {}

  async searchByCategory(query: PoiSearchQuery): Promise<PoiSearchResult> {
    const trimmedQuery = query.q?.trim() || "";
    const categories = trimmedQuery
      ? this.categoryMapper.findCategories(trimmedQuery)
      : [];
    const limit = Math.min(query.limit || 250, 250);

    const where: Record<string, unknown> = {
      deletedAt: null
    };

    if (categories.length > 0) {
      where.propertyType = { in: categories };
    } else if (trimmedQuery) {
      where.OR = [
        { name: { contains: trimmedQuery } },
        { propertyType: { contains: trimmedQuery } }
      ];
    } else {
      // Exclude generic buildings when no specific query is provided
      // to prevent loading all 430,000+ buildings during map panning.
      // This makes POI rendering extremely fast.
      where.propertyType = { not: "building" };
    }

    if (
      query.south != null &&
      query.west != null &&
      query.north != null &&
      query.east != null
    ) {
      where.centroidLat = { gte: query.south, lte: query.north };
      where.centroidLng = { gte: query.west, lte: query.east };
    }

    const places = await this.prisma.buildingProperty.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        code: true,
        name: true,
        propertyType: true,
        centroidLat: true,
        centroidLng: true,
        addressLine: true,
        street: true
      }
    });

    const items: PoiSearchItem[] = places.map((place) => ({
      id: place.id,
      code: place.code,
      name: place.name || place.code,
      category: place.propertyType,
      vietnameseCategory: this.categoryMapper.getVietnameseLabel(place.propertyType),
      latitude: place.centroidLat || 0,
      longitude: place.centroidLng || 0,
      centroidLat: place.centroidLat || 0,
      centroidLng: place.centroidLng || 0,
      address: place.addressLine || null,
      street: place.street || null,
      propertyType: place.propertyType
    }));

    return { items, total: items.length };
  }
}
