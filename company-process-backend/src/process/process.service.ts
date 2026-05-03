import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { existsSync } from 'fs';
import path from 'path';
import { CreateProcessDto } from './dto/create-process.dto';
import { GenerateProcessPdfDto } from './dto/generate-process-pdf.dto';
import { UpdateProcessDto } from './dto/update-process.dto';
import { PrismaService } from '../prisma.service';

export interface ParticipantRow {
  name: string;
  positionId?: number;
  roleId?: number;
  employees?: Array<{
    id: number;
    fullName: string;
    email: string;
  }>;
}

export interface ProcessDescriptionResponse {
  processId: number;
  text: string;
  generatedAt: string;
  steps: string[];
  participants: string[];
}

export interface ProcessPdfResult {
  buffer: Buffer;
  fileName: string;
}

export interface ProcessPassportResponse {
  id: number;
  name: string;
  description: string | null;
  goal: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  responsible: {
    employeeId: number | null;
    positionId: number | null;
    roleId: number | null;
    label: string;
    employeesByPosition: Array<{
      id: number;
      fullName: string;
    }>;
  };
  participants: ParticipantRow[];
  inputs: Array<{
    dataObjectId: number;
    name: string;
  }>;
  outputs: Array<{
    dataObjectId: number;
    name: string;
  }>;
  tasks: Array<{
    id: number;
    name: string;
    type: string;
    responsibleEmployeeId: number | null;
    responsiblePositionId: number | null;
    responsibleRoleId: number | null;
    responsible: string;
  }>;
  diagram: {
    ownerProcessId: number;
    processComponents: number;
    taskComponents: number;
    arrows: number;
  };
}

@Injectable()
export class ProcessService {
  constructor(private prisma: PrismaService) {}

