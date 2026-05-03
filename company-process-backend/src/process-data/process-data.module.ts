import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ProcessDataController } from './process-data.controller';
import { ProcessDataService } from './process-data.service';

@Module({
  controllers: [ProcessDataController],
  providers: [ProcessDataService, PrismaService],
})
export class ProcessDataModule {}
