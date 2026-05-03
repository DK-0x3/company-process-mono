import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DataObjectController } from './data-object.controller';
import { DataObjectService } from './data-object.service';

@Module({
  controllers: [DataObjectController],
  providers: [DataObjectService, PrismaService],
})
export class DataObjectModule {}
