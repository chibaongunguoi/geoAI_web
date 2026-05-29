import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RiskZoneGeoJson {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: {
      id: string;
      zoneType: string;
      riskLevel: string;
      source: string;
      description: string;
    };
    geometry: any;
  }>;
}

@Injectable()
export class RiskService {
  constructor(private prisma: PrismaService) {}

  async getRiskZones(type?: string): Promise<RiskZoneGeoJson> {
    const params: any[] = [];
    let whereClause = "";

    if (type) {
      whereClause = `WHERE "zoneType" = $1`;
      params.push(type);
    }

    const sql = `
      SELECT 
        id, 
        "zoneType", 
        "riskLevel", 
        source, 
        description, 
        ST_AsGeoJSON(geom)::json AS geometry
      FROM "RiskZone"
      ${whereClause}
      LIMIT 1000
    `;

    const rows = await this.prisma.$queryRawUnsafe<any[]>(sql, ...params);

    return {
      type: "FeatureCollection",
      features: rows.map(row => ({
        type: "Feature",
        properties: {
          id: row.id,
          zoneType: row.zoneType,
          riskLevel: row.riskLevel,
          source: row.source,
          description: row.description
        },
        geometry: row.geometry
      }))
    };
  }
}
