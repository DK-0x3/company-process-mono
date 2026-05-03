import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Employee, TaskType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CurrentUserData } from '../auth/current-user.interface';
import { SubmitTestDto } from '../test/dto/submit-test.dto';
import { TestService } from '../test/test.service';

export interface EmployeeCabinetResponse {
  employee: {
    id: number;
    fullName: string;
    email: string;
    phone: string | null;
    address: string | null;
    birthDate: string;
    hireDate: string;
    position: { id: number; name: string } | null;
    role: { id: number; name: string; description: string | null } | null;
  };
  summary: {
    responsibleProcesses: number;
    responsibleTasks: number;
  };
  permissions: {
    canViewProcesses: boolean;
    canEditProcesses: boolean;
    canViewTasks: boolean;
    canEditTasks: boolean;
    canViewPositions: boolean;
    canEditPositions: boolean;
    canViewDataObjects: boolean;
    canEditDataObjects: boolean;
    canViewMaterials: boolean;
    canEditMaterials: boolean;
    canViewTests: boolean;
    canEditTests: boolean;
  };
  processes: Array<{
    id: number;
    name: string;
    description: string | null;
    goal: string | null;
    version: number;
    isActive: boolean;
    updatedAt: string;
    responsible: string;
  }>;
  tasks: Array<{
    id: number;
    name: string;
    description: string | null;
    type: TaskType;
    processId: number;
    processName: string;
    updatedAt: string;
    responsible: string;
  }>;
}

export interface EmployeeCabinetProcessDetailsResponse {
  id: number;
  name: string;
  description: string | null;
  goal: string | null;
  version: number;
  isActive: boolean;
  updatedAt: string;
  responsible: string;
  inputs: Array<{ id: number; name: string; description: string | null }>;
  outputs: Array<{ id: number; name: string; description: string | null }>;
  tasks: Array<{
    id: number;
    name: string;
    type: TaskType;
    description: string | null;
    responsible: string;
  }>;
  participants: Array<{
    positionName: string;
    employees: Array<{ id: number; fullName: string; email: string }>;
  }>;
  materials: Array<{
    id: number;
    name: string;
    content: string;
    category: { id: number; name: string } | null;
    updatedAt: string;
  }>;
}

export interface EmployeeCabinetTaskDetailsResponse {
  id: number;
  name: string;
  description: string | null;
  type: TaskType;
  process: {
    id: number;
    name: string;
    description: string | null;
  };
  responsible: string;
  inputs: Array<{ id: number; name: string; description: string | null }>;
  outputs: Array<{ id: number; name: string; description: string | null }>;
  previousTasks: Array<{ id: number; name: string; type: TaskType }>;
  nextTasks: Array<{ id: number; name: string; type: TaskType }>;
  materials: Array<{
    id: number;
    name: string;
    content: string;
    category: { id: number; name: string } | null;
    updatedAt: string;
  }>;
}

export interface EmployeeCabinetTestResultResponse {
  id: number;
  testId: number;
  userId: number;
  score: number;
  correctAnswers: number;
  evaluatedQuestions: number;
  totalQuestions: number;
  percentage: number;
  durationSeconds: number | null;
  hintsUsed: number;
  hintsTotal: number;
  createdAt: Date;
  updatedAt: Date;
  answers: Array<{
    questionId: number;
    selectedOptionIds: number[];
    textAnswer: string | null;
    isCorrect: boolean | null;
    usedHint: boolean;
    question: {
      id: number;
      title: string;
      type: 'single_choice' | 'multiple_choice' | 'text';
      order: number;
    };
  }>;
}

