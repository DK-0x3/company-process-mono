import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateTaskDataDto } from './dto/create-task-data.dto';

@Injectable()
export class TaskDataService {
  constructor(private prisma: PrismaService) {}

  private taskDataInclude = {
    task: {
      select: { id: true, name: true, userId: true },
    },
    dataObject: true,
  } satisfies Prisma.TaskDataInclude;

  private handlePrismaError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError
      && error.code === 'P2002'
    ) {
      throw new ConflictException('Такая связь задачи и данных уже существует');
    }
    throw error;
  }

  private async ensureTaskAccess(taskId: number, userId: number) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, userId: true },
    });

    if (!task || task.userId !== userId) {
      throw new ForbiddenException('Нет доступа к указанной задаче');
    }
  }

  private async ensureDataObjectAccess(dataObjectId: number, userId: number) {
    const dataObject = await this.prisma.dataObject.findUnique({
      where: { id: dataObjectId },
      select: { id: true, userId: true },
    });

    if (!dataObject || dataObject.userId !== userId) {
      throw new ForbiddenException('Нет доступа к указанному объекту данных');
    }
  }

  async create(dto: CreateTaskDataDto, userId: number) {
    await this.ensureTaskAccess(dto.taskId, userId);
    await this.ensureDataObjectAccess(dto.dataObjectId, userId);

    try {
      return await this.prisma.taskData.create({
        data: {
          taskId: dto.taskId,
          dataObjectId: dto.dataObjectId,
          type: dto.type,
        },
        include: this.taskDataInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll(userId: number, taskId?: number) {
    return this.prisma.taskData.findMany({
      where: {
        task: {
          userId,
          ...(taskId !== undefined ? { id: taskId } : {}),
        },
      },
      include: this.taskDataInclude,
      orderBy: { id: 'asc' },
    });
  }

  async remove(id: number, userId: number) {
    const link = await this.prisma.taskData.findUnique({
      where: { id },
      include: {
        task: {
          select: { userId: true },
        },
      },
    });

    if (!link) {
      throw new NotFoundException(`Связь TaskData с id ${id} не найдена`);
    }
    if (link.task.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этой связи');
    }

    return this.prisma.taskData.delete({ where: { id } });
  }
}
