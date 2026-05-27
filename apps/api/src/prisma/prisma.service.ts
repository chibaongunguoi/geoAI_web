import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
    // Removed PRAGMA statements here because setting journal_mode = WAL 
    // requires an exclusive lock and can deadlock if better-sqlite3 
    // is also initializing concurrently.
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
