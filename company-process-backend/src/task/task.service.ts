import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService) {}

  private taskWithRelationsInclude = {
    process: true,
    employee: {
      include: { position: true, role: true },
    },
    responsibleEmployee: {
      include: { position: true, role: true },
    },
    responsiblePosition: true,
    responsibleRole: true,
    taskData: {
      include: { dataObject: true },
    },
    taskMaterials: {
      include: {
        material: {
          select: {
            id: true,
            name: true,
            categoryId: true,
          },
        },
      },
    },
  } satisfies Prisma.TaskInclude;

  private normalizeIds(ids?: number[]) {
    if (!ids) return [];
    return Array.from(new Set(ids.filter((id) => Number.isInteger(id) && id > 0)));
  }

  private resolveResponsibleEmployeeId(dto: CreateTaskDto | UpdateTaskDto) {
    return dto.responsibleEmployeeId !== undefined
      ? dto.responsibleEmployeeId
      : dto.employeeId;
  }

  private resolveResponsiblePositionId(dto: CreateTaskDto | UpdateTaskDto) {
    return dto.responsiblePositionId;
  }

  private async ensureProcessAccess(processId: number, userId: number) {
    const process = await this.prisma.process.findUnique({
      where: { id: processId },
      select: { id: true, userId: true },
    });

    if (!process || process.userId !== userId) {
      throw new ForbiddenException('Нельзя добавить задачу в чужой процесс');
    }
  }

  private async ensureEmployeeAccess(employeeId: number, userId: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, userId: true },
    });

    if (!employee || employee.userId !== userId) {
      throw new ForbiddenException('Нельзя назначить задачу чужому сотруднику');
    }
  }

  private async ensureRoleAccess(roleId: number, userId: number) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, userId: true },
    });

    if (!role || role.userId !== userId) {
      throw new ForbiddenException('Нельзя назначить задаче чужую роль');
    }
  }

  private async ensurePositionAccess(positionId: number, userId: number) {
    const position = await this.prisma.position.findUnique({
      where: { id: positionId },
      select: { id: true, userId: true },
    });

    if (!position || position.userId !== userId) {
      throw new ForbiddenException('Нельзя назначить задаче чужую должность');
    }
  }

  private async ensureMaterialsAccess(materialIds: number[], userId: number) {
    if (materialIds.length === 0) return;

    const materials = await this.prisma.material.findMany({
      where: {
        id: { in: materialIds },
        userId,
      },
      select: { id: true },
    });

    if (materials.length !== materialIds.length) {
      throw new ForbiddenException(
        'Один или несколько материалов недоступны для привязки к задаче',
      );
    }
  }

  async create(dto: CreateTaskDto, userId: number) {
    const responsibleEmployeeId = this.resolveResponsibleEmployeeId(dto);
    let responsiblePositionId = this.resolveResponsiblePositionId(dto);
    await this.ensureProcessAccess(dto.processId, userId);

    if (responsibleEmployeeId !== undefined && responsibleEmployeeId !== null) {
      await this.ensureEmployeeAccess(responsibleEmployeeId, userId);
      if (responsiblePositionId === undefined) {
        const employee = await this.prisma.employee.findUnique({
          where: { id: responsibleEmployeeId },
          select: { positionId: true },
        });
        if (!employee?.positionId) {
          throw new ForbiddenException(
            'У выбранного сотрудника не задана должность для ответственности задачи',
          );
        }
        responsiblePositionId = employee.positionId;
      }
    }

    if (responsiblePositionId !== undefined && responsiblePositionId !== null) {
      await this.ensurePositionAccess(responsiblePositionId, userId);
    }

    if (dto.responsibleRoleId !== undefined && dto.responsibleRoleId !== null) {
      await this.ensureRoleAccess(dto.responsibleRoleId, userId);
    }

    const materialIds = this.normalizeIds(dto.materialIds);
    await this.ensureMaterialsAccess(materialIds, userId);

    const createdTask = await this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          name: dto.name,
          description: dto.description,
          type: dto.type,
          processId: dto.processId,
          userId,
          employeeId: responsibleEmployeeId ?? null,
          responsibleEmployeeId: responsibleEmployeeId ?? null,
          responsiblePositionId: responsiblePositionId ?? null,
          responsibleRoleId: dto.responsibleRoleId ?? null,
        },
      });

      if (materialIds.length > 0) {
        await tx.taskMaterial.createMany({
          data: materialIds.map((materialId) => ({
            taskId: task.id,
            materialId,
          })),
        });
      }

      return task;
    });

    return this.prisma.task.findUniqueOrThrow({
      where: { id: createdTask.id },
      include: this.taskWithRelationsInclude,
    });
  }

  async findAll(userId: number) {
    return this.prisma.task.findMany({
      where: { userId },
      include: this.taskWithRelationsInclude,
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number, userId: number) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: this.taskWithRelationsInclude,
    });

    if (!task) throw new NotFoundException(`Задача с id ${id} не найдена`);
    if (task.userId !== userId)
      throw new ForbiddenException('Нет доступа к этой задаче');

    return task;
  }

  async update(id: number, dto: UpdateTaskDto, userId: number) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException(`Задача с id ${id} не найдена`);
    if (task.userId !== userId)
      throw new ForbiddenException('Нет доступа к этой задаче');

    const responsibleEmployeeId = this.resolveResponsibleEmployeeId(dto);
    let responsiblePositionId = this.resolveResponsiblePositionId(dto);

    if (dto.processId !== undefined) {
      await this.ensureProcessAccess(dto.processId, userId);
    }

    if (responsibleEmployeeId !== undefined && responsibleEmployeeId !== null) {
      await this.ensureEmployeeAccess(responsibleEmployeeId, userId);
      if (responsiblePositionId === undefined) {
        const employee = await this.prisma.employee.findUnique({
          where: { id: responsibleEmployeeId },
          select: { positionId: true },
        });
        if (!employee?.positionId) {
          throw new ForbiddenException(
            'У выбранного сотрудника не задана должность для ответственности задачи',
          );
        }
        responsiblePositionId = employee.positionId;
      }
    }

    if (responsiblePositionId !== undefined && responsiblePositionId !== null) {
      await this.ensurePositionAccess(responsiblePositionId, userId);
    }

    if (dto.responsibleRoleId !== undefined && dto.responsibleRoleId !== null) {
      await this.ensureRoleAccess(dto.responsibleRoleId, userId);
    }

    const hasMaterialIds = dto.materialIds !== undefined;
    const materialIds = this.normalizeIds(dto.materialIds);
    if (hasMaterialIds) {
      await this.ensureMaterialsAccess(materialIds, userId);
    }

    const data: Prisma.TaskUncheckedUpdateInput = {
      name: dto.name,
      description: dto.description,
      type: dto.type,
      processId: dto.processId,
    };

    if (responsibleEmployeeId !== undefined) {
      data.employeeId = responsibleEmployeeId;
      data.responsibleEmployeeId = responsibleEmployeeId;
    }
    if (responsiblePositionId !== undefined) {
      data.responsiblePositionId = responsiblePositionId;
      if (responsibleEmployeeId === undefined) {
        data.employeeId = null;
        data.responsibleEmployeeId = null;
      }
    }
    if (dto.responsibleRoleId !== undefined) {
      data.responsibleRoleId = dto.responsibleRoleId;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id },
        data,
      });

      if (hasMaterialIds) {
        await tx.taskMaterial.deleteMany({ where: { taskId: id } });
        if (materialIds.length > 0) {
          await tx.taskMaterial.createMany({
            data: materialIds.map((materialId) => ({
              taskId: id,
              materialId,
            })),
          });
        }
      }
    });

    return this.prisma.task.findUniqueOrThrow({
      where: { id },
      include: this.taskWithRelationsInclude,
    });
  }

  async remove(id: number, userId: number) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException(`Задача с id ${id} не найдена`);
    if (task.userId !== userId)
      throw new ForbiddenException('Нет доступа к этой задаче');

    await this.prisma.taskData.deleteMany({
      where: { taskId: id },
    });

    await this.prisma.taskMaterial.deleteMany({
      where: { taskId: id },
    });

    return this.prisma.task.delete({ where: { id } });
  }

  async generateTaskPassport(id: number, userId: number) {
    const task = await this.findOne(id, userId);

    const [taskComponents, arrows, responsibleEmployees] = await Promise.all([
      this.prisma.taskComponent.findMany({
        where: { ownerProcessId: task.processId },
        include: {
          task: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.arrowComponent.findMany({
        where: { ownerProcessId: task.processId },
        select: {
          id: true,
          fromTaskComponentId: true,
          toTaskComponentId: true,
        },
      }),
      task.responsiblePositionId
        ? this.prisma.employee.findMany({
            where: {
              userId,
              positionId: task.responsiblePositionId,
            },
            select: {
              id: true,
              fullName: true,
              email: true,
            },
            orderBy: { id: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    const componentByTaskId = new Map(taskComponents.map((component) => [component.taskId, component]));
    const componentById = new Map(taskComponents.map((component) => [component.id, component]));
    const currentComponent = componentByTaskId.get(task.id);

    const previousTaskMap = new Map<number, { id: number; name: string }>();
    const nextTaskMap = new Map<number, { id: number; name: string }>();

    if (currentComponent) {
      for (const arrow of arrows) {
        if (
          arrow.toTaskComponentId
          && arrow.toTaskComponentId === currentComponent.id
          && arrow.fromTaskComponentId
        ) {
          const prevComponent = componentById.get(arrow.fromTaskComponentId);
          if (prevComponent?.task) {
            previousTaskMap.set(prevComponent.task.id, prevComponent.task);
          }
        }

        if (
          arrow.fromTaskComponentId
          && arrow.fromTaskComponentId === currentComponent.id
          && arrow.toTaskComponentId
        ) {
          const nextComponent = componentById.get(arrow.toTaskComponentId);
          if (nextComponent?.task) {
            nextTaskMap.set(nextComponent.task.id, nextComponent.task);
          }
        }
      }
    }

    const inputs = (task.taskData ?? [])
      .filter((item) => item.type === 'input')
      .map((item) => ({
        dataObjectId: item.dataObjectId,
        name: item.dataObject?.name ?? `ID ${item.dataObjectId}`,
      }));

    const outputs = (task.taskData ?? [])
      .filter((item) => item.type === 'output')
      .map((item) => ({
        dataObjectId: item.dataObjectId,
        name: item.dataObject?.name ?? `ID ${item.dataObjectId}`,
      }));

    const responsibilityLabels: string[] = [];
    if (task.responsiblePosition?.name) {
      responsibilityLabels.push(`должность: ${task.responsiblePosition.name}`);
    } else if (task.responsiblePositionId) {
      responsibilityLabels.push(`должность #${task.responsiblePositionId}`);
    }

    if (task.responsibleRole?.name) {
      responsibilityLabels.push(`роль: ${task.responsibleRole.name}`);
    } else if (task.responsibleRoleId) {
      responsibilityLabels.push(`роль #${task.responsibleRoleId}`);
    }

    return {
      id: task.id,
      name: task.name,
      description: task.description ?? null,
      type: task.type,
      process: {
        id: task.process.id,
        name: task.process.name,
      },
      responsible: {
        employeeId: task.responsibleEmployeeId ?? task.employeeId ?? null,
        positionId: task.responsiblePositionId ?? null,
        roleId: task.responsibleRoleId ?? null,
        label:
          responsibilityLabels.length > 0
            ? responsibilityLabels.join(', ')
            : 'ответственный не задан',
        employeesByPosition: responsibleEmployees,
      },
      inputs,
      outputs,
      previousTasks: Array.from(previousTaskMap.values()),
      nextTasks: Array.from(nextTaskMap.values()),
      updatedAt: task.updatedAt.toISOString(),
    };
  }
}
