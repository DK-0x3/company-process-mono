import {
  DataFlowType,
  DotSide,
  PrismaClient,
  TaskType,
  TestQuestionType,
  UserActorType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const OWNER_LOGIN = process.env.BULK_OWNER_LOGIN ?? 'admin';
const OWNER_EMAIL = process.env.BULK_OWNER_EMAIL ?? 'admin@mail.com';
const DEFAULT_PASSWORD = process.env.BULK_DEFAULT_PASSWORD ?? '123456';
const RUN_TAG = process.env.BULK_RUN_TAG ?? `${Date.now()}`;

const SCALE = Math.max(1, Number.parseInt(process.env.BULK_SCALE ?? '4', 10));
const UNIT_COUNT = Math.max(4, SCALE * 2);
const EMPLOYEES_PER_UNIT = Math.max(10, SCALE * 4);
const TESTS_PER_UNIT = 3;
const DATA_OBJECTS_PER_UNIT = 10;
const MATERIALS_PER_UNIT = 12;

type Ref = { id: number; name: string };
type EmployeeRef = {
  id: number;
  fullName: string;
  userAccountId: number;
};
type UnitRefs = {
  unitName: string;
  positions: Ref[];
  roles: Ref[];
  employees: EmployeeRef[];
  processes: Ref[];
  tasks: Ref[];
};

const UNIT_NAMES = [
  'Дирекция цифровых сервисов',
  'Блок клиентского опыта',
  'Операционный контур',
  'Контур качества',
  'Снабжение и логистика',
  'Финансовый контур',
  'HR и обучение',
  'Контур аналитики',
  'Инфраструктурный контур',
  'Контур информационной безопасности',
  'Проектный офис',
  'Контур сопровождения',
];

const POSITION_TEMPLATES = [
  'Руководитель направления',
  'Бизнес-аналитик',
  'Системный аналитик',
  'Разработчик backend',
  'Разработчик frontend',
  'QA инженер',
  'DevOps инженер',
  'Специалист сопровождения',
  'Проектный менеджер',
  'Методолог',
];

const ROLE_TEMPLATES = [
  'Владелец процесса',
  'Ответственный исполнитель',
  'Контроль качества',
  'Архитектор решения',
  'Координатор поставки',
  'Эксперт домена',
];

const FIRST_NAMES = [
  'Александр',
  'Ирина',
  'Дмитрий',
  'Елена',
  'Иван',
  'Мария',
  'Павел',
  'Ольга',
  'Сергей',
  'Наталья',
  'Роман',
  'Анна',
  'Николай',
  'Татьяна',
  'Артем',
  'Екатерина',
  'Максим',
  'Светлана',
  'Алексей',
  'Юлия',
];

const LAST_NAMES = [
  'Иванов',
  'Петров',
  'Сидоров',
  'Смирнов',
  'Васильев',
  'Кузнецов',
  'Попов',
  'Соколов',
  'Лебедев',
  'Козлов',
  'Новиков',
  'Морозов',
  'Егоров',
  'Павлов',
  'Федоров',
  'Виноградов',
  'Беляев',
  'Тарасов',
  'Зайцев',
  'Гусев',
];

const CITY_STREET = [
  ['Екатеринбург', 'ул. Ленина'],
  ['Екатеринбург', 'ул. Малышева'],
  ['Екатеринбург', 'ул. Белинского'],
  ['Екатеринбург', 'ул. Куйбышева'],
  ['Екатеринбург', 'ул. Восточная'],
  ['Екатеринбург', 'ул. Щорса'],
  ['Екатеринбург', 'ул. Радищева'],
  ['Екатеринбург', 'ул. 8 Марта'],
  ['Екатеринбург', 'ул. Челюскинцев'],
  ['Екатеринбург', 'ул. Московская'],
];

const PROCESS_STAGES = [
  'Планирование и приоритизация',
  'Проектирование и согласование',
  'Реализация',
  'Контроль качества',
  'Ввод в эксплуатацию',
  'Сопровождение',
];

const TASK_STAGE_PATTERNS: Array<{ name: string; type: TaskType }> = [
  { name: 'Старт этапа', type: TaskType.start },
  { name: 'Сбор входных данных', type: TaskType.decision },
  { name: 'Исполнение работ', type: TaskType.task },
  { name: 'Параллельная проверка', type: TaskType.parallel },
  { name: 'Согласование результата', type: TaskType.decision },
  { name: 'Закрытие этапа', type: TaskType.end },
];

const DATA_OBJECT_TEMPLATES = [
  'Запрос от бизнеса',
  'Паспорт процесса',
  'Карта рисков',
  'План работ',
  'Протокол согласования',
  'Техническое задание',
  'Регламент выполнения',
  'Чек-лист контроля',
  'Отчет о выполнении',
  'План корректирующих действий',
];

const MATERIAL_CATEGORY_NAMES = [
  'Регламенты',
  'Чек-листы',
  'Обучающие материалы',
  'Практические кейсы',
  'Контроль качества',
];

const MATERIAL_TEMPLATES = [
  'Стандарт передачи задач между ролями',
  'Шаблон плана внедрения',
  'Чек-лист ревью результатов',
  'Методика анализа отклонений',
  'Регламент эскалации рисков',
  'Практика документирования изменений',
  'Шаблон итогового отчета этапа',
  'Гайд по коммуникации между командами',
  'Памятка по качеству входных данных',
  'Рекомендации по контролю сроков',
  'Процедура инцидент-менеджмента',
  'Регламент обратной связи',
];

function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sampleManyUnique<T>(arr: T[], count: number): T[] {
  if (count >= arr.length) return [...arr];
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < count && copy.length > 0) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy[i]);
    copy.splice(i, 1);
  }
  return out;
}

