import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserActorType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { EmployeePermissionsDto } from './dto/employee-permissions.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

type EmployeePermissionField =
  | 'canViewProcesses'
  | 'canEditProcesses'
  | 'canViewTasks'
  | 'canEditTasks'
  | 'canViewPositions'
  | 'canEditPositions'
  | 'canViewDataObjects'
  | 'canEditDataObjects'
  | 'canViewMaterials'
  | 'canEditMaterials'
  | 'canViewTests'
  | 'canEditTests';

type EmployeePermissionsPatch = Partial<Record<EmployeePermissionField, boolean>>;

@Injectable()
export class EmployeeService {
  constructor(private prisma: PrismaService) {}

  private readonly permissionPairs = [
    ['canViewProcesses', 'canEditProcesses'],
    ['canViewTasks', 'canEditTasks'],
    ['canViewPositions', 'canEditPositions'],
    ['canViewDataObjects', 'canEditDataObjects'],
    ['canViewMaterials', 'canEditMaterials'],
    ['canViewTests', 'canEditTests'],
  ] as const;

  private employeeWithRelationsInclude = {
    position: true,
    role: true,
    userAccount: {
      select: {
        id: true,
        login: true,
        email: true,
        visiblePassword: true,
        actorType: true,
      },
    },
  } satisfies Prisma.EmployeeInclude;

  private normalizeOptionalCredential(value?: string) {
    const trimmed = value?.trim();
    if (!trimmed) {
      return undefined;
    }
    return trimmed;
  }

  private normalizePermissionsForCreate(permissions?: EmployeePermissionsDto): EmployeePermissionsPatch {
    const data: EmployeePermissionsPatch = {};

    for (const [viewKey, editKey] of this.permissionPairs) {
      const editValue = permissions?.[editKey] ?? false;
      const viewValue = permissions?.[viewKey] ?? false;

      data[editKey] = editValue;
      data[viewKey] = editValue ? true : viewValue;
    }

    return data;
  }

  private normalizePermissionsForUpdate(
    permissions: EmployeePermissionsDto | undefined,
    currentEmployee: EmployeePermissionsPatch,
  ): EmployeePermissionsPatch {
    const data: EmployeePermissionsPatch = {};

    if (!permissions) {
      return data;
    }

    for (const [viewKey, editKey] of this.permissionPairs) {
      const hasView = permissions[viewKey] !== undefined;
      const hasEdit = permissions[editKey] !== undefined;
      if (!hasView && !hasEdit) {
        continue;
      }

      const editValue = permissions[editKey] ?? Boolean(currentEmployee[editKey]);
      const viewValue = permissions[viewKey] ?? Boolean(currentEmployee[viewKey]);

      data[editKey] = editValue;
      data[viewKey] = editValue ? true : viewValue;
    }

    return data;
  }

  private async upsertEmployeeAccount(
    tx: Prisma.TransactionClient,
    payload: {
      ownerUserId: number;
      employeeId: number;
      employeeEmail: string;
      accountLogin: string;
      accountPassword: string;
    },
  ) {
    const existingByLogin = await tx.user.findUnique({
      where: { login: payload.accountLogin },
      select: {
        id: true,
        actorType: true,
        ownerUserId: true,
        employeeProfileId: true,
      },
    });

    if (
      existingByLogin
      && (existingByLogin.actorType !== UserActorType.EMPLOYEE
        || existingByLogin.ownerUserId !== payload.ownerUserId
        || existingByLogin.employeeProfileId !== payload.employeeId)
    ) {
      throw new BadRequestException(
        `Логин "${payload.accountLogin}" уже занят`,
      );
    }

    const passwordHash = await bcrypt.hash(payload.accountPassword, 10);
    const accountByEmployee = await tx.user.findFirst({
      where: {
        actorType: UserActorType.EMPLOYEE,
        ownerUserId: payload.ownerUserId,
        employeeProfileId: payload.employeeId,
      },
      select: { id: true },
    });

    if (accountByEmployee) {
      return tx.user.update({
        where: { id: accountByEmployee.id },
        data: {
          login: payload.accountLogin,
          email: payload.employeeEmail,
          password: passwordHash,
          visiblePassword: payload.accountPassword,
          actorType: UserActorType.EMPLOYEE,
          ownerUserId: payload.ownerUserId,
          employeeProfileId: payload.employeeId,
        },
      });
    }

    return tx.user.create({
      data: {
        login: payload.accountLogin,
        email: payload.employeeEmail,
        password: passwordHash,
        visiblePassword: payload.accountPassword,
        actorType: UserActorType.EMPLOYEE,
        ownerUserId: payload.ownerUserId,
        employeeProfileId: payload.employeeId,
      },
    });
  }

  private async ensurePositionAccess(positionId: number, userId: number) {
    const position = await this.prisma.position.findUnique({
      where: { id: positionId },
      select: { id: true, userId: true },
    });

    if (!position || position.userId !== userId) {
      throw new ForbiddenException(
        'Нельзя назначить сотруднику чужую должность',
      );
    }
  }

