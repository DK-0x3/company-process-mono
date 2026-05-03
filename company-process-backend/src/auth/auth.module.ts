import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../prisma.service';
import { OwnerOnlyGuard } from './owner-only.guard';
import { EmployeeOnlyGuard } from './employee-only.guard';
import { WorkspacePermissionGuard } from './workspace-permission.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: 'super-secret-key', // вынести в .env на проде
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    JwtStrategy,
    OwnerOnlyGuard,
    EmployeeOnlyGuard,
    WorkspacePermissionGuard,
  ],
  exports: [JwtModule, OwnerOnlyGuard, EmployeeOnlyGuard, WorkspacePermissionGuard],
})
export class AuthModule {}