function maybe<T>(value: T, probability = 0.5): T | null {
  return Math.random() <= probability ? value : null;
}

function unitNameByIndex(index: number): string {
  if (index < UNIT_NAMES.length) return UNIT_NAMES[index];
  return `Региональный центр ${index + 1}`;
}

function employeeFullName(seedIndex: number): string {
  const firstName = FIRST_NAMES[seedIndex % FIRST_NAMES.length];
  const lastName = LAST_NAMES[(seedIndex * 7) % LAST_NAMES.length];
  return `${lastName} ${firstName}`;
}

async function cleanupOwnerData(ownerId: number) {
  await prisma.arrowComponent.deleteMany({
    where: { ownerProcess: { userId: ownerId } },
  });
  await prisma.processComponent.deleteMany({
    where: { ownerProcess: { userId: ownerId } },
  });
  await prisma.taskComponent.deleteMany({
    where: { ownerProcess: { userId: ownerId } },
  });

  await prisma.test.deleteMany({ where: { userId: ownerId } });

  await prisma.processData.deleteMany({
    where: { process: { userId: ownerId } },
  });
  await prisma.taskData.deleteMany({
    where: { task: { userId: ownerId } },
  });
  await prisma.processMaterial.deleteMany({
    where: { process: { userId: ownerId } },
  });
  await prisma.taskMaterial.deleteMany({
    where: { task: { userId: ownerId } },
  });

  await prisma.task.deleteMany({ where: { userId: ownerId } });
  await prisma.process.deleteMany({ where: { userId: ownerId } });
  await prisma.material.deleteMany({ where: { userId: ownerId } });
  await prisma.materialCategory.deleteMany({ where: { userId: ownerId } });
  await prisma.dataObject.deleteMany({ where: { userId: ownerId } });
  await prisma.role.deleteMany({ where: { userId: ownerId } });
  await prisma.user.deleteMany({ where: { ownerUserId: ownerId } });
  await prisma.employee.deleteMany({ where: { userId: ownerId } });
  await prisma.position.deleteMany({ where: { userId: ownerId } });
}

