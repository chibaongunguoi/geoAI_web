import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { MapAssetsModule } from "./map-assets/map-assets.module";
import { MapLayersModule } from "./map-layers/map-layers.module";
import { PropertiesModule } from "./properties/properties.module";
import { PrismaModule } from "./prisma/prisma.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { PoiModule } from "./poi/poi.module";
import { ReportModule } from "./report/report.module";
import { UploadModule } from './upload/upload.module';
import { NotificationModule } from './notification/notification.module';
import { GroqModule } from "./groq/groq.module";
import { RiskModule } from './risk/risk.module';

import { CacheModule } from "@nestjs/cache-manager";
import { redisStore } from "cache-manager-redis-yet";

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          url: process.env.REDIS_URL || 'redis://localhost:6379',
        }),
      }),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"]
    }),
    PrismaModule,
    AuthModule,
    AdminModule,
    DashboardModule,
    MapAssetsModule,
    MapLayersModule,
    PropertiesModule,
    PoiModule,
    ReportModule,
    UploadModule,
    NotificationModule,
    GroqModule,
    RiskModule
  ]
})
export class AppModule {}
