import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MaterialController } from './material.controller';
import { MaterialService } from './material.service';

@Module({
  controllers: [MaterialController],
  providers: [MaterialService, PrismaService],
})
export class MaterialModule {}
