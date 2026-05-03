import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

@Injectable()
export class PositionService {
  constructor(private prisma: PrismaService) {}

  private positionWithRelationsInclude = {
    employees: {
      include: {
        role: true,
      },
    },
    responsibleProcesses: {
      select: {
        id: true,
        name: true,
        isActive: true,
        version: true,
      },
    },
    responsibleTasks: {
      select: {
        id: true,
        name: true,
        type: true,
        processId: true,
      },
    },
  } satisfies Prisma.PositionInclude;

  async create(dto: CreatePositionDto, userId: number) {
    return this.prisma.position.create({
      data: {
        name: dto.name,
        userId,
      },
      include: this.positionWithRelationsInclude,
    });
  }

  async findAll(userId: number) {
    return this.prisma.position.findMany({
      where: { userId },
      include: this.positionWithRelationsInclude,
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number, userId: number) {
    const position = await this.prisma.position.findUnique({
      where: { id },
      include: this.positionWithRelationsInclude,
    });
    if (!position)
      throw new NotFoundException(`Должность с id ${id} не найдена`);
    if (position.userId !== userId)
      throw new ForbiddenException('Нет доступа к этой должности');
    return position;
  }

  async update(id: number, dto: UpdatePositionDto, userId: number) {
    const position = await this.prisma.position.findUnique({ where: { id } });
    if (!position)
      throw new NotFoundException(`Должность с id ${id} не найдена`);
    if (position.userId !== userId)
      throw new ForbiddenException('Нет доступа к этой должности');

    return this.prisma.position.update({
      where: { id },
      data: dto,
      include: this.positionWithRelationsInclude,
    });
  }

  async remove(id: number, userId: number) {
    const position = await this.prisma.position.findUnique({ where: { id } });
    if (!position)
      throw new NotFoundException(`Должность с id ${id} не найдена`);
    if (position.userId !== userId)
      throw new ForbiddenException('Нет доступа к этой должности');

    const [, , , deleted] = await this.prisma.$transaction([
      this.prisma.employee.updateMany({
        where: { userId, positionId: id },
        data: { positionId: null },
      }),
      this.prisma.process.updateMany({
        where: { userId, responsiblePositionId: id },
        data: { responsiblePositionId: null },
      }),
      this.prisma.task.updateMany({
        where: { userId, responsiblePositionId: id },
        data: { responsiblePositionId: null },
      }),
      this.prisma.position.delete({ where: { id } }),
    ]);

    return deleted;
  }
}
