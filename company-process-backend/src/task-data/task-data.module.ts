import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TaskDataController } from './task-data.controller';
import { TaskDataService } from './task-data.service';

@Module({
  controllers: [TaskDataController],
  providers: [TaskDataService, PrismaService],
})
export class TaskDataModule {}