  private async ensureRoleAccess(roleId: number, userId: number) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, userId: true },
    });

    if (!role || role.userId !== userId) {
      throw new ForbiddenException('Нельзя назначить сотруднику чужую роль');
    }
  }

  async create(dto: CreateEmployeeDto, userId: number) {
    if (dto.positionId !== undefined) {
      await this.ensurePositionAccess(dto.positionId, userId);
    }
    if (dto.roleId !== undefined && dto.roleId !== null) {
      await this.ensureRoleAccess(dto.roleId, userId);
    }

    const accountLogin = this.normalizeOptionalCredential(dto.accountLogin);
    const accountPassword = this.normalizeOptionalCredential(dto.accountPassword);

    if ((accountLogin && !accountPassword) || (!accountLogin && accountPassword)) {
      throw new BadRequestException(
        'Для создания аккаунта сотрудника укажите и логин, и пароль',
      );
    }

    const createdEmployee = await this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          address: dto.address,
          birthDate: new Date(dto.birthDate),
          hireDate: new Date(dto.hireDate),
          positionId: dto.positionId ?? null,
          roleId: dto.roleId ?? null,
          userId,
          ...this.normalizePermissionsForCreate(dto.permissions),
        },
      });

      if (accountLogin && accountPassword) {
        await this.upsertEmployeeAccount(tx, {
          ownerUserId: userId,
          employeeId: employee.id,
          employeeEmail: dto.email,
          accountLogin,
          accountPassword,
        });
      }

      return employee;
    });

    return this.prisma.employee.findUnique({
      where: { id: createdEmployee.id },
      include: this.employeeWithRelationsInclude,
    });
  }

  async findAll(userId: number) {
    return this.prisma.employee.findMany({
      where: { userId },
      include: this.employeeWithRelationsInclude,
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number, userId: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: this.employeeWithRelationsInclude,
    });
    if (!employee)
      throw new NotFoundException(`Сотрудник с id ${id} не найден`);
    if (employee.userId !== userId)
      throw new ForbiddenException('Нет доступа к этому сотруднику');

    return employee;
  }

  async update(id: number, dto: UpdateEmployeeDto, userId: number) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee)
      throw new NotFoundException(`Сотрудник с id ${id} не найден`);
    if (employee.userId !== userId)
      throw new ForbiddenException('Нет доступа к этому сотруднику');

    if (dto.positionId !== undefined && dto.positionId !== null) {
      await this.ensurePositionAccess(dto.positionId, userId);
    }
    if (dto.roleId !== undefined && dto.roleId !== null) {
      await this.ensureRoleAccess(dto.roleId, userId);
    }

    const accountLogin = this.normalizeOptionalCredential(dto.accountLogin);
    const accountPassword = this.normalizeOptionalCredential(dto.accountPassword);

    const updatedEmployee = await this.prisma.$transaction(async (tx) => {
      const employeeData: Prisma.EmployeeUncheckedUpdateInput = {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
        ...this.normalizePermissionsForUpdate(dto.permissions, employee),
      };

      if (dto.positionId !== undefined) {
        employeeData.positionId = dto.positionId;
      }
      if (dto.roleId !== undefined) {
        employeeData.roleId = dto.roleId;
      }

      const updated = await tx.employee.update({
        where: { id },
        data: employeeData,
      });

      const existingAccount = await tx.user.findFirst({
        where: {
          actorType: UserActorType.EMPLOYEE,
          ownerUserId: userId,
          employeeProfileId: id,
        },
        select: {
          id: true,
          login: true,
          visiblePassword: true,
        },
      });

      const hasCredentialsInDto =
        dto.accountLogin !== undefined || dto.accountPassword !== undefined;

      if (hasCredentialsInDto) {
        const loginToSave = accountLogin ?? existingAccount?.login;
        const passwordToSave = accountPassword ?? existingAccount?.visiblePassword ?? undefined;

        if (!loginToSave || !passwordToSave) {
          throw new BadRequestException(
            'Для изменения учетных данных требуется логин и пароль',
          );
        }

        await this.upsertEmployeeAccount(tx, {
          ownerUserId: userId,
          employeeId: id,
          employeeEmail: updated.email,
          accountLogin: loginToSave,
          accountPassword: passwordToSave,
        });
      } else if (existingAccount && dto.email !== undefined) {
        await tx.user.update({
          where: { id: existingAccount.id },
          data: { email: updated.email },
        });
      }

      return updated;
    });

    return this.prisma.employee.findUnique({
      where: { id: updatedEmployee.id },
      include: this.employeeWithRelationsInclude,
    });
  }

  async remove(id: number, userId: number) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee)
      throw new NotFoundException(`Сотрудник с id ${id} не найден`);
    if (employee.userId !== userId)
      throw new ForbiddenException('Нет доступа к этому сотруднику');

    await this.prisma.user.deleteMany({
      where: {
        actorType: UserActorType.EMPLOYEE,
        ownerUserId: userId,
        employeeProfileId: id,
      },
    });

    await this.prisma.task.updateMany({
      where: {
        userId,
        OR: [{ employeeId: id }, { responsibleEmployeeId: id }],
      },
      data: {
        employeeId: null,
        responsibleEmployeeId: null,
      },
    });

    await this.prisma.process.updateMany({
      where: {
        userId,
        OR: [{ employeeId: id }, { responsibleEmployeeId: id }],
      },
      data: {
        employeeId: null,
        responsibleEmployeeId: null,
      },
    });

    return this.prisma.employee.delete({ where: { id } });
  }
}
