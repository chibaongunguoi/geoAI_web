import { Global, Module } from "@nestjs/common";
import { BetterSqliteService } from "./better-sqlite.service";
import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService, BetterSqliteService],
  exports: [PrismaService, BetterSqliteService]
})
export class PrismaModule {}