async function createUnit(unitIndex: number, ownerId: number): Promise<UnitRefs> {
  const unitName = unitNameByIndex(unitIndex);

  const positions: Ref[] = [];
  for (const template of POSITION_TEMPLATES) {
    const position = await prisma.position.create({
      data: {
        name: `${template}, ${unitName}`,
        userId: ownerId,
      },
    });
    positions.push(position);
  }

  const roles: Ref[] = [];
  for (const template of ROLE_TEMPLATES) {
    const role = await prisma.role.create({
      data: {
        name: `${template}, ${unitName}`,
        description: `${template} в подразделении "${unitName}"`,
        userId: ownerId,
      },
    });
    roles.push(role);
  }

  const employees: EmployeeRef[] = [];
  const employeePasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  for (let i = 0; i < EMPLOYEES_PER_UNIT; i += 1) {
    const seedIndex = unitIndex * EMPLOYEES_PER_UNIT + i;
    const fullName = employeeFullName(seedIndex);
    const login = `employee.${RUN_TAG}.${unitIndex + 1}.${i + 1}`;
    const email = `${login}@example.com`;
    const position = sample(positions);
    const role = sample(roles);
    const [city, street] = CITY_STREET[(seedIndex * 3) % CITY_STREET.length];

    const employee = await prisma.employee.create({
      data: {
        fullName,
        birthDate: new Date(1985 + (seedIndex % 16), seedIndex % 12, (seedIndex % 27) + 1),
        hireDate: new Date(2019 + (seedIndex % 7), (seedIndex + 2) % 12, ((seedIndex + 5) % 27) + 1),
        email,
        phone: `+7900${String(unitIndex + 1).padStart(2, '0')}${String(i + 1).padStart(6, '0')}`,
        address: `${city}, ${street}, д. ${10 + (seedIndex % 120)}`,
        positionId: position.id,
        roleId: role.id,
        userId: ownerId,
        canViewProcesses: true,
        canViewTasks: true,
        canViewDataObjects: true,
        canViewMaterials: true,
        canViewTests: true,
        canEditTasks: i % 3 === 0,
        canEditProcesses: i % 4 === 0,
        canEditDataObjects: i % 5 === 0,
        canEditMaterials: i % 6 === 0,
        canEditTests: i % 7 === 0,
      },
    });

    const account = await prisma.user.create({
      data: {
        login,
        email,
        password: employeePasswordHash,
        visiblePassword: DEFAULT_PASSWORD,
        actorType: UserActorType.EMPLOYEE,
        ownerUserId: ownerId,
        employeeProfileId: employee.id,
      },
    });

    employees.push({
      id: employee.id,
      fullName: employee.fullName,
      userAccountId: account.id,
    });
  }

  const processes: Ref[] = [];
  const rootProcess = await prisma.process.create({
    data: {
      name: `Управление операциями: ${unitName}`,
      description: `Сквозной контур управления операционной деятельностью подразделения "${unitName}".`,
      goal: `Повысить предсказуемость сроков, качество результата и прозрачность ответственности в "${unitName}".`,
      userId: ownerId,
      responsiblePositionId: sample(positions).id,
      responsibleRoleId: sample(roles).id,
    },
  });
  processes.push(rootProcess);

  for (const stage of PROCESS_STAGES) {
    const process = await prisma.process.create({
      data: {
        name: `${stage}: ${unitName}`,
        description: `Этап "${stage}" в подразделении "${unitName}".`,
        goal: `Стабильное выполнение этапа "${stage}" с прозрачными метриками.`,
        parentId: rootProcess.id,
        userId: ownerId,
        responsiblePositionId: sample(positions).id,
        responsibleRoleId: sample(roles).id,
      },
    });
    processes.push(process);
  }

  const tasks: Ref[] = [];
  for (const process of processes) {
    const createdTaskComponentIds: number[] = [];
    for (let i = 0; i < TASK_STAGE_PATTERNS.length; i += 1) {
      const taskTemplate = TASK_STAGE_PATTERNS[i];
      const task = await prisma.task.create({
        data: {
          name: `${taskTemplate.name}: ${process.name}`,
          description: `Задача "${taskTemplate.name}" в рамках процесса "${process.name}".`,
          type: taskTemplate.type,
          processId: process.id,
          userId: ownerId,
          responsiblePositionId: sample(positions).id,
          responsibleRoleId: sample(roles).id,
          responsibleEmployeeId: maybe(sample(employees).id, 0.45),
        },
      });
      tasks.push(task);

      const component = await prisma.taskComponent.create({
        data: {
          ownerProcessId: process.id,
          taskId: task.id,
          x: 100 + i * 280,
          y: 130 + unitIndex * 8,
          width: 220,
          height: 84,
        },
      });
      createdTaskComponentIds.push(component.id);
    }

    for (let i = 0; i < createdTaskComponentIds.length - 1; i += 1) {
      await prisma.arrowComponent.create({
        data: {
          ownerProcessId: process.id,
          fromTaskComponentId: createdTaskComponentIds[i],
          fromSide: DotSide.right,
          fromOffset: 0.5,
          toTaskComponentId: createdTaskComponentIds[i + 1],
          toSide: DotSide.left,
          toOffset: 0.5,
        },
      });
    }
  }

  return { unitName, positions, roles, employees, processes, tasks };
}

