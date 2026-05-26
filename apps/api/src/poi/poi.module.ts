import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PoiController } from "./poi.controller";
import { PoiSearchService } from "./poi-search.service";
import { PoiSemanticService } from "./poi-semantic.service";
import { PoiImportService } from "./poi-import.service";
import { CategoryMapper } from "./category-mapper";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [PoiController],
  providers: [
    PoiSearchService,
    PoiSemanticService,
    PoiImportService,
    CategoryMapper
  ],
  exports: [
    PoiSearchService,
    PoiSemanticService,
    PoiImportService
  ]
})
export class PoiModule {}