@Injectable()
export class CabinetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly testService: TestService,
  ) {}

  async getEmployeeCabinet(
    user: CurrentUserData,
  ): Promise<EmployeeCabinetResponse> {
    if (user.actorType !== 'EMPLOYEE' || !user.employeeId) {
      throw new ForbiddenException('Кабинет доступен только для сотрудника');
    }

    const employee = await this.prisma.employee.findFirst({
      where: {
        id: user.employeeId,
        userId: user.ownerUserId,
      },
      include: {
        position: true,
        role: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Сотрудник не найден');
    }

    const responsibilityFilters = [
      { responsibleEmployeeId: employee.id },
      ...(employee.positionId
        ? [{ responsiblePositionId: employee.positionId }]
        : []),
    ];

    const canViewProcesses = this.hasEntityPermission(
      employee,
      'processes',
      'view',
    );
    const canViewTasks = this.hasEntityPermission(employee, 'tasks', 'view');

    const [processes, tasks] = await Promise.all([
      canViewProcesses && responsibilityFilters.length
        ? this.prisma.process.findMany({
            where: {
              userId: user.ownerUserId,
              OR: responsibilityFilters,
            },
            include: {
              responsiblePosition: true,
              responsibleRole: true,
            },
            orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
          })
        : Promise.resolve([]),
      canViewTasks && responsibilityFilters.length
        ? this.prisma.task.findMany({
            where: {
              userId: user.ownerUserId,
              OR: responsibilityFilters,
            },
            include: {
              process: {
                select: {
                  id: true,
                  name: true,
                },
              },
              responsiblePosition: true,
              responsibleRole: true,
            },
            orderBy: [{ updatedAt: 'desc' }],
          })
        : Promise.resolve([]),
    ]);

    return {
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        email: employee.email,
        phone: employee.phone,
        address: employee.address,
        birthDate: employee.birthDate.toISOString(),
        hireDate: employee.hireDate.toISOString(),
        position: employee.position
          ? { id: employee.position.id, name: employee.position.name }
          : null,
        role: employee.role
          ? {
              id: employee.role.id,
              name: employee.role.name,
              description: employee.role.description,
            }
          : null,
      },
      summary: {
        responsibleProcesses: processes.length,
        responsibleTasks: tasks.length,
      },
      permissions: this.extractPermissions(employee),
      processes: processes.map((process) => ({
        id: process.id,
        name: process.name,
        description: process.description,
        goal: process.goal,
        version: process.version,
        isActive: process.isActive,
        updatedAt: process.updatedAt.toISOString(),
        responsible: this.buildResponsibleLabel(
          process.responsiblePosition?.name,
          process.responsibleRole?.name,
        ),
      })),
      tasks: tasks.map((task) => ({
        id: task.id,
        name: task.name,
        description: task.description,
        type: task.type,
        processId: task.process.id,
        processName: task.process.name,
        updatedAt: task.updatedAt.toISOString(),
        responsible: this.buildResponsibleLabel(
          task.responsiblePosition?.name,
          task.responsibleRole?.name,
        ),
      })),
    };
  }

  async getProcessDetailsForEmployee(
    processId: number,
    user: CurrentUserData,
  ): Promise<EmployeeCabinetProcessDetailsResponse> {
    const employee = await this.getCurrentEmployee(user);
    this.ensureEntityPermission(employee, 'processes', 'view');

    const canViewTasks = this.hasEntityPermission(employee, 'tasks', 'view');
    const canViewDataObjects = this.hasEntityPermission(
      employee,
      'dataObjects',
      'view',
    );
    const canViewMaterials = this.hasEntityPermission(
      employee,
      'materials',
      'view',
    );

    await this.ensureProcessEmployeeAccess(processId, employee.id, employee.positionId);

    const process = await this.prisma.process.findFirst({
      where: {
        id: processId,
        userId: user.ownerUserId,
      },
      include: {
        responsiblePosition: true,
        responsibleRole: true,
        processData: {
          include: { dataObject: true },
        },
        processMaterials: {
          include: {
            material: {
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        tasks: {
          include: {
            responsiblePosition: true,
            responsibleRole: true,
          },
          orderBy: [{ id: 'asc' }],
        },
      },
    });

    if (!process) {
      throw new NotFoundException('Процесс не найден');
    }

    const processInputs = process.processData
      .filter((item) => item.type === 'input')
      .map((item) => ({
        id: item.dataObjectId,
        name: item.dataObject.name,
        description: item.dataObject.description,
      }));

    const processOutputs = process.processData
      .filter((item) => item.type === 'output')
      .map((item) => ({
        id: item.dataObjectId,
        name: item.dataObject.name,
        description: item.dataObject.description,
      }));

    const participantPositionIds = new Set<number>();
    for (const task of process.tasks) {
      if (task.responsiblePositionId) {
        participantPositionIds.add(task.responsiblePositionId);
      }
    }

    const employeesByPosition =
      participantPositionIds.size > 0
        ? await this.prisma.employee.findMany({
            where: {
              userId: user.ownerUserId,
              positionId: { in: [...participantPositionIds] },
            },
            select: {
              id: true,
              fullName: true,
              email: true,
              positionId: true,
              position: { select: { name: true } },
            },
            orderBy: [{ fullName: 'asc' }],
          })
        : [];

    const groupedParticipants = new Map<
      number,
      { positionName: string; employees: Array<{ id: number; fullName: string; email: string }> }
    >();

    for (const employeeRow of employeesByPosition) {
      if (!employeeRow.positionId || !employeeRow.position?.name) continue;

      if (!groupedParticipants.has(employeeRow.positionId)) {
        groupedParticipants.set(employeeRow.positionId, {
          positionName: employeeRow.position.name,
          employees: [],
        });
      }

      groupedParticipants.get(employeeRow.positionId)!.employees.push({
        id: employeeRow.id,
        fullName: employeeRow.fullName,
        email: employeeRow.email,
      });
    }

    return {
      id: process.id,
      name: process.name,
      description: process.description,
      goal: process.goal,
      version: process.version,
      isActive: process.isActive,
      updatedAt: process.updatedAt.toISOString(),
      responsible: this.buildResponsibleLabel(
        process.responsiblePosition?.name,
        process.responsibleRole?.name,
      ),
      tasks: canViewTasks
        ? process.tasks.map((task) => ({
            id: task.id,
            name: task.name,
            type: task.type,
            description: task.description,
            responsible: this.buildResponsibleLabel(
              task.responsiblePosition?.name,
              task.responsibleRole?.name,
            ),
          }))
        : [],
      participants: [...groupedParticipants.values()],
      materials: canViewMaterials
        ? process.processMaterials.map((item) => ({
            id: item.material.id,
            name: item.material.name,
            content: item.material.content,
            category: item.material.category
              ? {
                  id: item.material.category.id,
                  name: item.material.category.name,
                }
              : null,
            updatedAt: item.material.updatedAt.toISOString(),
          }))
        : [],
      inputs: canViewDataObjects ? processInputs : [],
      outputs: canViewDataObjects ? processOutputs : [],
    };
  }

  async getTaskDetailsForEmployee(
    taskId: number,
    user: CurrentUserData,
  ): Promise<EmployeeCabinetTaskDetailsResponse> {
    const employee = await this.getCurrentEmployee(user);
    this.ensureEntityPermission(employee, 'tasks', 'view');

    const canViewDataObjects = this.hasEntityPermission(
      employee,
      'dataObjects',
      'view',
    );
    const canViewMaterials = this.hasEntityPermission(
      employee,
      'materials',
      'view',
    );

    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        userId: user.ownerUserId,
      },
      include: {
        process: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        responsiblePosition: true,
        responsibleRole: true,
        taskData: {
          include: { dataObject: true },
        },
        taskMaterials: {
          include: {
            material: {
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Задача не найдена');
    }

    const hasAccess =
      task.responsibleEmployeeId === employee.id ||
      (employee.positionId !== null &&
        task.responsiblePositionId === employee.positionId);

    if (!hasAccess) {
      throw new ForbiddenException('Нет доступа к этой задаче');
    }

    const [taskComponents, arrows] = await Promise.all([
      this.prisma.taskComponent.findMany({
        where: { ownerProcessId: task.processId },
        include: {
          task: {
            select: { id: true, name: true, type: true },
          },
        },
      }),
      this.prisma.arrowComponent.findMany({
        where: { ownerProcessId: task.processId },
        select: {
          fromTaskComponentId: true,
          toTaskComponentId: true,
        },
      }),
    ]);

    const byTaskId = new Map(taskComponents.map((component) => [component.taskId, component]));
    const byComponentId = new Map(taskComponents.map((component) => [component.id, component]));

    const currentTaskComponent = byTaskId.get(task.id);
    const previousTasksMap = new Map<number, { id: number; name: string; type: TaskType }>();
    const nextTasksMap = new Map<number, { id: number; name: string; type: TaskType }>();

    if (currentTaskComponent) {
      for (const arrow of arrows) {
        if (
          arrow.toTaskComponentId &&
          arrow.toTaskComponentId === currentTaskComponent.id &&
          arrow.fromTaskComponentId
        ) {
          const previousComponent = byComponentId.get(arrow.fromTaskComponentId);
          if (previousComponent?.task) {
            previousTasksMap.set(previousComponent.task.id, previousComponent.task);
          }
        }

        if (
          arrow.fromTaskComponentId &&
          arrow.fromTaskComponentId === currentTaskComponent.id &&
          arrow.toTaskComponentId
        ) {
          const nextComponent = byComponentId.get(arrow.toTaskComponentId);
          if (nextComponent?.task) {
            nextTasksMap.set(nextComponent.task.id, nextComponent.task);
          }
        }
      }
    }

    return {
      id: task.id,
      name: task.name,
      description: task.description,
      type: task.type,
      process: {
        id: task.process.id,
        name: task.process.name,
        description: task.process.description,
      },
      responsible: this.buildResponsibleLabel(
        task.responsiblePosition?.name,
        task.responsibleRole?.name,
      ),
      inputs: canViewDataObjects
        ? task.taskData
            .filter((item) => item.type === 'input')
            .map((item) => ({
              id: item.dataObjectId,
              name: item.dataObject.name,
              description: item.dataObject.description,
            }))
        : [],
      outputs: canViewDataObjects
        ? task.taskData
            .filter((item) => item.type === 'output')
            .map((item) => ({
              id: item.dataObjectId,
              name: item.dataObject.name,
              description: item.dataObject.description,
            }))
        : [],
      previousTasks: [...previousTasksMap.values()],
      nextTasks: [...nextTasksMap.values()],
      materials: canViewMaterials
        ? task.taskMaterials.map((item) => ({
            id: item.material.id,
            name: item.material.name,
            content: item.material.content,
            category: item.material.category
              ? {
                  id: item.material.category.id,
                  name: item.material.category.name,
                }
              : null,
            updatedAt: item.material.updatedAt.toISOString(),
          }))
        : [],
    };
  }

  async getAvailableTestsForEmployee(user: CurrentUserData) {
    const employee = await this.getCurrentEmployee(user);
    this.ensureEntityPermission(employee, 'tests', 'view');
    return this.testService.findAllForEmployee(user);
  }

  async getTestDetailsForEmployee(testId: number, user: CurrentUserData) {
    const employee = await this.getCurrentEmployee(user);
    this.ensureEntityPermission(employee, 'tests', 'view');
    return this.testService.findOneForEmployee(testId, user);
  }

  async getTestResultForEmployee(
    testId: number,
    user: CurrentUserData,
  ): Promise<EmployeeCabinetTestResultResponse | null> {
    const employee = await this.getCurrentEmployee(user);
    this.ensureEntityPermission(employee, 'tests', 'view');
    return this.testService.findMyResultForEmployee(testId, user);
  }

  async passTestForEmployee(
    testId: number,
    dto: SubmitTestDto,
    user: CurrentUserData,
  ) {
    const employee = await this.getCurrentEmployee(user);
    this.ensureEntityPermission(employee, 'tests', 'view');
    return this.testService.passTestForEmployee(testId, dto, user);
  }

  private async getCurrentEmployee(user: CurrentUserData) {
    if (user.actorType !== 'EMPLOYEE' || !user.employeeId) {
      throw new ForbiddenException('Кабинет доступен только для сотрудника');
    }

    const employee = await this.prisma.employee.findFirst({
      where: {
        id: user.employeeId,
        userId: user.ownerUserId,
      },
      include: {
        position: true,
        role: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Сотрудник не найден');
    }

    return employee;
  }

  private async ensureProcessEmployeeAccess(
    processId: number,
    employeeId: number,
    employeePositionId: number | null,
  ) {
    const process = await this.prisma.process.findUnique({
      where: { id: processId },
      select: {
        id: true,
        responsibleEmployeeId: true,
        responsiblePositionId: true,
      },
    });

    if (!process) {
      throw new NotFoundException('Процесс не найден');
    }

    const hasAccess =
      process.responsibleEmployeeId === employeeId ||
      (employeePositionId !== null &&
        process.responsiblePositionId === employeePositionId);

    if (!hasAccess) {
      throw new ForbiddenException('Нет доступа к этому процессу');
    }
  }

  private buildResponsibleLabel(
    positionName?: string | null,
    roleName?: string | null,
  ) {
    const chunks: string[] = [];

    if (positionName) {
      chunks.push(positionName);
    }

    if (roleName) {
      chunks.push(`роль: ${roleName}`);
    }

    return chunks.join(' / ') || 'Не назначен';
  }

  private extractPermissions(employee: Employee) {
    return {
      canViewProcesses: employee.canViewProcesses,
      canEditProcesses: employee.canEditProcesses,
      canViewTasks: employee.canViewTasks,
      canEditTasks: employee.canEditTasks,
      canViewPositions: employee.canViewPositions,
      canEditPositions: employee.canEditPositions,
      canViewDataObjects: employee.canViewDataObjects,
      canEditDataObjects: employee.canEditDataObjects,
      canViewMaterials: employee.canViewMaterials,
      canEditMaterials: employee.canEditMaterials,
      canViewTests: employee.canViewTests,
      canEditTests: employee.canEditTests,
    };
  }

  private ensureEntityPermission(
    employee: Employee,
    entity: 'processes' | 'tasks' | 'dataObjects' | 'materials' | 'tests',
    action: 'view' | 'edit',
  ) {
    if (!this.hasEntityPermission(employee, entity, action)) {
      throw new ForbiddenException('Недостаточно прав для выполнения действия');
    }
  }

  private hasEntityPermission(
    employee: Employee,
    entity: 'processes' | 'tasks' | 'dataObjects' | 'materials' | 'tests',
    action: 'view' | 'edit',
  ): boolean {
    const map: Record<
      'processes' | 'tasks' | 'dataObjects' | 'materials' | 'tests',
      { view: keyof Employee; edit: keyof Employee }
    > = {
      processes: { view: 'canViewProcesses', edit: 'canEditProcesses' },
      tasks: { view: 'canViewTasks', edit: 'canEditTasks' },
      dataObjects: { view: 'canViewDataObjects', edit: 'canEditDataObjects' },
      materials: { view: 'canViewMaterials', edit: 'canEditMaterials' },
      tests: { view: 'canViewTests', edit: 'canEditTests' },
    };

    const key = map[entity];
    if (action === 'edit') {
      return Boolean(employee[key.edit]);
    }

    return Boolean(employee[key.view] || employee[key.edit]);
  }
}