async function seedDataObjectsAndLinks(unit: UnitRefs, ownerId: number) {
  const dataObjects: Ref[] = [];
  for (const template of DATA_OBJECT_TEMPLATES.slice(0, DATA_OBJECTS_PER_UNIT)) {
    const dataObject = await prisma.dataObject.create({
      data: {
        name: `${template}: ${unit.unitName}`,
        description: `Документ для процессов подразделения "${unit.unitName}".`,
        userId: ownerId,
      },
    });
    dataObjects.push(dataObject);
  }

  for (const process of unit.processes) {
    const inputs = sampleManyUnique(dataObjects, 2);
    const outputs = sampleManyUnique(dataObjects.filter((o) => !inputs.some((i) => i.id === o.id)), 1);
    for (const input of inputs) {
      await prisma.processData.create({
        data: {
          processId: process.id,
          dataObjectId: input.id,
          type: DataFlowType.input,
        },
      });
    }
    for (const output of outputs) {
      await prisma.processData.create({
        data: {
          processId: process.id,
          dataObjectId: output.id,
          type: DataFlowType.output,
        },
      });
    }
  }

  for (const task of unit.tasks) {
    const input = sample(dataObjects);
    const output = sample(dataObjects);
    await prisma.taskData.create({
      data: {
        taskId: task.id,
        dataObjectId: input.id,
        type: DataFlowType.input,
      },
    });
    if (output.id !== input.id) {
      await prisma.taskData.create({
        data: {
          taskId: task.id,
          dataObjectId: output.id,
          type: DataFlowType.output,
        },
      });
    }
  }
}

async function seedMaterials(unit: UnitRefs, ownerId: number) {
  const categories: Ref[] = [];
  for (const name of MATERIAL_CATEGORY_NAMES) {
    const category = await prisma.materialCategory.create({
      data: {
        name: `${name}: ${unit.unitName}`,
        description: `Категория "${name}" для подразделения "${unit.unitName}".`,
        userId: ownerId,
      },
    });
    categories.push(category);
  }

  for (let i = 0; i < MATERIALS_PER_UNIT; i += 1) {
    const template = MATERIAL_TEMPLATES[i % MATERIAL_TEMPLATES.length];
    const category = sample(categories);
    const material = await prisma.material.create({
      data: {
        name: `${template}: ${unit.unitName}`,
        content: `# ${template}\n\nПодразделение: ${unit.unitName}\n\n1. Подготовить входные данные.\n2. Выполнить работы согласно регламенту.\n3. Проверить качество и зафиксировать результаты.\n4. Передать результат следующей роли.\n`,
        categoryId: category.id,
        userId: ownerId,
      },
    });

    for (const process of sampleManyUnique(unit.processes, 2)) {
      await prisma.processMaterial.create({
        data: {
          processId: process.id,
          materialId: material.id,
        },
      });
    }
    for (const task of sampleManyUnique(unit.tasks, 3)) {
      await prisma.taskMaterial.create({
        data: {
          taskId: task.id,
          materialId: material.id,
        },
      });
    }
  }
}

