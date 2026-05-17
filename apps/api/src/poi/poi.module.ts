import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PoiController } from "./poi.controller";
import { PoiService } from "./poi.service";
import { CategoryMapper } from "./category-mapper";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [PoiController],
  providers: [PoiService, CategoryMapper],
  exports: [PoiService]
})
export class PoiModule {}
