import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ComponentType,
  ProcessComponent,
  TaskComponent,
  ArrowComponent,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  BatchUpdatePositionsDto,
  UpdateComponentDto,
  CreateProcessComponentDto,
  CreateTaskComponentDto,
  CreateArrowDto,
  CreateFullSchemeDto,
} from './dto/scheme.dto';

// Интерфейс ответа для метода получения схемы
// Явное объявление типа убирает ошибку "Unsafe return"
export interface SchemeResponse {
  processes: (ProcessComponent & { process: unknown })[];
  tasks: (TaskComponent & { task: unknown })[];
  arrows: ArrowComponent[];
}

// Добавляем интерфейс для карты ID, чтобы ESLint не ругался
interface IdMap {
  process: Record<number, number>; // processId -> ComponentId
  task: Record<number, number>; // taskId -> ComponentId
}

interface SourceProcessRow {
  id: number;
  name: string;
  parentId: number | null;
}

interface SourceTaskRow {
  id: number;
  name: string;
  processId: number;
}

@Injectable()
export class SchemeService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureOwnerProcessAccess(
    ownerProcessId: number,
    userId: number,
  ): Promise<void> {
    const ownerProcess = await this.prisma.process.findUnique({
      where: { id: ownerProcessId },
      select: { id: true, userId: true },
    });

    if (!ownerProcess) {
      throw new NotFoundException(
        `Процесс-владелец с id ${ownerProcessId} не найден`,
      );
    }
    if (ownerProcess.userId !== userId) {
      throw new ForbiddenException('Нет доступа к схеме этого процесса');
    }
  }

  private async ensureTaskAccess(taskId: number, userId: number): Promise<void> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, userId: true },
    });

    if (!task || task.userId !== userId) {
      throw new ForbiddenException('Нет доступа к указанной задаче');
    }
  }

  private async ensureProcessAccess(
    processId: number,
    userId: number,
  ): Promise<void> {
    const process = await this.prisma.process.findUnique({
      where: { id: processId },
      select: { id: true, userId: true },
    });

    if (!process || process.userId !== userId) {
      throw new ForbiddenException('Нет доступа к указанному процессу');
    }
  }

  private async ensureComponentOwnership(
    ownerProcessId: number,
    componentId: number,
    type: ComponentType,
  ): Promise<number> {
    if (type === ComponentType.PROCESS) {
      const byComponentId = await this.prisma.processComponent.findFirst({
        where: {
          ownerProcessId,
          id: componentId,
        },
        select: { id: true },
      });
      if (byComponentId) {
        return byComponentId.id;
      }

      const byProcessId = await this.prisma.processComponent.findFirst({
        where: {
          ownerProcessId,
          processId: componentId,
        },
        select: { id: true },
      });
      if (byProcessId) {
        return byProcessId.id;
      }

      throw new ForbiddenException('Нет доступа к процесс-компоненту на этой схеме');
    }

    if (type === ComponentType.TASK) {
      const byComponentId = await this.prisma.taskComponent.findFirst({
        where: {
          ownerProcessId,
          id: componentId,
        },
        select: { id: true },
      });
      if (byComponentId) {
        return byComponentId.id;
      }

      const byTaskId = await this.prisma.taskComponent.findFirst({
        where: {
          ownerProcessId,
          taskId: componentId,
        },
        select: { id: true },
      });
      if (byTaskId) {
        return byTaskId.id;
      }

      throw new ForbiddenException('Нет доступа к task-компоненту на этой схеме');
    }

    if (type === ComponentType.ARROW) {
      const exists = await this.prisma.arrowComponent.findFirst({
        where: {
          id: componentId,
          ownerProcessId,
        },
        select: { id: true },
      });
      if (!exists) {
        throw new ForbiddenException('Нет доступа к стрелке на этой схеме');
      }
      return exists.id;
    }

    throw new BadRequestException(`Unknown component type: ${type}`);
  }

  private async ensureArrowDotOwnership(
    ownerProcessId: number,
    dot: CreateArrowDto['fromDot'] | CreateArrowDto['toDot'],
  ): Promise<CreateArrowDto['fromDot'] | CreateArrowDto['toDot']> {
    if (dot.parentComponentType === ComponentType.PROCESS) {
      const resolvedId = await this.ensureComponentOwnership(
        ownerProcessId,
        dot.parentComponentId,
        ComponentType.PROCESS,
      );
      return { ...dot, parentComponentId: resolvedId };
    }

    if (dot.parentComponentType === ComponentType.TASK) {
      const resolvedId = await this.ensureComponentOwnership(
        ownerProcessId,
        dot.parentComponentId,
        ComponentType.TASK,
      );
      return { ...dot, parentComponentId: resolvedId };
    }

    throw new BadRequestException(
      'Для стрелки поддерживаются только PROCESS и TASK компоненты',
    );
  }

  private estimateComponentWidth(title: string): number {
    // Грубая оценка ширины блока в "мировых" ячейках,
    // чтобы автоматически добавленные элементы не схлопывались.
    return Math.max(3, Math.min(20, Math.ceil((title?.length ?? 0) / 3) + 2));
  }

  private async collectOwnerSubtreeSource(
    ownerProcessId: number,
    userId: number,
  ): Promise<{ processes: SourceProcessRow[]; tasks: SourceTaskRow[] }> {
    const allUserProcesses = await this.prisma.process.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        parentId: true,
      },
    });

    const childrenMap = new Map<number, number[]>();
    for (const process of allUserProcesses) {
      if (!process.parentId) continue;
      const list = childrenMap.get(process.parentId) ?? [];
      list.push(process.id);
      childrenMap.set(process.parentId, list);
    }

    const subtreeIds = new Set<number>();
    const stack = [ownerProcessId];

    while (stack.length > 0) {
      const currentId = stack.pop() as number;
      if (subtreeIds.has(currentId)) continue;
      subtreeIds.add(currentId);

      const children = childrenMap.get(currentId) ?? [];
      children.forEach((childId) => stack.push(childId));
    }

    const processes = allUserProcesses.filter((process) =>
      subtreeIds.has(process.id),
    );
    const processIds = processes.map((process) => process.id);

    const tasks =
      processIds.length === 0
        ? []
        : await this.prisma.task.findMany({
            where: {
              userId,
              processId: { in: processIds },
            },
            select: {
              id: true,
              name: true,
              processId: true,
            },
          });

    return { processes, tasks };
  }

  private async reconcileSchemeComponents(
    ownerProcessId: number,
    userId: number,
  ): Promise<void> {
    const source = await this.collectOwnerSubtreeSource(ownerProcessId, userId);
    const validProcessIds = new Set(source.processes.map((process) => process.id));
    const validTaskIds = new Set(source.tasks.map((task) => task.id));

    const [existingProcessComponents, existingTaskComponents] = await Promise.all([
      this.prisma.processComponent.findMany({
        where: { ownerProcessId },
        select: {
          id: true,
          processId: true,
          x: true,
          y: true,
          width: true,
          height: true,
        },
      }),
      this.prisma.taskComponent.findMany({
        where: { ownerProcessId },
        select: {
          id: true,
          taskId: true,
          x: true,
          y: true,
          width: true,
          height: true,
        },
      }),
    ]);

    const staleProcessComponentIds = existingProcessComponents
      .filter((component) => !validProcessIds.has(component.processId))
      .map((component) => component.id);
    const staleTaskComponentIds = existingTaskComponents
      .filter((component) => !validTaskIds.has(component.taskId))
      .map((component) => component.id);

    const existingProcessIds = new Set(
      existingProcessComponents.map((component) => component.processId),
    );
    const existingTaskIds = new Set(
      existingTaskComponents.map((component) => component.taskId),
    );

    const missingProcesses = source.processes.filter(
      (process) => !existingProcessIds.has(process.id),
    );
    const missingTasks = source.tasks.filter((task) => !existingTaskIds.has(task.id));

    const shouldDeleteStale =
      staleProcessComponentIds.length > 0 || staleTaskComponentIds.length > 0;
    const shouldCreateMissing =
      missingProcesses.length > 0 || missingTasks.length > 0;
    if (!shouldDeleteStale && !shouldCreateMissing) {
      return;
    }

    const staleProcessComponentIdsSet = new Set(staleProcessComponentIds);
    const staleTaskComponentIdsSet = new Set(staleTaskComponentIds);

    const retainedComponentsBottom = [
      ...existingProcessComponents
        .filter((component) => !staleProcessComponentIdsSet.has(component.id))
        .map((component) => component.y + component.height),
      ...existingTaskComponents
        .filter((component) => !staleTaskComponentIdsSet.has(component.id))
        .map((component) => component.y + component.height),
    ];

    const startY =
      retainedComponentsBottom.length > 0
        ? Math.max(...retainedComponentsBottom) + 4
        : -8;
    const columns = 4;
    const stepX = 12;
    const stepY = 6;
    const startX = -24;

    await this.prisma.$transaction(async (tx) => {
      if (shouldDeleteStale) {
        const arrowWhereOr: Prisma.ArrowComponentWhereInput[] = [];

        if (staleProcessComponentIds.length > 0) {
          arrowWhereOr.push(
            { fromProcessComponentId: { in: staleProcessComponentIds } },
            { toProcessComponentId: { in: staleProcessComponentIds } },
          );
        }
        if (staleTaskComponentIds.length > 0) {
          arrowWhereOr.push(
            { fromTaskComponentId: { in: staleTaskComponentIds } },
            { toTaskComponentId: { in: staleTaskComponentIds } },
          );
        }

        if (arrowWhereOr.length > 0) {
          await tx.arrowComponent.deleteMany({
            where: {
              ownerProcessId,
              OR: arrowWhereOr,
            },
          });
        }

        if (staleProcessComponentIds.length > 0) {
          await tx.processComponent.deleteMany({
            where: {
              ownerProcessId,
              id: { in: staleProcessComponentIds },
            },
          });
        }

        if (staleTaskComponentIds.length > 0) {
          await tx.taskComponent.deleteMany({
            where: {
              ownerProcessId,
              id: { in: staleTaskComponentIds },
            },
          });
        }
      }

      for (let index = 0; index < missingProcesses.length; index++) {
        const process = missingProcesses[index];
        const row = Math.floor(index / columns);
        const col = index % columns;

        await tx.processComponent.create({
          data: {
            ownerProcessId,
            processId: process.id,
            x: startX + col * stepX,
            y: startY + row * stepY,
            width: this.estimateComponentWidth(process.name),
            height: 3,
          },
        });
      }

      const taskStartRowOffset = Math.ceil(missingProcesses.length / columns) + 1;
      for (let index = 0; index < missingTasks.length; index++) {
        const task = missingTasks[index];
        const row = Math.floor(index / columns);
        const col = index % columns;

        await tx.taskComponent.create({
          data: {
            ownerProcessId,
            taskId: task.id,
            x: startX + col * stepX,
            y: startY + (taskStartRowOffset + row) * stepY,
            width: this.estimateComponentWidth(task.name),
            height: 3,
          },
        });
      }
    });
  }

  // 1. Явно указываем возвращаемый тип Promise<SchemeResponse>
  async getSchemeByProcess(
    ownerProcessId: number,
    userId: number,
  ): Promise<SchemeResponse> {
    await this.ensureOwnerProcessAccess(ownerProcessId, userId);
    await this.reconcileSchemeComponents(ownerProcessId, userId);

    // 2. Явно типизируем кортеж Promise.all, чтобы TS не гадал
    const [processes, tasks, arrows] = await Promise.all<
      [
        Promise<(ProcessComponent & { process: unknown })[]>,
        Promise<(TaskComponent & { task: unknown })[]>,
        Promise<ArrowComponent[]>,
      ]
    >([
      this.prisma.processComponent.findMany({
        where: { ownerProcessId },
        include: { process: true },
      }),
      this.prisma.taskComponent.findMany({
        where: { ownerProcessId },
        include: { task: true },
      }),
      this.prisma.arrowComponent.findMany({
        where: { ownerProcessId },
      }),
    ]);

    return { processes, tasks, arrows };
  }

  async addProcessToScheme(
    ownerProcessId: number,
    dto: CreateProcessComponentDto,
    userId: number,
  ): Promise<ProcessComponent> {
    await this.ensureOwnerProcessAccess(ownerProcessId, userId);
    await this.ensureProcessAccess(dto.processId, userId);

    return this.prisma.processComponent.upsert({
      where: {
        ownerProcessId_processId: {
          ownerProcessId,
          processId: dto.processId,
        },
      },
      create: { ...dto, ownerProcessId },
      update: {
        x: dto.x,
        y: dto.y,
        width: dto.width,
        height: dto.height,
      },
    });
  }

  async addTaskToScheme(
    ownerProcessId: number,
    dto: CreateTaskComponentDto,
    userId: number,
  ): Promise<TaskComponent> {
    await this.ensureOwnerProcessAccess(ownerProcessId, userId);
    await this.ensureTaskAccess(dto.taskId, userId);

    return this.prisma.taskComponent.upsert({
      where: {
        ownerProcessId_taskId: {
          ownerProcessId,
          taskId: dto.taskId,
        },
      },
      create: { ...dto, ownerProcessId },
      update: {
        x: dto.x,
        y: dto.y,
        width: dto.width,
        height: dto.height,
      },
    });
  }

  async addArrowToScheme(
    ownerProcessId: number,
    dto: CreateArrowDto,
    userId: number,
  ): Promise<ArrowComponent> {
    await this.ensureOwnerProcessAccess(ownerProcessId, userId);

    const fromDot = await this.ensureArrowDotOwnership(ownerProcessId, dto.fromDot);
    const toDot = await this.ensureArrowDotOwnership(ownerProcessId, dto.toDot);

    return this.prisma.arrowComponent.create({
      data: {
        ownerProcessId,
        fromSide: fromDot.side,
        fromOffset: fromDot.offset,
        fromProcessComponentId:
          fromDot.parentComponentType === ComponentType.PROCESS
            ? fromDot.parentComponentId
            : null,
        fromTaskComponentId:
          fromDot.parentComponentType === ComponentType.TASK
            ? fromDot.parentComponentId
            : null,

        toSide: toDot.side,
        toOffset: toDot.offset,
        toProcessComponentId:
          toDot.parentComponentType === ComponentType.PROCESS
            ? toDot.parentComponentId
            : null,
        toTaskComponentId:
          toDot.parentComponentType === ComponentType.TASK
            ? toDot.parentComponentId
            : null,
      },
    });
  }

  async deleteArrowByDots(
    ownerProcessId: number,
    dto: CreateArrowDto,
    userId: number,
  ) {
    await this.ensureOwnerProcessAccess(ownerProcessId, userId);

    const fromDot = await this.ensureArrowDotOwnership(ownerProcessId, dto.fromDot);
    const toDot = await this.ensureArrowDotOwnership(ownerProcessId, dto.toDot);

    // Формируем условия поиска
    // Нам нужно найти запись, где совпадают ownerId, сторона, оффсет И конкретный ID компонента
    return this.prisma.arrowComponent.deleteMany({
      where: {
        ownerProcessId,

        // Проверка точки ОТКУДА
        fromSide: fromDot.side,
        fromOffset: fromDot.offset,
        // Динамически определяем, по какой колонке искать ID
        ...(fromDot.parentComponentType === ComponentType.PROCESS
          ? { fromProcessComponentId: fromDot.parentComponentId }
          : { fromTaskComponentId: fromDot.parentComponentId }),

        // Проверка точки КУДА
        toSide: toDot.side,
        toOffset: toDot.offset,
        // Динамически определяем, по какой колонке искать ID
        ...(toDot.parentComponentType === ComponentType.PROCESS
          ? { toProcessComponentId: toDot.parentComponentId }
          : { toTaskComponentId: toDot.parentComponentId }),
      },
    });
  }

  async updateComponent(
    ownerProcessId: number,
    id: number,
    type: ComponentType,
    dto: UpdateComponentDto,
    userId: number,
  ): Promise<ProcessComponent | TaskComponent> {
    await this.ensureOwnerProcessAccess(ownerProcessId, userId);

    if (type === ComponentType.PROCESS) {
      try {
        const resolvedId = await this.ensureComponentOwnership(
          ownerProcessId,
          id,
          ComponentType.PROCESS,
        );
        return this.prisma.processComponent.update({
          where: { id: resolvedId },
          data: dto,
        });
      } catch (error) {
        if (!(error instanceof ForbiddenException)) {
          throw error;
        }

        await this.ensureProcessAccess(id, userId);
        return this.prisma.processComponent.upsert({
          where: {
            ownerProcessId_processId: {
              ownerProcessId,
              processId: id,
            },
          },
          create: {
            ownerProcessId,
            processId: id,
            x: dto.x ?? 0,
            y: dto.y ?? 0,
            width: dto.width ?? 8,
            height: dto.height ?? 3,
          },
          update: dto,
        });
      }
    }
    if (type === ComponentType.TASK) {
      try {
        const resolvedId = await this.ensureComponentOwnership(
          ownerProcessId,
          id,
          ComponentType.TASK,
        );
        return this.prisma.taskComponent.update({
          where: { id: resolvedId },
          data: dto,
        });
      } catch (error) {
        if (!(error instanceof ForbiddenException)) {
          throw error;
        }

        await this.ensureTaskAccess(id, userId);
        return this.prisma.taskComponent.upsert({
          where: {
            ownerProcessId_taskId: {
              ownerProcessId,
              taskId: id,
            },
          },
          create: {
            ownerProcessId,
            taskId: id,
            x: dto.x ?? 0,
            y: dto.y ?? 0,
            width: dto.width ?? 8,
            height: dto.height ?? 3,
          },
          update: dto,
        });
      }
    }
    throw new NotFoundException(`Component type ${type} cannot be updated`);
  }

  // САМОЕ ПРОБЛЕМНОЕ МЕСТО
  async batchUpdatePositions(
    ownerProcessId: number,
    dto: BatchUpdatePositionsDto,
    userId: number,
  ): Promise<Array<ProcessComponent | TaskComponent>> {
    await this.ensureOwnerProcessAccess(ownerProcessId, userId);

    // 1. Создаем пустой массив, ЯВНО указывая тип элементов.
    // Это ключевой момент: мы говорим TS, что тут будут PrismaPromise, которые вернут Компоненты.
    const promises: Prisma.PrismaPromise<ProcessComponent | TaskComponent>[] =
      [];

    // 2. Используем цикл for...of вместо map, чтобы не полагаться на инференс возвращаемого значения map
    for (const comp of dto.components) {
      const resolvedId = await this.ensureComponentOwnership(
        ownerProcessId,
        comp.id,
        comp.type,
      );
      const where = { id: resolvedId, ownerProcessId };
      const data = { x: comp.x, y: comp.y };

      if (comp.type === ComponentType.PROCESS) {
        promises.push(this.prisma.processComponent.update({ where, data }));
      } else {
        promises.push(this.prisma.taskComponent.update({ where, data }));
      }
    }

    // 3. Теперь передаем в транзакцию строго типизированный массив
    return this.prisma.$transaction(promises);
  }

  async deleteComponent(
    ownerProcessId: number,
    id: number,
    type: ComponentType,
    userId: number,
  ): Promise<ProcessComponent | TaskComponent | ArrowComponent> {
    await this.ensureOwnerProcessAccess(ownerProcessId, userId);
    const resolvedId = await this.ensureComponentOwnership(ownerProcessId, id, type);

    switch (type) {
      case ComponentType.PROCESS:
        return this.prisma.processComponent.delete({ where: { id: resolvedId } });
      case ComponentType.TASK:
        return this.prisma.taskComponent.delete({ where: { id: resolvedId } });
      case ComponentType.ARROW:
        return this.prisma.arrowComponent.delete({ where: { id: resolvedId } });
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new NotFoundException(`Unknown type: ${type}`);
    }
  }

  async createFullScheme(
    ownerProcessId: number,
    dto: CreateFullSchemeDto,
    userId: number,
  ): Promise<SchemeResponse> {
    await this.ensureOwnerProcessAccess(ownerProcessId, userId);
    await Promise.all(
      dto.processes.map((process) =>
        this.ensureProcessAccess(process.processId, userId),
      ),
    );
    await Promise.all(
      dto.tasks.map((task) => this.ensureTaskAccess(task.taskId, userId)),
    );

    return this.prisma.$transaction(async (tx) => {
      // 1. Очищаем старую схему (опционально, но логично для "полного сохранения")
      // Если это именно "первое создание", удаление ничего не сломает, но гарантирует чистоту
      await tx.arrowComponent.deleteMany({ where: { ownerProcessId } });
      await tx.processComponent.deleteMany({ where: { ownerProcessId } });
      await tx.taskComponent.deleteMany({ where: { ownerProcessId } });

      const idMap: IdMap = { process: {}, task: {} };
      const createdProcesses: (ProcessComponent & { process: unknown })[] = [];
      const createdTasks: (TaskComponent & { task: unknown })[] = [];

      // 2. Создаем ProcessComponents и заполняем карту ID
      for (const pDto of dto.processes) {
        const comp = await tx.processComponent.create({
          data: { ...pDto, ownerProcessId },
          include: { process: true }, // include нужен для возврата SchemeResponse
        });
        // Сохраняем связь: Бизнес ID -> Новый ID компонента
        idMap.process[pDto.processId] = comp.id;
        createdProcesses.push(comp);
      }

      // 3. Создаем TaskComponents и заполняем карту ID
      for (const tDto of dto.tasks) {
        const comp = await tx.taskComponent.create({
          data: { ...tDto, ownerProcessId },
          include: { task: true },
        });
        idMap.task[tDto.taskId] = comp.id;
        createdTasks.push(comp);
      }

      // 4. Создаем ArrowComponents, подменяя ID на лету
      const createdArrows: ArrowComponent[] = [];

      for (const aDto of dto.arrows) {
        // Определяем ID источника
        const fromMap =
          aDto.fromDot.parentComponentType === ComponentType.PROCESS
            ? idMap.process
            : idMap.task;
        const fromRealId = fromMap[aDto.fromDot.parentComponentId];

        // Определяем ID цели
        const toMap =
          aDto.toDot.parentComponentType === ComponentType.PROCESS
            ? idMap.process
            : idMap.task;
        const toRealId = toMap[aDto.toDot.parentComponentId];

        // Если ID не найдены (например, стрелка ведет в никуда), пропускаем или кидаем ошибку
        if (!fromRealId || !toRealId) {
          // Можно логировать, но лучше пропустить, чтобы не валить транзакцию из-за битой стрелки
          continue;
        }

        const arrow = await tx.arrowComponent.create({
          data: {
            ownerProcessId,
            fromSide: aDto.fromDot.side,
            fromOffset: aDto.fromDot.offset,
            // Подставляем реальные ID, полученные на шагах 2 и 3
            fromProcessComponentId:
              aDto.fromDot.parentComponentType === ComponentType.PROCESS
                ? fromRealId
                : null,
            fromTaskComponentId:
              aDto.fromDot.parentComponentType === ComponentType.TASK
                ? fromRealId
                : null,

            toSide: aDto.toDot.side,
            toOffset: aDto.toDot.offset,
            toProcessComponentId:
              aDto.toDot.parentComponentType === ComponentType.PROCESS
                ? toRealId
                : null,
            toTaskComponentId:
              aDto.toDot.parentComponentType === ComponentType.TASK
                ? toRealId
                : null,
          },
        });
        createdArrows.push(arrow);
      }

      return {
        processes: createdProcesses,
        tasks: createdTasks,
        arrows: createdArrows,
      };
    });
  }
}