async function seedTests(unit: UnitRefs, ownerId: number) {
  for (let i = 1; i <= TESTS_PER_UNIT; i += 1) {
    const linkedEmployees = sampleManyUnique(unit.employees, Math.min(4, unit.employees.length));
    const linkedPositions = sampleManyUnique(unit.positions, Math.min(3, unit.positions.length));
    const linkedProcesses = sampleManyUnique(unit.processes, Math.min(3, unit.processes.length));
    const linkedTasks = sampleManyUnique(unit.tasks, Math.min(5, unit.tasks.length));

    const test = await prisma.test.create({
      data: {
        name: `Аттестация по процессам (${unit.unitName}) #${i}`,
        description: `Проверка знаний и практик исполнения процессов в "${unit.unitName}".`,
        timeLimitMinutes: 30 + i * 5,
        userId: ownerId,
        questions: {
          create: [
            {
              type: TestQuestionType.single_choice,
              title: `Что является обязательным входом для этапа в "${unit.unitName}"?`,
              description: 'Выберите один корректный вариант.',
              order: 1,
              options: {
                create: [
                  { text: 'Согласованные требования и цели', isCorrect: true, order: 1 },
                  { text: 'Устная договоренность без фиксации', isCorrect: false, order: 2 },
                  { text: 'Произвольные данные', isCorrect: false, order: 3 },
                ],
              },
            },
            {
              type: TestQuestionType.multiple_choice,
              title: `Какие признаки качественного результата в "${unit.unitName}"?`,
              order: 2,
              options: {
                create: [
                  { text: 'Есть критерии приемки', isCorrect: true, order: 1 },
                  { text: 'Есть подтверждение ответственной роли', isCorrect: true, order: 2 },
                  { text: 'Есть план дальнейших действий', isCorrect: true, order: 3 },
                  { text: 'Нет документированного контекста', isCorrect: false, order: 4 },
                ],
              },
            },
            {
              type: TestQuestionType.text,
              title: `Кратко опишите цель процесса в "${unit.unitName}"`,
              order: 3,
              textAnswerPlaceholder: 'Ожидаемый результат процесса',
              expectedTextAnswer:
                'Процесс должен завершаться предсказуемым результатом, подтвержденным ответственными ролями.',
            },
            {
              type: TestQuestionType.single_choice,
              title: `Кто несет ответственность за итог этапа в "${unit.unitName}"?`,
              order: 4,
              options: {
                create: [
                  { text: 'Назначенная ответственная роль', isCorrect: true, order: 1 },
                  { text: 'Любой участник команды', isCorrect: false, order: 2 },
                  { text: 'Внешний наблюдатель', isCorrect: false, order: 3 },
                ],
              },
            },
            {
              type: TestQuestionType.multiple_choice,
              title: `Что должно попадать в статус-отчет этапа?`,
              order: 5,
              options: {
                create: [
                  { text: 'Текущий статус и отклонения', isCorrect: true, order: 1 },
                  { text: 'Риски и меры реагирования', isCorrect: true, order: 2 },
                  { text: 'Факты по качеству', isCorrect: true, order: 3 },
                  { text: 'Личные комментарии без фактов', isCorrect: false, order: 4 },
                ],
              },
            },
          ],
        },
        employeeLinks: {
          create: linkedEmployees.map((e) => ({ employeeId: e.id })),
        },
        positionLinks: {
          create: linkedPositions.map((p) => ({ positionId: p.id })),
        },
        processLinks: {
          create: linkedProcesses.map((p) => ({ processId: p.id })),
        },
        taskLinks: {
          create: linkedTasks.map((t) => ({ taskId: t.id })),
        },
      },
    });

    for (const assignee of linkedEmployees.slice(0, 2)) {
      const totalQuestions = 5;
      const correctAnswers = 3 + Math.floor(Math.random() * 3);
      const percentage = Number(((correctAnswers / totalQuestions) * 100).toFixed(2));
      await prisma.testResult.create({
        data: {
          testId: test.id,
          userId: assignee.userAccountId,
          score: correctAnswers,
          correctAnswers,
          evaluatedQuestions: totalQuestions,
          totalQuestions,
          percentage,
          durationSeconds: 900 + Math.floor(Math.random() * 900),
          hintsUsed: Math.floor(Math.random() * 3),
          hintsTotal: 3,
        },
      });
    }
  }
}

