import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RiskService, RiskZoneGeoJson } from './risk.service';


@Controller('risk-zones')
// Tạm thời comment guards để test dễ hơn trong dev, hoặc bật nếu frontend đã map quyền
// @UseGuards(JwtAuthGuard, PermissionsGuard)
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  @Get()
  async getRiskZones(@Query('type') type?: string): Promise<RiskZoneGeoJson> {
    return this.riskService.getRiskZones(type);
  }
}
