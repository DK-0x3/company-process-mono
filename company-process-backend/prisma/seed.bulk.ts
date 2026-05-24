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
const BULK_PREFIX = process.env.BULK_PREFIX ?? '[BULK]';
const RUN_TAG =
  process.env.BULK_RUN_TAG ??
  `${new Date().toISOString().slice(0, 10)}-${Math.floor(Math.random() * 100000)}`;

const SCALE = Math.max(1, Number.parseInt(process.env.BULK_SCALE ?? '3', 10));
const UNIT_COUNT = Math.max(2, SCALE * 2);
const EMPLOYEES_PER_UNIT = Math.max(8, SCALE * 4);
const TESTS_PER_UNIT = 3;
const DATA_OBJECTS_COUNT = Math.max(24, SCALE * 16);
const MATERIALS_COUNT = Math.max(40, SCALE * 24);

type Ref = { id: number; name: string };
type EmployeeRef = { id: number; fullName: string; userAccountId: number; positionId: number; roleId: number };

function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sampleManyUnique<T>(arr: T[], count: number): T[] {
  if (count >= arr.length) return [...arr];
  const copy = [...arr];
  const result: T[] = [];
  while (result.length < count && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return result;
}

function maybe<T>(value: T, probability = 0.5): T | null {
  return Math.random() <= probability ? value : null;
}

async function main() {
  console.log(
    `🌱 Starting bulk seed (tag=${RUN_TAG}, scale=${SCALE}, units=${UNIT_COUNT}, employeesPerUnit=${EMPLOYEES_PER_UNIT})...`,
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

  const positionTemplates = [
    'Руководитель направления',
    'Бизнес-аналитик',
    'Системный аналитик',
    'Тимлид разработки',
    'Разработчик backend',
    'Разработчик frontend',
    'QA инженер',
    'DevOps инженер',
    'Специалист поддержки',
    'Проектный менеджер',
  ];
  const roleTemplates = [
    'Владелец процесса',
    'Ответственный исполнитель',
    'Контроль качества',
    'Архитектор решения',
    'Координатор поставки',
    'Эксперт домена',
  ];

  const positions: Ref[] = [];
  const roles: Ref[] = [];

  for (let unit = 1; unit <= UNIT_COUNT; unit += 1) {
    for (const template of positionTemplates) {
      const position = await prisma.position.create({
        data: {
          name: `${BULK_PREFIX} ${RUN_TAG} U${unit} ${template}`,
          userId: owner.id,
        },
      });
      positions.push(position);
    }
    for (const template of roleTemplates) {
      const role = await prisma.role.create({
        data: {
          name: `${BULK_PREFIX} ${RUN_TAG} U${unit} ${template}`,
          description: `Роль для юнита ${unit} (${template})`,
          userId: owner.id,
        },
      });
      roles.push(role);
    }
  }
  console.log(`💼 Created positions=${positions.length}, roles=${roles.length}`);

  const employees: EmployeeRef[] = [];
  const employeePasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  let employeeSerial = 1;
  for (let unit = 1; unit <= UNIT_COUNT; unit += 1) {
    const unitPositions = positions.filter((p) => p.name.includes(` U${unit} `));
    const unitRoles = roles.filter((r) => r.name.includes(` U${unit} `));

    for (let i = 1; i <= EMPLOYEES_PER_UNIT; i += 1) {
      const position = sample(unitPositions);
      const role = sample(unitRoles);
      const login = `bulk.${RUN_TAG}.u${unit}.e${i}`;
      const email = `${login}@example.com`;
      const fullName = `Сотрудник ${unit}-${i} (${RUN_TAG})`;

      const employee = await prisma.employee.create({
        data: {
          fullName,
          birthDate: new Date(1988 + (i % 12), i % 12, (i % 27) + 1),
          hireDate: new Date(2022 + (i % 3), (i + unit) % 12, ((i + unit) % 27) + 1),
          email,
          phone: `+7900${String(unit).padStart(2, '0')}${String(i).padStart(6, '0')}`,
          address: `Екатеринбург, Юнит ${unit}, офис ${i}`,
          positionId: position.id,
          roleId: role.id,
          userId: owner.id,
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
          ownerUserId: owner.id,
          employeeProfileId: employee.id,
        },
      });

      employees.push({
        id: employee.id,
        fullName: employee.fullName,
        userAccountId: account.id,
        positionId: position.id,
        roleId: role.id,
      });
      employeeSerial += 1;
    }
  }
  console.log(`👥 Created employees=${employees.length}, userAccounts=${employees.length}`);

  const processes: Ref[] = [];
  const tasks: Ref[] = [];

  const stageNames = ['Планирование', 'Реализация', 'Контроль качества', 'Поддержка'];

  for (let unit = 1; unit <= UNIT_COUNT; unit += 1) {
    const unitPositions = positions.filter((p) => p.name.includes(` U${unit} `));
    const unitRoles = roles.filter((r) => r.name.includes(` U${unit} `));

    const rootProcess = await prisma.process.create({
      data: {
        name: `${BULK_PREFIX} ${RUN_TAG} U${unit} Управление операциями`,
        description: `Сквозной процесс юнита ${unit}`,
        goal: `Повышение эффективности поставки и качества в юните ${unit}`,
        userId: owner.id,
        responsiblePositionId: sample(unitPositions).id,
        responsibleRoleId: sample(unitRoles).id,
      },
    });
    processes.push(rootProcess);

    const unitProcesses: Ref[] = [rootProcess];

    for (const stage of stageNames) {
      const process = await prisma.process.create({
        data: {
          name: `${BULK_PREFIX} ${RUN_TAG} U${unit} ${stage}`,
          description: `Этап ${stage.toLowerCase()} для юнита ${unit}`,
          goal: `Стабильное выполнение этапа ${stage.toLowerCase()}`,
          parentId: rootProcess.id,
          userId: owner.id,
          responsiblePositionId: sample(unitPositions).id,
          responsibleRoleId: sample(unitRoles).id,
        },
      });
      unitProcesses.push(process);
      processes.push(process);
    }

    for (const process of unitProcesses) {
      const taskSeeds: Array<{ name: string; type: TaskType }> = [
        { name: 'Инициация', type: TaskType.start },
        { name: 'Сбор требований', type: TaskType.decision },
        { name: 'Исполнение', type: TaskType.task },
        { name: 'Параллельная проверка', type: TaskType.parallel },
        { name: 'Согласование результата', type: TaskType.decision },
        { name: 'Закрытие этапа', type: TaskType.end },
      ];

      const createdTasks: Ref[] = [];
      for (let idx = 0; idx < taskSeeds.length; idx += 1) {
        const seed = taskSeeds[idx];
        const task = await prisma.task.create({
          data: {
            name: `${BULK_PREFIX} ${RUN_TAG} U${unit} ${process.name.split(' ').slice(-1)[0]} ${seed.name} ${idx + 1}`,
            description: `Задача "${seed.name}" в процессе "${process.name}"`,
            type: seed.type,
            processId: process.id,
            userId: owner.id,
            responsiblePositionId: sample(unitPositions).id,
            responsibleRoleId: sample(unitRoles).id,
            responsibleEmployeeId: maybe(sample(employees).id, 0.35),
          },
        });
        createdTasks.push(task);
        tasks.push(task);
      }

      if (createdTasks.length >= 4) {
        const components: number[] = [];
        for (let i = 0; i < createdTasks.length; i += 1) {
          const component = await prisma.taskComponent.create({
            data: {
              ownerProcessId: process.id,
              taskId: createdTasks[i].id,
              x: 100 + i * 280,
              y: 120 + unit * 6,
              width: 220,
              height: 84,
            },
          });
          components.push(component.id);
        }

        for (let i = 0; i < components.length - 1; i += 1) {
          await prisma.arrowComponent.create({
            data: {
              ownerProcessId: process.id,
              fromTaskComponentId: components[i],
              fromSide: DotSide.right,
              fromOffset: 0.5,
              toTaskComponentId: components[i + 1],
              toSide: DotSide.left,
              toOffset: 0.5,
            },
          });
        }
      }
    }
  }
  console.log(`⚙️ Created processes=${processes.length}, tasks=${tasks.length}`);

  const dataObjects: Ref[] = [];
  for (let i = 1; i <= DATA_OBJECTS_COUNT; i += 1) {
    const dataObject = await prisma.dataObject.create({
      data: {
        name: `${BULK_PREFIX} ${RUN_TAG} Документ ${i}`,
        description: `Связанный документ/артефакт процесса #${i}`,
        userId: owner.id,
      },
    });
    dataObjects.push(dataObject);
  }

  for (const process of processes) {
    const inputs = sampleManyUnique(dataObjects, 2);
    const outputs = sampleManyUnique(dataObjects.filter((d) => !inputs.some((i) => i.id === d.id)), 1);

    for (const dataObject of inputs) {
      await prisma.processData.create({
        data: {
          processId: process.id,
          dataObjectId: dataObject.id,
          type: DataFlowType.input,
        },
      });
    }

    for (const dataObject of outputs) {
      await prisma.processData.create({
        data: {
          processId: process.id,
          dataObjectId: dataObject.id,
          type: DataFlowType.output,
        },
      });
    }
  }

  for (const task of tasks) {
    const inObj = sample(dataObjects);
    const outObj = sample(dataObjects);
    await prisma.taskData.create({
      data: {
        taskId: task.id,
        dataObjectId: inObj.id,
        type: DataFlowType.input,
      },
    });
    if (outObj.id !== inObj.id) {
      await prisma.taskData.create({
        data: {
          taskId: task.id,
          dataObjectId: outObj.id,
          type: DataFlowType.output,
        },
      });
    }
  }
  console.log(`🧾 Created dataObjects=${dataObjects.length} and linked to processes/tasks`);

  const categoryNames = [
    `${BULK_PREFIX} ${RUN_TAG} Регламенты`,
    `${BULK_PREFIX} ${RUN_TAG} Чек-листы`,
    `${BULK_PREFIX} ${RUN_TAG} Обучение`,
    `${BULK_PREFIX} ${RUN_TAG} Практика`,
    `${BULK_PREFIX} ${RUN_TAG} Контроль качества`,
  ];
  const categories: Ref[] = [];
  for (const name of categoryNames) {
    const category = await prisma.materialCategory.create({
      data: {
        name,
        description: `Категория материалов: ${name}`,
        userId: owner.id,
      },
    });
    categories.push(category);
  }

  const materials: Ref[] = [];
  for (let i = 1; i <= MATERIALS_COUNT; i += 1) {
    const category = sample(categories);
    const material = await prisma.material.create({
      data: {
        name: `${BULK_PREFIX} ${RUN_TAG} Материал ${i}`,
        content: `# Материал ${i}\n\nКонтекст: операционная деятельность компании.\n\nШаги:\n1. Подготовка входных данных.\n2. Выполнение работ.\n3. Контроль результата.\n`,
        categoryId: category.id,
        userId: owner.id,
      },
    });
    materials.push(material);

    const linkedProcesses = sampleManyUnique(processes, 2);
    for (const process of linkedProcesses) {
      await prisma.processMaterial.create({
        data: {
          processId: process.id,
          materialId: material.id,
        },
      });
    }

    const linkedTasks = sampleManyUnique(tasks, 3);
    for (const task of linkedTasks) {
      await prisma.taskMaterial.create({
        data: {
          taskId: task.id,
          materialId: material.id,
        },
      });
    }
  }
  console.log(`📚 Created materials=${materials.length} with links`);

  const tests: Ref[] = [];
  let testCounter = 1;
  for (let unit = 1; unit <= UNIT_COUNT; unit += 1) {
    const unitEmployees = employees.filter((e) => e.fullName.includes(` ${unit}-`));
    const unitPositions = positions.filter((p) => p.name.includes(` U${unit} `));
    const unitProcesses = processes.filter((p) => p.name.includes(` U${unit} `));
    const unitTasks = tasks.filter((t) => t.name.includes(` U${unit} `));

    for (let i = 1; i <= TESTS_PER_UNIT; i += 1) {
      const linkedEmployees = sampleManyUnique(unitEmployees, Math.min(3, unitEmployees.length));
      const linkedPositions = sampleManyUnique(unitPositions, Math.min(2, unitPositions.length));
      const linkedProcesses = sampleManyUnique(unitProcesses, Math.min(2, unitProcesses.length));
      const linkedTasks = sampleManyUnique(unitTasks, Math.min(4, unitTasks.length));

      const test = await prisma.test.create({
        data: {
          name: `${BULK_PREFIX} ${RUN_TAG} Тест U${unit}-${i}`,
          description: `Проверка знаний сотрудников юнита ${unit}`,
          timeLimitMinutes: 30 + (i % 3) * 10,
          userId: owner.id,
          questions: {
            create: [
              {
                type: TestQuestionType.single_choice,
                title: `Какой вход обязателен перед стартом этапа U${unit}-${i}?`,
                description: 'Выберите один корректный вариант.',
                order: 1,
                options: {
                  create: [
                    { text: 'Согласованные требования', isCorrect: true, order: 1 },
                    { text: 'Устная договоренность без фиксации', isCorrect: false, order: 2 },
                    { text: 'Пустой шаблон', isCorrect: false, order: 3 },
                  ],
                },
              },
              {
                type: TestQuestionType.multiple_choice,
                title: `Какие признаки качественного handoff для U${unit}-${i}?`,
                order: 2,
                options: {
                  create: [
                    { text: 'Есть ответственная роль', isCorrect: true, order: 1 },
                    { text: 'Есть вход и выход задачи', isCorrect: true, order: 2 },
                    { text: 'Отсутствует контекст', isCorrect: false, order: 3 },
                    { text: 'Зафиксированы риски', isCorrect: true, order: 4 },
                  ],
                },
              },
              {
                type: TestQuestionType.text,
                title: `Опишите целевой результат процесса U${unit}-${i}`,
                order: 3,
                textAnswerPlaceholder: 'Кратко опишите критерий готовности',
                expectedTextAnswer: 'Результат этапа подтвержден и готов к передаче следующей роли.',
              },
              {
                type: TestQuestionType.single_choice,
                title: `Кто несет ответственность за качество результата U${unit}-${i}?`,
                order: 4,
                options: {
                  create: [
                    { text: 'Ответственная роль этапа', isCorrect: true, order: 1 },
                    { text: 'Случайный участник команды', isCorrect: false, order: 2 },
                    { text: 'Внешний наблюдатель', isCorrect: false, order: 3 },
                  ],
                },
              },
              {
                type: TestQuestionType.multiple_choice,
                title: `Что должно быть в статус-отчете U${unit}-${i}?`,
                order: 5,
                options: {
                  create: [
                    { text: 'Статус и блокеры', isCorrect: true, order: 1 },
                    { text: 'План действий', isCorrect: true, order: 2 },
                    { text: 'Метрики качества', isCorrect: true, order: 3 },
                    { text: 'Субъективные мнения без фактов', isCorrect: false, order: 4 },
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
      tests.push(test);
      testCounter += 1;

      const assignees = linkedEmployees.slice(0, Math.min(2, linkedEmployees.length));
      for (const assignee of assignees) {
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
            durationSeconds: 900 + Math.floor(Math.random() * 1200),
            hintsUsed: Math.floor(Math.random() * 3),
            hintsTotal: 3,
          },
        });
      }
    }
  }
  console.log(`📝 Created tests=${tests.length} with results`);

  const stats = await Promise.all([
    prisma.user.count({ where: { ownerUserId: owner.id } }),
    prisma.position.count({ where: { userId: owner.id } }),
    prisma.role.count({ where: { userId: owner.id } }),
    prisma.employee.count({ where: { userId: owner.id } }),
    prisma.process.count({ where: { userId: owner.id } }),
    prisma.task.count({ where: { userId: owner.id } }),
    prisma.dataObject.count({ where: { userId: owner.id } }),
    prisma.material.count({ where: { userId: owner.id } }),
    prisma.test.count({ where: { userId: owner.id } }),
  ]);

  console.log('✅ Bulk seeding complete');
  console.log(
    `📊 Owner scope totals -> accounts:${stats[0]} positions:${stats[1]} roles:${stats[2]} employees:${stats[3]} processes:${stats[4]} tasks:${stats[5]} dataObjects:${stats[6]} materials:${stats[7]} tests:${stats[8]}`,
  );
  console.log(`🔐 Default demo password for generated users: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('❌ Bulk seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
