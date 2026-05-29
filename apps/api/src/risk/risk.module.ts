import { Module } from '@nestjs/common';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RiskController],
  providers: [RiskService],
  exports: [RiskService]
})
export class RiskModule {}
