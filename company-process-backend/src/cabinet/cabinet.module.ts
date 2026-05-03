import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TestModule } from '../test/test.module';
import { CabinetController } from './cabinet.controller';
import { CabinetService } from './cabinet.service';

@Module({
  imports: [TestModule],
  controllers: [CabinetController],
  providers: [CabinetService, PrismaService],
})
export class CabinetModule {}
