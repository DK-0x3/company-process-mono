import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  private roleWithRelationsInclude = {
    employees: true,
    _count: {
      select: {
        responsibleForProcesses: true,
        responsibleForTasks: true,
      },
    },
  } satisfies Prisma.RoleInclude;

  private handlePrismaError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError
      && error.code === 'P2002'
    ) {
      throw new ConflictException('Роль с таким названием уже существует');
    }
    throw error;
  }

  async create(dto: CreateRoleDto, userId: number) {
    try {
      return await this.prisma.role.create({
        data: {
          name: dto.name,
          description: dto.description,
          userId,
        },
        include: this.roleWithRelationsInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll(userId: number) {
    return this.prisma.role.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
      include: this.roleWithRelationsInclude,
    });
  }

  async findOne(id: number, userId: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: this.roleWithRelationsInclude,
    });

    if (!role) throw new NotFoundException(`Роль с id ${id} не найдена`);
    if (role.userId !== userId)
      throw new ForbiddenException('Нет доступа к этой роли');

    return role;
  }

  async update(id: number, dto: UpdateRoleDto, userId: number) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException(`Роль с id ${id} не найдена`);
    if (role.userId !== userId)
      throw new ForbiddenException('Нет доступа к этой роли');

    try {
      return await this.prisma.role.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
        },
        include: this.roleWithRelationsInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number, userId: number) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException(`Роль с id ${id} не найдена`);
    if (role.userId !== userId)
      throw new ForbiddenException('Нет доступа к этой роли');

    const [, , , deletedRole] = await this.prisma.$transaction([
      this.prisma.employee.updateMany({
        where: { userId, roleId: id },
        data: { roleId: null },
      }),
      this.prisma.process.updateMany({
        where: { userId, responsibleRoleId: id },
        data: { responsibleRoleId: null },
      }),
      this.prisma.task.updateMany({
        where: { userId, responsibleRoleId: id },
        data: { responsibleRoleId: null },
      }),
      this.prisma.role.delete({ where: { id } }),
    ]);

    return deletedRole;
  }
}