  private processWithRelationsInclude = {
    tasks: {
      include: {
        responsiblePosition: true,
        responsibleRole: true,
      },
    },
    parent: true,
    employee: {
      include: { position: true, role: true },
    },
    responsibleEmployee: {
      include: { position: true, role: true },
    },
    responsiblePosition: true,
    responsibleRole: true,
    processData: {
      include: { dataObject: true },
    },
    processMaterials: {
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
  } satisfies Prisma.ProcessInclude;

  private normalizeIds(ids?: number[]) {
    if (!ids) return [];
    return Array.from(new Set(ids.filter((id) => Number.isInteger(id) && id > 0)));
  }

  private resolveParentId(dto: CreateProcessDto | UpdateProcessDto) {
    return dto.parentProcessId !== undefined ? dto.parentProcessId : dto.parentId;
  }

  private resolveResponsibleEmployeeId(dto: CreateProcessDto | UpdateProcessDto) {
    return dto.responsibleEmployeeId !== undefined
      ? dto.responsibleEmployeeId
      : dto.employeeId;
  }

  private resolveResponsiblePositionId(dto: CreateProcessDto | UpdateProcessDto) {
    return dto.responsiblePositionId;
  }

  private async ensureParentAccess(
    parentId: number,
    userId: number,
    currentProcessId?: number,
  ) {
    if (currentProcessId && parentId === currentProcessId) {
      throw new ForbiddenException('Процесс не может быть родителем самому себе');
    }

    const parent = await this.prisma.process.findUnique({
      where: { id: parentId },
      select: { id: true, parentId: true, userId: true },
    });
    if (!parent) {
      throw new NotFoundException(`Родительский процесс с id ${parentId} не найден`);
    }
    if (parent.userId !== userId) {
      throw new ForbiddenException('Нельзя добавить подпроцесс к чужому процессу');
    }

    if (!currentProcessId) {
      return;
    }

    let cursor = parent.parentId;
    while (cursor !== null) {
      if (cursor === currentProcessId) {
        throw new ForbiddenException('Нельзя создать цикл в иерархии процессов');
      }

      const node = await this.prisma.process.findUnique({
        where: { id: cursor },
        select: { id: true, parentId: true, userId: true },
      });

      if (!node || node.userId !== userId) {
        throw new ForbiddenException('Некорректный родительский процесс');
      }

      cursor = node.parentId;
    }
  }

  private async ensureEmployeeAccess(employeeId: number, userId: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, userId: true },
    });

    if (!employee || employee.userId !== userId) {
      throw new ForbiddenException('Нельзя назначить чужого сотрудника ответственным');
    }
  }

  private async ensureRoleAccess(roleId: number, userId: number) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, userId: true },
    });

    if (!role || role.userId !== userId) {
      throw new ForbiddenException('Нельзя назначить чужую роль ответственной');
    }
  }

  private async ensurePositionAccess(positionId: number, userId: number) {
    const position = await this.prisma.position.findUnique({
      where: { id: positionId },
      select: { id: true, userId: true },
    });

    if (!position || position.userId !== userId) {
      throw new ForbiddenException('Нельзя назначить чужую должность ответственной');
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
        'Один или несколько материалов недоступны для привязки к процессу',
      );
    }
  }

  async create(dto: CreateProcessDto, userId: number) {
    const parentId = this.resolveParentId(dto);
    const responsibleEmployeeId = this.resolveResponsibleEmployeeId(dto);
    let responsiblePositionId = this.resolveResponsiblePositionId(dto);

    if (parentId !== undefined && parentId !== null) {
      await this.ensureParentAccess(parentId, userId);
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
            'У выбранного сотрудника не задана должность для ответственности процесса',
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

    const createdProcess = await this.prisma.$transaction(async (tx) => {
      const process = await tx.process.create({
        data: {
          name: dto.name,
          description: dto.description,
          goal: dto.goal,
          parentId: parentId ?? null,
          userId,
          employeeId: responsibleEmployeeId ?? null,
          responsibleEmployeeId: responsibleEmployeeId ?? null,
          responsiblePositionId: responsiblePositionId ?? null,
          responsibleRoleId: dto.responsibleRoleId ?? null,
          version: dto.version ?? 1,
          isActive: dto.isActive ?? true,
        },
      });

      if (materialIds.length > 0) {
        await tx.processMaterial.createMany({
          data: materialIds.map((materialId) => ({
            processId: process.id,
            materialId,
          })),
        });
      }

      return process;
    });

    return this.prisma.process.findUniqueOrThrow({
      where: { id: createdProcess.id },
      include: this.processWithRelationsInclude,
    });
  }

  async findAllFlat(userId: number) {
    return this.prisma.process.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
      include: this.processWithRelationsInclude,
    });
  }

  async findAllTree(userId: number) {
    const all = await this.prisma.process.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
      include: this.processWithRelationsInclude,
    });

    type ProcessNode = (typeof all)[number] & { children: ProcessNode[] };
    const map = new Map<number, ProcessNode>();
    all.forEach((p) => map.set(p.id, { ...p, children: [] }));

    const tree: ProcessNode[] = [];
    for (const process of all) {
      if (process.parentId) {
        const parent = map.get(process.parentId);
        if (parent) parent.children.push(map.get(process.id)!);
      } else {
        tree.push(map.get(process.id)!);
      }
    }

    return tree;
  }

  async findOne(id: number, userId: number) {
    const process = await this.prisma.process.findUnique({
      where: { id },
      include: this.processWithRelationsInclude,
    });

    if (!process) throw new NotFoundException(`Процесс с id ${id} не найден`);
    if (process.userId !== userId)
      throw new ForbiddenException('Нет доступа к этому процессу');

    return process;
  }

  async update(id: number, dto: UpdateProcessDto, userId: number) {
    const process = await this.prisma.process.findUnique({ where: { id } });
    if (!process) throw new NotFoundException(`Процесс с id ${id} не найден`);
    if (process.userId !== userId)
      throw new ForbiddenException('Нет доступа к этому процессу');

    const parentId = this.resolveParentId(dto);
    const responsibleEmployeeId = this.resolveResponsibleEmployeeId(dto);
    let responsiblePositionId = this.resolveResponsiblePositionId(dto);

    if (parentId !== undefined && parentId !== null) {
      await this.ensureParentAccess(parentId, userId, id);
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
            'У выбранного сотрудника не задана должность для ответственности процесса',
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

    const data: Prisma.ProcessUncheckedUpdateInput = {
      name: dto.name,
      description: dto.description,
      goal: dto.goal,
      version: dto.version,
      isActive: dto.isActive,
    };

    if (parentId !== undefined) {
      data.parentId = parentId;
    }
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
      await tx.process.update({
        where: { id },
        data,
      });

      if (hasMaterialIds) {
        await tx.processMaterial.deleteMany({ where: { processId: id } });
        if (materialIds.length > 0) {
          await tx.processMaterial.createMany({
            data: materialIds.map((materialId) => ({
              processId: id,
              materialId,
            })),
          });
        }
      }
    });

    return this.prisma.process.findUniqueOrThrow({
      where: { id },
      include: this.processWithRelationsInclude,
    });
  }

  async remove(id: number, userId: number) {
    const process = await this.prisma.process.findUnique({
      where: { id },
      include: { children: true, tasks: true },
    });

    if (!process) throw new NotFoundException(`Процесс с id ${id} не найден`);
    if (process.userId !== userId)
      throw new ForbiddenException('Нет доступа к этому процессу');

    // Удаляем все подпроцессы рекурсивно
    for (const child of process.children) {
      await this.remove(child.id, userId);
    }

    await this.prisma.taskData.deleteMany({
      where: {
        task: {
          processId: id,
        },
      },
    });

    await this.prisma.taskMaterial.deleteMany({
      where: {
        task: {
          processId: id,
        },
      },
    });

    // Удаляем все задачи, связанные с этим процессом
    await this.prisma.task.deleteMany({
      where: { processId: id },
    });

    await this.prisma.processMaterial.deleteMany({
      where: { processId: id },
    });

    await this.prisma.processData.deleteMany({
      where: { processId: id },
    });

    // Удаляем сам процесс
    return this.prisma.process.delete({
      where: { id },
    });
  }

  /**
   * Получить дерево подпроцессов данного процесса (вложенные рекурсивно)
   */
  async findSubtree(id: number, userId: number) {
    // Проверяем, что процесс принадлежит пользователю
    const root = await this.prisma.process.findUnique({
      where: { id },
      include: this.processWithRelationsInclude,
    });

    if (!root) throw new NotFoundException(`Процесс с id ${id} не найден`);
    if (root.userId !== userId)
      throw new ForbiddenException('Нет доступа к этому процессу');

    // Получаем все процессы пользователя
    const all = await this.prisma.process.findMany({
      where: { userId },
      include: this.processWithRelationsInclude,
    });

    // Создаём карту для быстрого доступа
    const map = new Map<number, any>();
    all.forEach((p) => map.set(p.id, { ...p, children: [] }));

    // Строим дерево
    for (const process of all) {
      if (process.parentId) {
        const parent = map.get(process.parentId);
        if (parent) parent.children.push(map.get(process.id));
      }
    }

    // Возвращаем поддерево с корнем в указанном id
    const subtree = map.get(id);
    if (!subtree) throw new NotFoundException('Не удалось собрать дерево');

    return subtree;
  }

  /**
   * Получить все подпроцессы данного процесса (списком, без дерева)
   */
  async findSubprocessesAndTasksFlat(id: number, userId: number) {
    // 1. Проверяем корень и доступ
    const root = await this.prisma.process.findUnique({ where: { id } });
    if (!root) throw new NotFoundException(`Процесс с id ${id} не найден`);
    if (root.userId !== userId)
      throw new ForbiddenException('Нет доступа к этому процессу');

    // 2. Загружаем все процессы пользователя (включая задачи и сотрудников)
    const all = await this.prisma.process.findMany({
      where: { userId },
      include: this.processWithRelationsInclude,
    });

    // 3. Строим карту связей
    const childrenMap = new Map<number, number[]>();
    for (const p of all) {
      if (!p.parentId) continue;
      if (!childrenMap.has(p.parentId)) childrenMap.set(p.parentId, []);
      childrenMap.get(p.parentId)!.push(p.id);
    }

    // 4. Собираем ID: начинаем СРАЗУ с текущего процесса (id)
    const resultIds: number[] = [id]; // Добавляем сам процесс в список результатов
    const stack = [id];

    while (stack.length) {
      const current = stack.pop()!;
      const children = childrenMap.get(current) || [];

      for (const childId of children) {
        resultIds.push(childId);
        stack.push(childId);
      }
    }

    // 5. Теперь subprocesses содержит и сам "root" процесс, и всех его потомков
    const subprocesses = all.filter((p) => resultIds.includes(p.id));

    // 6. flatMap соберет задачи из ВСЕХ найденных процессов, включая главный
    const allTasks = subprocesses.flatMap((p) => p.tasks);

    return {
      processes: subprocesses,
      tasks: allTasks,
    };
  }

  async generateProcessDescription(
    id: number,
    userId: number,
  ): Promise<ProcessDescriptionResponse> {
    const process = await this.findOne(id, userId);
    const tasks = process.tasks ?? [];

    const taskGraph = await this.buildTaskGraphForProcess(
      id,
      tasks.map((task) => task.id),
    );
    const orderedTaskIds = this.getOrderedTaskIds(tasks, taskGraph.adjacency);
    const taskById = new Map(tasks.map((task) => [task.id, task]));

    const participants = await this.collectParticipantsForProcess(process, userId);

    const steps = orderedTaskIds
      .map((taskId) => taskById.get(taskId))
      .filter((task): task is NonNullable<typeof task> => Boolean(task))
      .map((task, index) => {
        const outgoingCount = taskGraph.adjacency.get(task.id)?.size ?? 0;
        const typeLabel = this.getTaskTypeLabel(task.type);
        const responsibility = this.formatTaskResponsibility(task);

        let suffix = '';
        if (task.type === 'decision' && outgoingCount > 1) {
          suffix = ', если условие ...';
        } else if (task.type === 'parallel') {
          suffix = ', выполняется параллельно';
        }

        return `${index + 1}. ${task.name} (${typeLabel}; ${responsibility})${suffix}`;
      });

    const participantLines =
      participants.length > 0
        ? participants.map((item) => `- ${item}`).join('\n')
        : '- Не заданы';

    const stepsText = steps.length > 0 ? steps.join('\n') : '1. Шаги процесса не определены';

    const text = [
      `Процесс: ${process.name}`,
      `Цель: ${process.goal ?? '-'}`,
      '',
      'Участники:',
      participantLines,
      '',
      'Описание:',
      stepsText,
    ].join('\n');

    return {
      processId: id,
      text,
      generatedAt: new Date().toISOString(),
      steps,
      participants,
    };
  }

  async generateProcessPassport(
    id: number,
    userId: number,
  ): Promise<ProcessPassportResponse> {
    const process = await this.findOne(id, userId);
    const tasks = process.tasks ?? [];

    const [diagramStats, participants] = await Promise.all([
      this.prisma.$transaction([
        this.prisma.processComponent.count({ where: { ownerProcessId: id } }),
        this.prisma.taskComponent.count({ where: { ownerProcessId: id } }),
        this.prisma.arrowComponent.count({ where: { ownerProcessId: id } }),
      ]),
      this.collectParticipantRowsForPassport(process, userId),
    ]);

    const inputs = (process.processData ?? [])
      .filter((item) => item.type === 'input')
      .map((item) => ({
        dataObjectId: item.dataObjectId,
        name: item.dataObject?.name ?? `ID ${item.dataObjectId}`,
      }));

    const outputs = (process.processData ?? [])
      .filter((item) => item.type === 'output')
      .map((item) => ({
        dataObjectId: item.dataObjectId,
        name: item.dataObject?.name ?? `ID ${item.dataObjectId}`,
      }));

    const responsibleEmployees = process.responsiblePositionId
      ? await this.prisma.employee.findMany({
          where: {
            userId,
            positionId: process.responsiblePositionId,
          },
          select: {
            id: true,
            fullName: true,
          },
          orderBy: { id: 'asc' },
        })
      : [];

    return {
      id: process.id,
      name: process.name,
      description: process.description ?? null,
      goal: process.goal ?? null,
      version: process.version,
      createdAt: process.createdAt.toISOString(),
      updatedAt: process.updatedAt.toISOString(),
      responsible: {
        employeeId: process.responsibleEmployeeId ?? process.employeeId ?? null,
        positionId: process.responsiblePositionId ?? null,
        roleId: process.responsibleRoleId ?? null,
        label: this.formatProcessResponsibility(process),
        employeesByPosition: responsibleEmployees,
      },
      participants,
      inputs,
      outputs,
      tasks: tasks.map((task) => ({
        id: task.id,
        name: task.name,
        type: task.type,
        responsibleEmployeeId: task.responsibleEmployeeId ?? task.employeeId ?? null,
        responsiblePositionId: task.responsiblePositionId ?? null,
        responsibleRoleId: task.responsibleRoleId ?? null,
        responsible: this.formatTaskResponsibility(task),
      })),
      diagram: {
        ownerProcessId: process.id,
        processComponents: diagramStats[0],
        taskComponents: diagramStats[1],
        arrows: diagramStats[2],
      },
    };
  }

  async validateProcess(id: number, userId: number) {
    const process = await this.prisma.process.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!process) {
      throw new NotFoundException(`Процесс с id ${id} не найден`);
    }
    if (process.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этому процессу');
    }

    const [taskComponentsRaw, arrows] = await Promise.all([
      this.prisma.taskComponent.findMany({
        where: { ownerProcessId: id },
        select: {
          id: true,
          taskId: true,
          task: {
            select: {
              id: true,
              name: true,
              type: true,
              responsiblePositionId: true,
              userId: true,
            },
          },
        },
      }),
      this.prisma.arrowComponent.findMany({
        where: { ownerProcessId: id },
        select: {
          id: true,
          fromTaskComponentId: true,
          toTaskComponentId: true,
        },
      }),
    ]);

    const taskComponents = taskComponentsRaw.filter((component) => component.task.userId === userId);

    const tasksById = new Map<number, {
      id: number;
      name: string;
      type: typeof taskComponents[number]['task']['type'];
      responsiblePositionId: number | null;
    }>();

    for (const component of taskComponents) {
      if (!tasksById.has(component.taskId)) {
        tasksById.set(component.taskId, {
          id: component.task.id,
          name: component.task.name,
          type: component.task.type,
          responsiblePositionId: component.task.responsiblePositionId,
        });
      }
    }

    const tasks = Array.from(tasksById.values()).sort((a, b) => a.id - b.id);
    const componentToTask = new Map(taskComponents.map((c) => [c.id, c.taskId]));
    const taskIds = tasks.map((task) => task.id);
    const taskIdSet = new Set(taskIds);

    const startTaskIds = tasks
      .filter((task) => task.type === 'start')
      .map((task) => task.id);
    const endTaskIds = tasks.filter((task) => task.type === 'end').map((task) => task.id);

    const taskIdsWithComponent = new Set(taskComponents.map((c) => c.taskId));
    const tasksWithoutComponentIds = tasks
      .filter((task) => !taskIdsWithComponent.has(task.id))
      .map((task) => task.id);

    const adjacency = new Map<number, Set<number>>();
    const reverseAdjacency = new Map<number, Set<number>>();
    const undirected = new Map<number, Set<number>>();
    const indegree = new Map<number, number>();
    const outdegree = new Map<number, number>();

    for (const taskId of taskIds) {
      adjacency.set(taskId, new Set<number>());
      reverseAdjacency.set(taskId, new Set<number>());
      undirected.set(taskId, new Set<number>());
      indegree.set(taskId, 0);
      outdegree.set(taskId, 0);
    }

    const edgeSet = new Set<string>();
    const ignoredArrowIds: number[] = [];

    for (const arrow of arrows) {
      if (!arrow.fromTaskComponentId || !arrow.toTaskComponentId) {
        ignoredArrowIds.push(arrow.id);
        continue;
      }

      const fromTaskId = componentToTask.get(arrow.fromTaskComponentId);
      const toTaskId = componentToTask.get(arrow.toTaskComponentId);
      if (!fromTaskId || !toTaskId || !taskIdSet.has(fromTaskId) || !taskIdSet.has(toTaskId)) {
        ignoredArrowIds.push(arrow.id);
        continue;
      }

      const edgeKey = `${fromTaskId}->${toTaskId}`;
      if (edgeSet.has(edgeKey)) {
        continue;
      }
      edgeSet.add(edgeKey);

      adjacency.get(fromTaskId)!.add(toTaskId);
      reverseAdjacency.get(toTaskId)!.add(fromTaskId);
      undirected.get(fromTaskId)!.add(toTaskId);
      undirected.get(toTaskId)!.add(fromTaskId);

      outdegree.set(fromTaskId, (outdegree.get(fromTaskId) ?? 0) + 1);
      indegree.set(toTaskId, (indegree.get(toTaskId) ?? 0) + 1);
    }

    const seedTaskId = startTaskIds[0] ?? taskIds[0] ?? null;
    const visited = new Set<number>();

    if (seedTaskId !== null) {
      const stack = [seedTaskId];
      visited.add(seedTaskId);

      while (stack.length > 0) {
        const current = stack.pop()!;
        for (const next of undirected.get(current) ?? []) {
          if (!visited.has(next)) {
            visited.add(next);
            stack.push(next);
          }
        }
      }
    }

    const disconnectedTaskIds = taskIds.filter((taskId) => !visited.has(taskId));

    const isolatedTaskIds = taskIds.filter((taskId) => {
      const inCount = indegree.get(taskId) ?? 0;
      const outCount = outdegree.get(taskId) ?? 0;
      return inCount === 0 && outCount === 0;
    });

    const danglingInputTaskIds = tasks
      .filter((task) => task.type !== 'start' && (indegree.get(task.id) ?? 0) === 0)
      .map((task) => task.id);

    const danglingOutputTaskIds = tasks
      .filter((task) => task.type !== 'end' && (outdegree.get(task.id) ?? 0) === 0)
      .map((task) => task.id);

    const hangingTaskIds = Array.from(
      new Set([...isolatedTaskIds, ...danglingInputTaskIds, ...danglingOutputTaskIds]),
    );

    const canReachEnd = new Set<number>();
    const queue = [...endTaskIds];
    for (const endTaskId of endTaskIds) {
      canReachEnd.add(endTaskId);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const prev of reverseAdjacency.get(current) ?? []) {
        if (!canReachEnd.has(prev)) {
          canReachEnd.add(prev);
          queue.push(prev);
        }
      }
    }

    const sccs = this.findStronglyConnectedComponents(taskIds, adjacency);
    const cycleWithoutExitTaskIds: number[] = [];

    for (const scc of sccs) {
      const hasSelfLoop =
        scc.length === 1 && (adjacency.get(scc[0])?.has(scc[0]) ?? false);
      const isCycle = scc.length > 1 || hasSelfLoop;
      if (!isCycle) {
        continue;
      }

      const hasExitToEnd = scc.some((taskId) => canReachEnd.has(taskId));
      if (!hasExitToEnd) {
        cycleWithoutExitTaskIds.push(...scc);
      }
    }

    const missingResponsiblePositionTaskIds = tasks
      .filter((task) => task.responsiblePositionId === null)
      .map((task) => task.id);

    const checks = {
      hasStart: startTaskIds.length > 0,
      hasEnd: endTaskIds.length > 0,
      allTasksConnected:
        tasks.length > 0
        && tasksWithoutComponentIds.length === 0
        && disconnectedTaskIds.length === 0,
      noHangingTasks: hangingTaskIds.length === 0,
      noCyclesWithoutExit: cycleWithoutExitTaskIds.length === 0,
      allTasksHaveResponsiblePosition: missingResponsiblePositionTaskIds.length === 0,
    };

    const isValid = Object.values(checks).every(Boolean);

    return {
      processId: id,
      isValid,
      checks,
      stats: {
        tasksCount: tasks.length,
        startsCount: startTaskIds.length,
        endsCount: endTaskIds.length,
        arrowsCount: edgeSet.size,
      },
      issues: {
        startTaskIds,
        endTaskIds,
        tasksWithoutComponentIds,
        disconnectedTaskIds,
        hangingTaskIds,
        danglingInputTaskIds,
        danglingOutputTaskIds,
        cycleWithoutExitTaskIds: Array.from(new Set(cycleWithoutExitTaskIds)),
        missingResponsiblePositionTaskIds,
        ignoredArrowIds,
      },
      details: {
        tasks: tasks.map((task) => ({
          id: task.id,
          name: task.name,
          type: task.type,
          indegree: indegree.get(task.id) ?? 0,
          outdegree: outdegree.get(task.id) ?? 0,
          hasResponsiblePosition: task.responsiblePositionId !== null,
        })),
      },
    };
  }

  async generateProcessPdf(
    id: number,
    userId: number,
    dto: GenerateProcessPdfDto,
  ): Promise<ProcessPdfResult> {
    const [process, description, passport, validation] = await Promise.all([
      this.findOne(id, userId),
      this.generateProcessDescription(id, userId),
      this.generateProcessPassport(id, userId),
      this.validateProcess(id, userId),
    ]);

    const fileName = `process-${process.id}-v${process.version}-${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;

    const pdfBuffer = await this.renderProcessPdfDocument({
      companyName: dto?.companyName?.trim() || 'ООО "СтартСет"',
      process,
      description,
      passport,
      validation,
    });

    return {
      buffer: pdfBuffer,
      fileName,
    };
  }

  private resolvePdfFontPath(fileName: string): string | null {
    const variants = [
      path.resolve(
        process.cwd(),
        '../company-process-frontend/public/fonts/ubuntu',
        fileName,
      ),
      path.resolve(
        process.cwd(),
        'company-process-frontend/public/fonts/ubuntu',
        fileName,
      ),
      path.resolve(process.cwd(), 'public/fonts/ubuntu', fileName),
    ];

    for (const fontPath of variants) {
      if (existsSync(fontPath)) {
        return fontPath;
      }
    }

    return null;
  }

  private async renderProcessPdfDocument(payload: {
    companyName: string;
    process: Awaited<ReturnType<ProcessService['findOne']>>;
    description: ProcessDescriptionResponse;
    passport: ProcessPassportResponse;
    validation: Awaited<ReturnType<ProcessService['validateProcess']>>;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (error) => reject(error));

      const regularFontPath = this.resolvePdfFontPath('Ubuntu-Regular.ttf');
      const boldFontPath = this.resolvePdfFontPath('Ubuntu-Bold.ttf');
      const regularFontName = regularFontPath ? 'cp_regular' : 'Helvetica';
      const boldFontName = boldFontPath ? 'cp_bold' : 'Helvetica-Bold';

      if (regularFontPath) {
        doc.registerFont(regularFontName, regularFontPath);
      }
      if (boldFontPath) {
        doc.registerFont(boldFontName, boldFontPath);
      }

      const pageBottom = () => doc.page.height - doc.page.margins.bottom;
      const ensureSpace = (space: number) => {
        if (doc.y + space > pageBottom()) {
          doc.addPage();
          doc.font(regularFontName).fontSize(10);
        }
      };

      const sectionTitle = (title: string) => {
        ensureSpace(36);
        doc.moveDown(0.5);
        doc.font(boldFontName).fontSize(13).text(title);
        doc.moveDown(0.2);
        doc.font(regularFontName).fontSize(10);
      };

      const valueOrDash = (value?: string | null) => value ?? '-';
      const formatDate = (iso: string) =>
        new Date(iso).toLocaleString('ru-RU', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });

      doc.font(boldFontName).fontSize(16).text(payload.companyName, {
        align: 'center',
      });
      doc.moveDown(0.4);
      doc.font(boldFontName).fontSize(18).text(
        `Паспорт процесса: ${payload.process.name}`,
        {
          align: 'center',
        },
      );
      doc.moveDown(1);

      doc.font(regularFontName).fontSize(11);
      doc.text(`Описание: ${valueOrDash(payload.process.description)}`);
      doc.text(`Цель: ${valueOrDash(payload.process.goal)}`);
      doc.text(`Версия: ${payload.process.version}`);
      doc.text(`Дата генерации: ${formatDate(new Date().toISOString())}`);
      doc.text(
        `Последнее обновление процесса: ${formatDate(payload.process.updatedAt.toISOString())}`,
      );

      sectionTitle('Участники');
      if (payload.passport.participants.length > 0) {
        payload.passport.participants.forEach((participant, index) => {
          const employees = participant.employees ?? [];
          const employeesLine =
            employees.length > 0
              ? ` (сотрудники: ${employees.map((employee) => employee.fullName).join(', ')})`
              : '';
          doc.text(`${index + 1}. ${participant.name}${employeesLine}`);
        });
      } else {
        doc.text('Участники не заданы');
      }

      sectionTitle('Входы и выходы процесса');
      const inputs = payload.passport.inputs.map((item) => item.name).join(', ') || '-';
      const outputs = payload.passport.outputs.map((item) => item.name).join(', ') || '-';
      doc.text(`Входные данные: ${inputs}`);
      doc.text(`Выходные данные: ${outputs}`);

      sectionTitle('Текстовое описание шагов');
      if (payload.description.steps.length > 0) {
        payload.description.steps.forEach((step) => doc.text(step));
      } else {
        doc.text('Шаги процесса не определены');
      }

      sectionTitle('Таблица задач');
      const tableX = doc.page.margins.left;
      const columns = [
        {
          key: 'index',
          title: '#',
          width: 28,
        },
        {
          key: 'name',
          title: 'Задача',
          width: 190,
        },
        {
          key: 'type',
          title: 'Тип',
          width: 70,
        },
        {
          key: 'responsible',
          title: 'Ответственная должность/роль',
          width: 227,
        },
      ] as const;

      const drawHeader = () => {
        ensureSpace(28);
        const headerY = doc.y;
        let x = tableX;

        doc.font(boldFontName).fontSize(10);
        for (const column of columns) {
          doc.rect(x, headerY, column.width, 22).stroke();
          doc.text(column.title, x + 4, headerY + 6, {
            width: column.width - 8,
            align: column.key === 'index' ? 'center' : 'left',
          });
          x += column.width;
        }

        doc.font(regularFontName).fontSize(9);
        doc.y = headerY + 22;
      };

      drawHeader();

      payload.passport.tasks.forEach((task, index) => {
        const cells = {
          index: String(index + 1),
          name: task.name,
          type: this.getTaskTypeLabel(task.type),
          responsible: task.responsible || '-',
        };

        const rowHeight =
          Math.max(
            ...columns.map((column) =>
              doc.heightOfString(cells[column.key], {
                width: column.width - 8,
              }),
            ),
          ) + 10;

        if (doc.y + rowHeight > pageBottom()) {
          doc.addPage();
          doc.font(regularFontName).fontSize(9);
          drawHeader();
        }

        const rowY = doc.y;
        let x = tableX;

        for (const column of columns) {
          doc.rect(x, rowY, column.width, rowHeight).stroke();
          doc.text(cells[column.key], x + 4, rowY + 5, {
            width: column.width - 8,
            align: column.key === 'index' ? 'center' : 'left',
          });
          x += column.width;
        }

        doc.y = rowY + rowHeight;
      });

      sectionTitle('Статистика схемы');
      doc.text(
        `Компоненты: процессы ${payload.passport.diagram.processComponents}, задачи ${payload.passport.diagram.taskComponents}, стрелки ${payload.passport.diagram.arrows}`,
      );

      doc.end();
    });
  }

  private findStronglyConnectedComponents(
    taskIds: number[],
    adjacency: Map<number, Set<number>>,
  ) {
    const indexByTask = new Map<number, number>();
    const lowLink = new Map<number, number>();
    const stack: number[] = [];
    const onStack = new Set<number>();
    const sccs: number[][] = [];
    let index = 0;

    const strongConnect = (taskId: number) => {
      indexByTask.set(taskId, index);
      lowLink.set(taskId, index);
      index += 1;

      stack.push(taskId);
      onStack.add(taskId);

      for (const nextTaskId of adjacency.get(taskId) ?? []) {
        if (!indexByTask.has(nextTaskId)) {
          strongConnect(nextTaskId);
          lowLink.set(
            taskId,
            Math.min(lowLink.get(taskId)!, lowLink.get(nextTaskId)!),
          );
        } else if (onStack.has(nextTaskId)) {
          lowLink.set(
            taskId,
            Math.min(lowLink.get(taskId)!, indexByTask.get(nextTaskId)!),
          );
        }
      }

      if (lowLink.get(taskId) === indexByTask.get(taskId)) {
        const scc: number[] = [];
        while (stack.length > 0) {
          const node = stack.pop()!;
          onStack.delete(node);
          scc.push(node);
          if (node === taskId) {
            break;
          }
        }
        sccs.push(scc);
      }
    };

    for (const taskId of taskIds) {
      if (!indexByTask.has(taskId)) {
        strongConnect(taskId);
      }
    }

    return sccs;
  }

  private async buildTaskGraphForProcess(processId: number, taskIds: number[]) {
    const [taskComponents, arrows] = await Promise.all([
      this.prisma.taskComponent.findMany({
        where: { ownerProcessId: processId },
        select: { id: true, taskId: true },
      }),
      this.prisma.arrowComponent.findMany({
        where: { ownerProcessId: processId },
        select: {
          id: true,
          fromTaskComponentId: true,
          toTaskComponentId: true,
        },
      }),
    ]);

    const taskIdSet = new Set(taskIds);
    const componentToTaskId = new Map(taskComponents.map((component) => [component.id, component.taskId]));
    const taskToComponentId = new Map(taskComponents.map((component) => [component.taskId, component.id]));

    const adjacency = new Map<number, Set<number>>();
    const reverseAdjacency = new Map<number, Set<number>>();
    for (const taskId of taskIdSet) {
      adjacency.set(taskId, new Set<number>());
      reverseAdjacency.set(taskId, new Set<number>());
    }

    const edges = new Set<string>();
    const ignoredArrowIds: number[] = [];

    for (const arrow of arrows) {
      if (!arrow.fromTaskComponentId || !arrow.toTaskComponentId) {
        ignoredArrowIds.push(arrow.id);
        continue;
      }

      const fromTaskId = componentToTaskId.get(arrow.fromTaskComponentId);
      const toTaskId = componentToTaskId.get(arrow.toTaskComponentId);
      if (
        fromTaskId === undefined
        || toTaskId === undefined
        || !taskIdSet.has(fromTaskId)
        || !taskIdSet.has(toTaskId)
      ) {
        ignoredArrowIds.push(arrow.id);
        continue;
      }

      const edgeKey = `${fromTaskId}:${toTaskId}`;
      if (edges.has(edgeKey)) {
        continue;
      }

      edges.add(edgeKey);
      adjacency.get(fromTaskId)!.add(toTaskId);
      reverseAdjacency.get(toTaskId)!.add(fromTaskId);
    }

    return {
      adjacency,
      reverseAdjacency,
      taskToComponentId,
      componentToTaskId,
      ignoredArrowIds,
      edgeCount: edges.size,
    };
  }

  private getOrderedTaskIds(
    tasks: Array<{ id: number; type: string }>,
    adjacency: Map<number, Set<number>>,
  ) {
    const indegree = new Map<number, number>();
    for (const task of tasks) {
      indegree.set(task.id, 0);
    }

    for (const [, nextSet] of adjacency) {
      for (const next of nextSet) {
        indegree.set(next, (indegree.get(next) ?? 0) + 1);
      }
    }

    const starts = tasks
      .filter((task) => task.type === 'start')
      .map((task) => task.id)
      .sort((a, b) => a - b);
    const fallbackRoots = tasks
      .filter((task) => (indegree.get(task.id) ?? 0) === 0)
      .map((task) => task.id)
      .sort((a, b) => a - b);

    const queue = starts.length > 0 ? [...starts] : [...fallbackRoots];
    const visited = new Set<number>();
    const ordered: number[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) {
        continue;
      }

      visited.add(current);
      ordered.push(current);

      const nextNodes = Array.from(adjacency.get(current) ?? []).sort((a, b) => a - b);
      for (const next of nextNodes) {
        indegree.set(next, (indegree.get(next) ?? 0) - 1);
        if ((indegree.get(next) ?? 0) <= 0) {
          queue.push(next);
        }
      }
    }

    const remaining = tasks
      .map((task) => task.id)
      .filter((taskId) => !visited.has(taskId))
      .sort((a, b) => a - b);

    return [...ordered, ...remaining];
  }

  private getTaskTypeLabel(type: string) {
    switch (type) {
      case 'start':
        return 'Старт';
      case 'end':
        return 'Завершение';
      case 'decision':
        return 'Решение';
      case 'parallel':
        return 'Параллельный блок';
      default:
        return 'Задача';
    }
  }

  private formatTaskResponsibility(task: {
    responsiblePosition?: { name: string } | null;
    responsibleRole?: { name: string } | null;
    responsiblePositionId?: number | null;
    responsibleRoleId?: number | null;
  }) {
    const labels: string[] = [];
    if (task.responsiblePosition?.name) {
      labels.push(`должность: ${task.responsiblePosition.name}`);
    } else if (task.responsiblePositionId) {
      labels.push(`должность #${task.responsiblePositionId}`);
    }

    if (task.responsibleRole?.name) {
      labels.push(`роль: ${task.responsibleRole.name}`);
    } else if (task.responsibleRoleId) {
      labels.push(`роль #${task.responsibleRoleId}`);
    }

    return labels.length > 0 ? labels.join(', ') : 'ответственный не задан';
  }

  private formatProcessResponsibility(process: {
    responsiblePosition?: { name: string } | null;
    responsibleRole?: { name: string } | null;
    responsiblePositionId?: number | null;
    responsibleRoleId?: number | null;
  }) {
    const labels: string[] = [];
    if (process.responsiblePosition?.name) {
      labels.push(`должность: ${process.responsiblePosition.name}`);
    } else if (process.responsiblePositionId) {
      labels.push(`должность #${process.responsiblePositionId}`);
    }

    if (process.responsibleRole?.name) {
      labels.push(`роль: ${process.responsibleRole.name}`);
    } else if (process.responsibleRoleId) {
      labels.push(`роль #${process.responsibleRoleId}`);
    }

    return labels.length > 0 ? labels.join(', ') : 'ответственный не задан';
  }

  private async collectParticipantsForProcess(
    process: Awaited<ReturnType<ProcessService['findOne']>>,
    userId: number,
  ) {
    const rows = await this.collectParticipantRowsForPassport(process, userId);
    return rows.map((item) => item.name);
  }

  private async collectParticipantRowsForPassport(
    process: Awaited<ReturnType<ProcessService['findOne']>>,
    userId: number,
  ) {
    const tasks = process.tasks ?? [];
    const positionIds = Array.from(
      new Set(
        [process.responsiblePositionId, ...tasks.map((task) => task.responsiblePositionId)]
          .filter((value): value is number => typeof value === 'number'),
      ),
    );
    const roleIds = Array.from(
      new Set(
        [process.responsibleRoleId, ...tasks.map((task) => task.responsibleRoleId)]
          .filter((value): value is number => typeof value === 'number'),
      ),
    );

    const [positions, roles] = await Promise.all([
      positionIds.length > 0
        ? this.prisma.position.findMany({
            where: { id: { in: positionIds }, userId },
            include: {
              employees: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
                orderBy: { id: 'asc' },
              },
            },
            orderBy: { id: 'asc' },
          })
        : Promise.resolve([]),
      roleIds.length > 0
        ? this.prisma.role.findMany({
            where: { id: { in: roleIds }, userId },
            orderBy: { id: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    const participants: ParticipantRow[] = [];

    for (const position of positions) {
      participants.push({
        positionId: position.id,
        name: `Должность: ${position.name}`,
        employees: position.employees,
      });
    }

    for (const role of roles) {
      participants.push({
        roleId: role.id,
        name: `Роль: ${role.name}`,
      });
    }

    return participants;
  }
}
