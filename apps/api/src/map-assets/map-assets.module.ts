import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { MapAssetsController } from "./map-assets.controller";
import { MapAssetsService } from "./map-assets.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [MapAssetsController],
  providers: [MapAssetsService]
})
export class MapAssetsModule {}
