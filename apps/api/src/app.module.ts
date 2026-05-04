import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { MapAssetsModule } from "./map-assets/map-assets.module";
import { MapLayersModule } from "./map-layers/map-layers.module";
import { PropertiesModule } from "./properties/properties.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"]
    }),
    PrismaModule,
    AuthModule,
    AdminModule,
    MapAssetsModule,
    MapLayersModule,
    PropertiesModule
  ]
})
export class AppModule {}
