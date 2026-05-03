import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProcessModule } from './process/process.module';
import { TaskModule } from './task/task.module';
import { AuthModule } from './auth/auth.module';
import { EmployeeModule } from './employee/employee.module';
import { PositionModule } from './position/position.module';
import { SchemeModule } from './scheme/scheme.module';
import { RoleModule } from './role/role.module';
import { DataObjectModule } from './data-object/data-object.module';
import { ProcessDataModule } from './process-data/process-data.module';
import { TaskDataModule } from './task-data/task-data.module';
import { CabinetModule } from './cabinet/cabinet.module';
import { MaterialModule } from './material/material.module';
import { TestModule } from './test/test.module';

@Module({
  imports: [
    ProcessModule,
    TaskModule,
    AuthModule,
    EmployeeModule,
    PositionModule,
    SchemeModule,
    RoleModule,
    DataObjectModule,
    ProcessDataModule,
    TaskDataModule,
    CabinetModule,
    MaterialModule,
    TestModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
