import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SchemeController } from './scheme.controller';
import { SchemeService } from './scheme.service';

@Module({
  controllers: [SchemeController],
  providers: [SchemeService, PrismaService],
})
export class SchemeModule {}
