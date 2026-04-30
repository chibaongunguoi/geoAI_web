import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { MapLayersController } from "./map-layers.controller";
import { MapLayersService } from "./map-layers.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [MapLayersController],
  providers: [MapLayersService]
})
export class MapLayersModule {}
