import { Inject, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PropertiesScoringService {
  private readonly logger = new Logger(PropertiesScoringService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  async calculateScore(propertyId: string): Promise<number> {
    const property = await this.prisma.buildingProperty.findUnique({
      where: { id: propertyId }
    });

    if (!property || property.centroidLat === null || property.centroidLng === null) {
      return 0; // Cannot score without location
    }

    const lat = property.centroidLat;
    const lng = property.centroidLng;

    const proximityScore = await this.calculateProximityScore(lat, lng);
    const roadScore = await this.calculateRoadAccessScore(lat, lng);
    const penaltyScore = this.calculateRiskPenalty(property.riskFlags);

    const compositeScore = proximityScore + roadScore + penaltyScore;

    await this.prisma.buildingProperty.update({
      where: { id: propertyId },
      data: { compositeScore }
    });

    return compositeScore;
  }

  async batchCalculateScores(): Promise<void> {
    const properties = await this.prisma.buildingProperty.findMany({
      where: { deletedAt: null },
      select: { id: true }
    });
    
    let count = 0;
    for (const prop of properties) {
      try {
        await this.calculateScore(prop.id);
        count++;
        if (count % 100 === 0) {
          this.logger.log(`Calculated scores for ${count} properties...`);
        }
      } catch (err) {
        this.logger.error(`Error calculating score for property ${prop.id}`, err);
      }
    }
    this.logger.log(`Finished calculating scores for ${count} properties.`);
  }

  private async calculateProximityScore(lat: number, lng: number): Promise<number> {
    let score = 0;
    
    // Schools: 500m (+10), 1km (+5), 2km (+2)
    const schoolCounts = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        SUM(CASE WHEN ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 500) THEN 1 ELSE 0 END) as count_500,
        SUM(CASE WHEN ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 1000) THEN 1 ELSE 0 END) as count_1000,
        SUM(CASE WHEN ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 2000) THEN 1 ELSE 0 END) as count_2000
      FROM "Place"
      WHERE category ILIKE '%school%' OR category ILIKE '%education%'
    `, lng, lat);
    
    if (schoolCounts.length > 0) {
      const c500 = Number(schoolCounts[0].count_500 || 0);
      const c1000 = Number(schoolCounts[0].count_1000 || 0) - c500;
      const c2000 = Number(schoolCounts[0].count_2000 || 0) - (c500 + c1000);
      score += (c500 * 10) + (c1000 * 5) + (c2000 * 2);
    }

    // Hospitals: 1km (+15), 3km (+5)
    const hospitalCounts = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        SUM(CASE WHEN ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 1000) THEN 1 ELSE 0 END) as count_1000,
        SUM(CASE WHEN ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 3000) THEN 1 ELSE 0 END) as count_3000
      FROM "Place"
      WHERE category ILIKE '%hospital%' OR category ILIKE '%clinic%'
    `, lng, lat);
    
    if (hospitalCounts.length > 0) {
      const c1000 = Number(hospitalCounts[0].count_1000 || 0);
      const c3000 = Number(hospitalCounts[0].count_3000 || 0) - c1000;
      score += (c1000 * 15) + (c3000 * 5);
    }

    // Markets/Supermarkets: 500m (+10)
    const marketCounts = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) as count_500
      FROM "Place"
      WHERE (category ILIKE '%market%' OR category ILIKE '%supermarket%')
        AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 500)
    `, lng, lat);
    if (marketCounts.length > 0) {
      score += Number(marketCounts[0].count_500 || 0) * 10;
    }

    // Parks: 300m (+10)
    const parkCounts = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) as count_300
      FROM "Place"
      WHERE category ILIKE '%park%'
        AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 300)
    `, lng, lat);
    if (parkCounts.length > 0) {
      score += Number(parkCounts[0].count_300 || 0) * 10;
    }

    return score;
  }

  private async calculateRoadAccessScore(lat: number, lng: number): Promise<number> {
    // T6.2 Khoảng cách đến đường lớn nhất gần nhất
    const nearestRoads = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT highway, ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as dist
      FROM "RoadSegment"
      WHERE geom IS NOT NULL
      ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geometry
      LIMIT 1
    `, lng, lat);

    if (nearestRoads.length === 0) {
      return 0; // No road data available
    }

    const road = nearestRoads[0];
    const dist = Number(road.dist);
    let score = 0;

    if (road.highway === 'primary' || road.highway === 'trunk') {
      if (dist < 100) score += 20;
      else if (dist < 300) score += 10;
    } else if (road.highway === 'secondary' || road.highway === 'tertiary') {
      if (dist < 100) score += 15;
      else if (dist < 300) score += 5;
    } else {
      // residential, unclassified, etc.
      if (dist < 50) score += 10;
    }

    return score;
  }

  private calculateRiskPenalty(riskFlags: any): number {
    if (!riskFlags || !Array.isArray(riskFlags)) return 0;
    
    let penalty = 0;
    for (const flag of riskFlags) {
      if (flag.type === 'flood') {
        if (flag.level === 'high') penalty -= 30;
        else if (flag.level === 'medium') penalty -= 15;
      } else if (flag.type === 'landslide') {
        penalty -= 20;
      } else if (flag.type === 'planning_corridor') {
        penalty -= 50;
      }
    }
    
    return penalty;
  }
}