async function main() {
  console.log(
    `🌱 Starting realistic seed (scale=${SCALE}, units=${UNIT_COUNT}, employeesPerUnit=${EMPLOYEES_PER_UNIT})...`,
  );

  const ownerPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const owner = await prisma.user.upsert({
    where: { login: OWNER_LOGIN },
    create: {
      login: OWNER_LOGIN,
      email: OWNER_EMAIL,
      password: ownerPasswordHash,
      visiblePassword: DEFAULT_PASSWORD,
      actorType: UserActorType.OWNER,
    },
    update: {
      email: OWNER_EMAIL,
      password: ownerPasswordHash,
      visiblePassword: DEFAULT_PASSWORD,
      actorType: UserActorType.OWNER,
      ownerUserId: null,
      employeeProfileId: null,
    },
  });
  console.log(`👤 Owner ready: ${owner.login}`);

  await cleanupOwnerData(owner.id);
  console.log('🧹 Existing owner data cleaned');

  const units: UnitRefs[] = [];
  for (let u = 0; u < UNIT_COUNT; u += 1) {
    const unit = await createUnit(u, owner.id);
    units.push(unit);
    await seedDataObjectsAndLinks(unit, owner.id);
    await seedMaterials(unit, owner.id);
    await seedTests(unit, owner.id);
    console.log(`✅ Seeded unit: ${unit.unitName}`);
  }

  const [
    usersCount,
    positionsCount,
    rolesCount,
    employeesCount,
    processesCount,
    tasksCount,
    dataObjectsCount,
    materialsCount,
    testsCount,
    testResultsCount,
  ] = await Promise.all([
    prisma.user.count({ where: { ownerUserId: owner.id } }),
    prisma.position.count({ where: { userId: owner.id } }),
    prisma.role.count({ where: { userId: owner.id } }),
    prisma.employee.count({ where: { userId: owner.id } }),
    prisma.process.count({ where: { userId: owner.id } }),
    prisma.task.count({ where: { userId: owner.id } }),
    prisma.dataObject.count({ where: { userId: owner.id } }),
    prisma.material.count({ where: { userId: owner.id } }),
    prisma.test.count({ where: { userId: owner.id } }),
    prisma.testResult.count({
      where: {
        user: { ownerUserId: owner.id },
      },
    }),
  ]);

  console.log('✅ Realistic bulk seeding complete');
  console.log(
    `📊 Totals -> accounts:${usersCount}, positions:${positionsCount}, roles:${rolesCount}, employees:${employeesCount}, processes:${processesCount}, tasks:${tasksCount}, dataObjects:${dataObjectsCount}, materials:${materialsCount}, tests:${testsCount}, testResults:${testResultsCount}`,
  );
  console.log(`🔐 Default demo password for generated users: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('❌ Realistic seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
