import {
  DataFlowType,
  PrismaClient,
  TaskType,
  TestQuestionType,
  UserActorType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const OWNER_LOGIN = 'admin';
const OWNER_EMAIL = 'admin@mail.com';
const DEFAULT_PASSWORD = '123456';

interface QuestionSeed {
  type: TestQuestionType;
  title: string;
  description?: string;
  isRequired?: boolean;
  textAnswerPlaceholder?: string;
  expectedTextAnswer?: string;
  options?: Array<{
    text: string;
    isCorrect: boolean;
  }>;
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

function buildQuestions(scope: string): QuestionSeed[] {
  return [
    {
      type: TestQuestionType.single_choice,
      title: `Кто принимает итоговое решение по этапу \"${scope}\"?`,
      description: 'Ориентируйтесь на зону ответственности в процессе.',
      options: [
        { text: 'Ответственный менеджер продукта', isCorrect: true },
        { text: 'Любой сотрудник команды', isCorrect: false },
        { text: 'Только внешний заказчик без участия команды', isCorrect: false },
      ],
    },
    {
      type: TestQuestionType.single_choice,
      title: `Какой артефакт обязателен на входе в этап \"${scope}\"?`,
      options: [
        { text: 'Согласованные требования', isCorrect: true },
        { text: 'Только устная договоренность', isCorrect: false },
        { text: 'Пустой шаблон без заполнения', isCorrect: false },
      ],
    },
    {
      type: TestQuestionType.multiple_choice,
      title: `Выберите обязательные действия контроля качества в \"${scope}\"`,
      description: 'Нужно выбрать все корректные варианты.',
      options: [
        { text: 'Проверка критериев приемки', isCorrect: true },
        { text: 'Фиксация рисков и блокеров', isCorrect: true },
        { text: 'Пропуск документирования изменений', isCorrect: false },
        { text: 'Проверка трассировки требований', isCorrect: true },
      ],
    },
    {
      type: TestQuestionType.single_choice,
      title: `Когда задача этапа \"${scope}\" считается завершенной?`,
      options: [
        { text: 'Когда выполнены DoD и обновлена документация', isCorrect: true },
        { text: 'Когда разработчик сказал, что все готово', isCorrect: false },
        { text: 'Когда прошел один день после начала работы', isCorrect: false },
      ],
    },
    {
      type: TestQuestionType.text,
      title: `Напишите ключевой принцип передачи задачи в \"${scope}\"`,
      description: 'Коротко, одним предложением.',
      textAnswerPlaceholder: 'Например: передаем задачу только с полным контекстом...',
      expectedTextAnswer: 'Передача задачи выполняется только с полным контекстом и критериями приемки.',
    },
    {
      type: TestQuestionType.multiple_choice,
      title: `Какие данные должны быть в отчете по этапу \"${scope}\"?`,
      options: [
        { text: 'Статус выполнения', isCorrect: true },
        { text: 'Метрики качества', isCorrect: true },
        { text: 'Риски и план действий', isCorrect: true },
        { text: 'Личные заметки без связи с задачей', isCorrect: false },
      ],
    },
    {
      type: TestQuestionType.single_choice,
      title: `Какой подход правильный при обнаружении критичного дефекта в \"${scope}\"?`,
      options: [
        { text: 'Зафиксировать дефект, оценить влияние, уведомить ответственных', isCorrect: true },
        { text: 'Скрыть дефект до релиза', isCorrect: false },
        { text: 'Удалить задачу из трекера', isCorrect: false },
      ],
    },
    {
      type: TestQuestionType.text,
      title: `Укажите целевой результат этапа \"${scope}\"`,
      textAnswerPlaceholder: 'Например: релизный пакет готов и подтвержден...',
      expectedTextAnswer: 'Результат этапа подтвержден ответственными и готов к следующему шагу процесса.',
    },
    {
      type: TestQuestionType.single_choice,
      title: `Кто отвечает за актуальность связанной документации в \"${scope}\"?`,
      options: [
        { text: 'Ответственная роль этапа', isCorrect: true },
        { text: 'Только HR-отдел', isCorrect: false },
        { text: 'Любой наблюдатель процесса', isCorrect: false },
      ],
    },
    {
      type: TestQuestionType.multiple_choice,
      title: `Какие признаки у корректно подготовленного handoff в \"${scope}\"?`,
      options: [
        { text: 'Есть входные данные', isCorrect: true },
        { text: 'Есть ожидаемый выход', isCorrect: true },
        { text: 'Есть ответственный исполнитель', isCorrect: true },
        { text: 'Нет описания контекста', isCorrect: false },
      ],
    },
    {
      type: TestQuestionType.single_choice,
      title: `Что делать при изменении требований во время \"${scope}\"?`,
      options: [
        { text: 'Повторно согласовать влияние и обновить задачи', isCorrect: true },
        { text: 'Игнорировать изменения до конца спринта', isCorrect: false },
        { text: 'Удалить старые требования без фиксации', isCorrect: false },
      ],
    },
    {
      type: TestQuestionType.multiple_choice,
      title: `Выберите корректные практики коммуникации для \"${scope}\"`,
      options: [
        { text: 'Фиксировать решения письменно', isCorrect: true },
        { text: 'Синхронизировать участников по статусу', isCorrect: true },
        { text: 'Скрывать риски до ретро', isCorrect: false },
        { text: 'Эскалировать блокеры своевременно', isCorrect: true },
      ],
    },
  ];
}

async function createTestResultForUser(params: {
  testId: number;
  userId: number;
  correctnessFactor: number;
  durationSeconds: number;
}) {
  const { testId, userId, correctnessFactor, durationSeconds } = params;

  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: {
          options: {
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

  if (!test) return;

  const answers = test.questions.map((question, index) => {
    const shouldBeCorrect = index % 100 < correctnessFactor * 100;
    const usedHint = Boolean(question.description?.trim()) && index % 3 === 0;

    if (question.type === TestQuestionType.text) {
      const expected = question.expectedTextAnswer?.trim() ?? '';
      return {
        questionId: question.id,
        selectedOptionIds: [] as number[],
        textAnswer: shouldBeCorrect ? expected : 'Требуется дополнительная проработка ответа.',
        isCorrect: expected ? shouldBeCorrect : null,
        usedHint,
      };
    }

    const correctOptions = question.options.filter((option) => option.isCorrect);
    const wrongOptions = question.options.filter((option) => !option.isCorrect);

    if (question.type === TestQuestionType.single_choice) {
      const selected = shouldBeCorrect
        ? correctOptions.slice(0, 1)
        : (wrongOptions.slice(0, 1).length > 0 ? wrongOptions.slice(0, 1) : correctOptions.slice(0, 1));
      return {
        questionId: question.id,
        selectedOptionIds: selected.map((option) => option.id),
        textAnswer: null,
        isCorrect: shouldBeCorrect,
        usedHint,
      };
    }

    const selected = shouldBeCorrect
      ? correctOptions
      : [...correctOptions.slice(0, Math.max(1, correctOptions.length - 1)), ...wrongOptions.slice(0, 1)];

    const selectedIds = Array.from(new Set(selected.map((option) => option.id)));

    return {
      questionId: question.id,
      selectedOptionIds: selectedIds,
      textAnswer: null,
      isCorrect: shouldBeCorrect,
      usedHint,
    };
  });

  const evaluatedAnswers = answers.filter((answer) => answer.isCorrect !== null);
  const correctAnswers = evaluatedAnswers.filter((answer) => answer.isCorrect === true).length;
  const evaluatedQuestions = evaluatedAnswers.length;
  const percentage = evaluatedQuestions > 0
    ? Math.round((correctAnswers / evaluatedQuestions) * 10000) / 100
    : 0;
  const hintsUsed = answers.filter((answer) => answer.usedHint).length;
  const hintsTotal = test.questions.filter((question) => Boolean(question.description?.trim())).length;

  const testResult = await prisma.testResult.create({
    data: {
      testId,
      userId,
      score: correctAnswers,
      correctAnswers,
      evaluatedQuestions,
      totalQuestions: test.questions.length,
      percentage,
      durationSeconds,
      hintsUsed,
      hintsTotal,
    },
  });

  await prisma.testResultAnswer.createMany({
    data: answers.map((answer) => ({
      testResultId: testResult.id,
      questionId: answer.questionId,
      selectedOptionIds: answer.selectedOptionIds,
      textAnswer: answer.textAnswer,
      isCorrect: answer.isCorrect,
      usedHint: answer.usedHint,
    })),
  });
}

async function createDemoDiagrams(params: {
  processMap: Map<string, { id: number; name: string }>;
  taskMap: Map<string, { id: number; name: string }>;
}) {
  const { processMap, taskMap } = params;

  const productProcess = processMap.get('product-dev');
  const supportProcess = processMap.get('support');

  const startTask = taskMap.get('Старт процесса');
  const requirementsTask = taskMap.get('Согласование требований');
  const implementationTask = taskMap.get('Реализация и code review');
  const qaTask = taskMap.get('Регрессионное тестирование');
  const releaseTask = taskMap.get('Релиз и мониторинг');

  if (
    !productProcess
    || !supportProcess
    || !startTask
    || !requirementsTask
    || !implementationTask
    || !qaTask
    || !releaseTask
  ) {
    throw new Error('Cannot create demo diagrams: required processes/tasks are missing');
  }

  // Схема процесса: Разработка новой функции
  const productStartComponent = await prisma.taskComponent.create({
    data: {
      ownerProcessId: productProcess.id,
      taskId: startTask.id,
      x: 80,
      y: 140,
      width: 220,
      height: 84,
    },
  });

  const productRequirementsComponent = await prisma.taskComponent.create({
    data: {
      ownerProcessId: productProcess.id,
      taskId: requirementsTask.id,
      x: 360,
      y: 140,
      width: 260,
      height: 84,
    },
  });

  const productImplementationComponent = await prisma.taskComponent.create({
    data: {
      ownerProcessId: productProcess.id,
      taskId: implementationTask.id,
      x: 680,
      y: 140,
      width: 280,
      height: 84,
    },
  });

  const productQaComponent = await prisma.taskComponent.create({
    data: {
      ownerProcessId: productProcess.id,
      taskId: qaTask.id,
      x: 1020,
      y: 140,
      width: 300,
      height: 84,
    },
  });

  const productSupportProcessComponent = await prisma.processComponent.create({
    data: {
      ownerProcessId: productProcess.id,
      processId: supportProcess.id,
      x: 1380,
      y: 132,
      width: 280,
      height: 96,
    },
  });

  await prisma.arrowComponent.createMany({
    data: [
      {
        ownerProcessId: productProcess.id,
        fromTaskComponentId: productStartComponent.id,
        fromSide: 'right',
        fromOffset: 0.5,
        toTaskComponentId: productRequirementsComponent.id,
        toSide: 'left',
        toOffset: 0.5,
      },
      {
        ownerProcessId: productProcess.id,
        fromTaskComponentId: productRequirementsComponent.id,
        fromSide: 'right',
        fromOffset: 0.5,
        toTaskComponentId: productImplementationComponent.id,
        toSide: 'left',
        toOffset: 0.5,
      },
      {
        ownerProcessId: productProcess.id,
        fromTaskComponentId: productImplementationComponent.id,
        fromSide: 'right',
        fromOffset: 0.5,
        toTaskComponentId: productQaComponent.id,
        toSide: 'left',
        toOffset: 0.5,
      },
      {
        ownerProcessId: productProcess.id,
        fromTaskComponentId: productQaComponent.id,
        fromSide: 'right',
        fromOffset: 0.5,
        toProcessComponentId: productSupportProcessComponent.id,
        toSide: 'left',
        toOffset: 0.5,
      },
    ],
  });

  // Схема процесса: Поддержка и инциденты
  const supportInputProcessComponent = await prisma.processComponent.create({
    data: {
      ownerProcessId: supportProcess.id,
      processId: productProcess.id,
      x: 90,
      y: 130,
      width: 300,
      height: 96,
    },
  });

  const supportReleaseTaskComponent = await prisma.taskComponent.create({
    data: {
      ownerProcessId: supportProcess.id,
      taskId: releaseTask.id,
      x: 470,
      y: 136,
      width: 320,
      height: 84,
    },
  });

  await prisma.arrowComponent.create({
    data: {
      ownerProcessId: supportProcess.id,
      fromProcessComponentId: supportInputProcessComponent.id,
      fromSide: 'right',
      fromOffset: 0.5,
      toTaskComponentId: supportReleaseTaskComponent.id,
      toSide: 'left',
      toOffset: 0.5,
    },
  });
}

async function main() {
  console.log('🌱 Starting seed...');

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
  console.log('🧹 Old owner data cleaned');

  const positionsSeed = [
    'Менеджер продукта',
    'Бизнес-аналитик',
    'Разработчик',
    'QA инженер',
    'DevOps инженер',
  ];

  const rolesSeed = [
    { name: 'Владелец процесса', description: 'Отвечает за конечный результат процесса и KPI.' },
    { name: 'Системный аналитик', description: 'Формирует и уточняет требования, поддерживает трассировку.' },
    { name: 'Технический лидер', description: 'Отвечает за архитектурные решения и качество реализации.' },
    { name: 'Лидер тестирования', description: 'Отвечает за тестовую стратегию и качество релиза.' },
    { name: 'Эксплуатация', description: 'Отвечает за устойчивость, мониторинг и инциденты.' },
  ];

  const positions = new Map<string, { id: number; name: string }>();
  for (const name of positionsSeed) {
    const position = await prisma.position.create({
      data: {
        name,
        userId: owner.id,
      },
    });
    positions.set(name, position);
  }

  const roles = new Map<string, { id: number; name: string }>();
  for (const roleSeed of rolesSeed) {
    const role = await prisma.role.create({
      data: {
        name: roleSeed.name,
        description: roleSeed.description,
        userId: owner.id,
      },
    });
    roles.set(roleSeed.name, role);
  }
  console.log(`💼 Created ${positions.size} positions and ${roles.size} roles`);

  const employeesSeed = [
    {
      fullName: 'Мария Соколова',
      email: 'm.sokolova@example.com',
      phone: '+79001110001',
      address: 'Екатеринбург, ул. Малышева, 18',
      birthDate: new Date('1991-02-14'),
      hireDate: new Date('2023-01-16'),
      position: 'Менеджер продукта',
      role: 'Владелец процесса',
      login: 'employee.maria',
    },
    {
      fullName: 'Артем Крылов',
      email: 'a.krylov@example.com',
      phone: '+79001110002',
      address: 'Екатеринбург, ул. Ленина, 44',
      birthDate: new Date('1990-08-03'),
      hireDate: new Date('2022-11-01'),
      position: 'Бизнес-аналитик',
      role: 'Системный аналитик',
      login: 'employee.artem',
    },
    {
      fullName: 'Иван Петров',
      email: 'i.petrov@example.com',
      phone: '+79001110003',
      address: 'Екатеринбург, ул. Радищева, 9',
      birthDate: new Date('1993-06-22'),
      hireDate: new Date('2021-09-13'),
      position: 'Разработчик',
      role: 'Технический лидер',
      login: 'employee.ivan',
    },
    {
      fullName: 'Ольга Смирнова',
      email: 'o.smirnova@example.com',
      phone: '+79001110004',
      address: 'Екатеринбург, ул. Куйбышева, 27',
      birthDate: new Date('1994-12-11'),
      hireDate: new Date('2022-03-05'),
      position: 'QA инженер',
      role: 'Лидер тестирования',
      login: 'employee.olga',
    },
    {
      fullName: 'Дмитрий Орлов',
      email: 'd.orlov@example.com',
      phone: '+79001110005',
      address: 'Екатеринбург, ул. Щорса, 51',
      birthDate: new Date('1989-10-30'),
      hireDate: new Date('2020-04-20'),
      position: 'DevOps инженер',
      role: 'Эксплуатация',
      login: 'employee.dmitry',
    },
  ];

  const employeePasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const employees = new Map<string, { id: number; userAccountId: number }>();

  for (const employeeSeed of employeesSeed) {
    const position = positions.get(employeeSeed.position);
    const role = roles.get(employeeSeed.role);
    if (!position || !role) {
      throw new Error(`Missing position/role for employee ${employeeSeed.fullName}`);
    }

    const employee = await prisma.employee.create({
      data: {
        fullName: employeeSeed.fullName,
        email: employeeSeed.email,
        phone: employeeSeed.phone,
        address: employeeSeed.address,
        birthDate: employeeSeed.birthDate,
        hireDate: employeeSeed.hireDate,
        positionId: position.id,
        roleId: role.id,
        userId: owner.id,
      },
    });

    const account = await prisma.user.create({
      data: {
        login: employeeSeed.login,
        email: employeeSeed.email,
        password: employeePasswordHash,
        visiblePassword: DEFAULT_PASSWORD,
        actorType: UserActorType.EMPLOYEE,
        ownerUserId: owner.id,
        employeeProfileId: employee.id,
      },
    });

    employees.set(employeeSeed.login, { id: employee.id, userAccountId: account.id });
  }
  console.log(`👥 Created ${employees.size} employees + personal accounts`);

  const processesSeed = [
    {
      key: 'product-dev',
      name: 'Разработка новой функции',
      description: 'Сквозной процесс вывода бизнес-функции от запроса до релиза.',
      goal: 'Подготовить, реализовать и выпустить новую бизнес-функцию с контролем качества.',
      parentKey: null as string | null,
      responsiblePosition: 'Менеджер продукта',
      responsibleRole: 'Владелец процесса',
    },
    {
      key: 'analysis',
      name: 'Анализ требований',
      description: 'Сбор, уточнение и согласование бизнес-требований.',
      goal: 'Сформировать согласованный пакет требований для разработки.',
      parentKey: 'product-dev' as string | null,
      responsiblePosition: 'Бизнес-аналитик',
      responsibleRole: 'Системный аналитик',
    },
    {
      key: 'implementation',
      name: 'Разработка и code review',
      description: 'Реализация функциональности и внутренний контроль качества кода.',
      goal: 'Подготовить стабильную реализацию, готовую к тестированию.',
      parentKey: 'product-dev' as string | null,
      responsiblePosition: 'Разработчик',
      responsibleRole: 'Технический лидер',
    },
    {
      key: 'qa-release',
      name: 'Тестирование и релиз',
      description: 'Проведение функционального тестирования и выпуск релиза.',
      goal: 'Подтвердить качество и безопасно выпустить функциональность.',
      parentKey: 'product-dev' as string | null,
      responsiblePosition: 'QA инженер',
      responsibleRole: 'Лидер тестирования',
    },
    {
      key: 'support',
      name: 'Поддержка и инциденты',
      description: 'Мониторинг работы функционала и реагирование на инциденты.',
      goal: 'Обеспечить устойчивую работу сервиса после релиза.',
      parentKey: null as string | null,
      responsiblePosition: 'DevOps инженер',
      responsibleRole: 'Эксплуатация',
    },
  ];

  const processMap = new Map<string, { id: number; name: string }>();
  for (const processSeed of processesSeed) {
    const responsiblePosition = positions.get(processSeed.responsiblePosition);
    const responsibleRole = roles.get(processSeed.responsibleRole);
    if (!responsiblePosition || !responsibleRole) {
      throw new Error(`Missing position/role for process ${processSeed.name}`);
    }

    const parentId = processSeed.parentKey ? processMap.get(processSeed.parentKey)?.id ?? null : null;

    const process = await prisma.process.create({
      data: {
        name: processSeed.name,
        description: processSeed.description,
        goal: processSeed.goal,
        parentId,
        userId: owner.id,
        responsiblePositionId: responsiblePosition.id,
        responsibleRoleId: responsibleRole.id,
      },
    });

    processMap.set(processSeed.key, process);
  }
  console.log(`⚙️ Created ${processMap.size} processes`);

  const tasksSeed = [
    {
      name: 'Старт процесса',
      description: 'Инициация разработки и постановка целей этапа.',
      type: TaskType.start,
      processKey: 'product-dev',
      responsiblePosition: 'Менеджер продукта',
      responsibleRole: 'Владелец процесса',
    },
    {
      name: 'Согласование требований',
      description: 'Проверка полноты и согласования требований с заинтересованными сторонами.',
      type: TaskType.decision,
      processKey: 'analysis',
      responsiblePosition: 'Бизнес-аналитик',
      responsibleRole: 'Системный аналитик',
    },
    {
      name: 'Реализация и code review',
      description: 'Разработка функциональности и внутреннее ревью перед передачей в тестирование.',
      type: TaskType.task,
      processKey: 'implementation',
      responsiblePosition: 'Разработчик',
      responsibleRole: 'Технический лидер',
    },
    {
      name: 'Регрессионное тестирование',
      description: 'Параллельная проверка новых и затронутых сценариев.',
      type: TaskType.parallel,
      processKey: 'qa-release',
      responsiblePosition: 'QA инженер',
      responsibleRole: 'Лидер тестирования',
    },
    {
      name: 'Релиз и мониторинг',
      description: 'Выпуск релиза, мониторинг метрик и закрытие процесса.',
      type: TaskType.end,
      processKey: 'support',
      responsiblePosition: 'DevOps инженер',
      responsibleRole: 'Эксплуатация',
    },
  ];

  const taskMap = new Map<string, { id: number; name: string }>();
  for (const taskSeed of tasksSeed) {
    const process = processMap.get(taskSeed.processKey);
    const responsiblePosition = positions.get(taskSeed.responsiblePosition);
    const responsibleRole = roles.get(taskSeed.responsibleRole);

    if (!process || !responsiblePosition || !responsibleRole) {
      throw new Error(`Missing refs for task ${taskSeed.name}`);
    }

    const task = await prisma.task.create({
      data: {
        name: taskSeed.name,
        description: taskSeed.description,
        type: taskSeed.type,
        processId: process.id,
        userId: owner.id,
        responsiblePositionId: responsiblePosition.id,
        responsibleRoleId: responsibleRole.id,
      },
    });

    taskMap.set(taskSeed.name, task);
  }
  console.log(`🧩 Created ${taskMap.size} tasks`);

  await createDemoDiagrams({
    processMap,
    taskMap,
  });
  console.log('🗺️ Created demo diagrams for processes: Разработка новой функции, Поддержка и инциденты');

  const dataObjectsSeed = [
    { name: 'Запрос на изменение', description: 'Инициирующий запрос от бизнеса или клиента.' },
    { name: 'Бизнес-требования', description: 'Согласованные требования к новой функции.' },
    { name: 'Техническое задание', description: 'Детализированная постановка для разработки.' },
    { name: 'Исходный код', description: 'Результат реализации функциональности.' },
    { name: 'Тест-кейсы', description: 'Набор тестовых сценариев.' },
    { name: 'Протокол тестирования', description: 'Итоговый отчет о тестировании.' },
    { name: 'Релизный пакет', description: 'Собранные артефакты для поставки.' },
    { name: 'Метрики мониторинга', description: 'Технические и бизнес-метрики после релиза.' },
    { name: 'Отчет об инциденте', description: 'Описание инцидента, влияния и причин.' },
    { name: 'План отката', description: 'План возврата к стабильной версии.' },
  ];

  const dataObjects = new Map<string, { id: number }>();
  for (const dataObjectSeed of dataObjectsSeed) {
    const dataObject = await prisma.dataObject.create({
      data: {
        name: dataObjectSeed.name,
        description: dataObjectSeed.description,
        userId: owner.id,
      },
    });
    dataObjects.set(dataObjectSeed.name, dataObject);
  }

  const processDataLinks: Array<{ processKey: string; objectName: string; type: DataFlowType }> = [
    { processKey: 'product-dev', objectName: 'Запрос на изменение', type: DataFlowType.input },
    { processKey: 'product-dev', objectName: 'Бизнес-требования', type: DataFlowType.input },
    { processKey: 'product-dev', objectName: 'Релизный пакет', type: DataFlowType.output },
    { processKey: 'analysis', objectName: 'Запрос на изменение', type: DataFlowType.input },
    { processKey: 'analysis', objectName: 'Бизнес-требования', type: DataFlowType.output },
    { processKey: 'implementation', objectName: 'Бизнес-требования', type: DataFlowType.input },
    { processKey: 'implementation', objectName: 'Техническое задание', type: DataFlowType.input },
    { processKey: 'implementation', objectName: 'Исходный код', type: DataFlowType.output },
    { processKey: 'qa-release', objectName: 'Исходный код', type: DataFlowType.input },
    { processKey: 'qa-release', objectName: 'Тест-кейсы', type: DataFlowType.input },
    { processKey: 'qa-release', objectName: 'Протокол тестирования', type: DataFlowType.output },
    { processKey: 'qa-release', objectName: 'Релизный пакет', type: DataFlowType.output },
    { processKey: 'support', objectName: 'Метрики мониторинга', type: DataFlowType.input },
    { processKey: 'support', objectName: 'Отчет об инциденте', type: DataFlowType.input },
    { processKey: 'support', objectName: 'План отката', type: DataFlowType.output },
  ];

  for (const link of processDataLinks) {
    const process = processMap.get(link.processKey);
    const dataObject = dataObjects.get(link.objectName);
    if (!process || !dataObject) continue;

    await prisma.processData.create({
      data: {
        processId: process.id,
        dataObjectId: dataObject.id,
        type: link.type,
      },
    });
  }

  const taskDataLinks: Array<{ taskName: string; objectName: string; type: DataFlowType }> = [
    { taskName: 'Старт процесса', objectName: 'Запрос на изменение', type: DataFlowType.input },
    { taskName: 'Старт процесса', objectName: 'Бизнес-требования', type: DataFlowType.output },
    { taskName: 'Согласование требований', objectName: 'Бизнес-требования', type: DataFlowType.input },
    { taskName: 'Согласование требований', objectName: 'Техническое задание', type: DataFlowType.output },
    { taskName: 'Реализация и code review', objectName: 'Техническое задание', type: DataFlowType.input },
    { taskName: 'Реализация и code review', objectName: 'Исходный код', type: DataFlowType.output },
    { taskName: 'Реализация и code review', objectName: 'Тест-кейсы', type: DataFlowType.output },
    { taskName: 'Регрессионное тестирование', objectName: 'Исходный код', type: DataFlowType.input },
    { taskName: 'Регрессионное тестирование', objectName: 'Тест-кейсы', type: DataFlowType.input },
    { taskName: 'Регрессионное тестирование', objectName: 'Протокол тестирования', type: DataFlowType.output },
    { taskName: 'Релиз и мониторинг', objectName: 'Протокол тестирования', type: DataFlowType.input },
    { taskName: 'Релиз и мониторинг', objectName: 'Релизный пакет', type: DataFlowType.input },
    { taskName: 'Релиз и мониторинг', objectName: 'Метрики мониторинга', type: DataFlowType.output },
  ];

  for (const link of taskDataLinks) {
    const task = taskMap.get(link.taskName);
    const dataObject = dataObjects.get(link.objectName);
    if (!task || !dataObject) continue;

    await prisma.taskData.create({
      data: {
        taskId: task.id,
        dataObjectId: dataObject.id,
        type: link.type,
      },
    });
  }
  console.log(`🧾 Created ${processDataLinks.length} process-data links and ${taskDataLinks.length} task-data links`);

  const categories = await Promise.all([
    prisma.materialCategory.create({
      data: {
        name: 'Онбординг',
        description: 'Материалы для первичного погружения в процессы компании.',
        userId: owner.id,
      },
    }),
    prisma.materialCategory.create({
      data: {
        name: 'Регламенты',
        description: 'Нормативные инструкции и стандарты исполнения.',
        userId: owner.id,
      },
    }),
    prisma.materialCategory.create({
      data: {
        name: 'Практика команды',
        description: 'Прикладные инструкции и чек-листы.',
        userId: owner.id,
      },
    }),
  ]);

  const materialsSeed = [
    {
      name: 'Сбор и согласование требований',
      categoryId: categories[0].id,
      content: `# Сбор и согласование требований\n\n## Цель\nСобрать полные и согласованные требования до старта разработки.\n\n## Шаги\n1. Провести kickoff-встречу.\n2. Зафиксировать бизнес-цель и KPI.\n3. Согласовать критерии приемки.\n\n## Полезные ссылки\n- [BABOK Guide](https://www.iiba.org/babok-guide/)\n- [User story mapping](https://www.jpattonassociates.com/user-story-mapping/)\n\n![Схема требований](https://picsum.photos/seed/req-map/1200/500)\n\n[Видео: как фиксировать требования](https://www.youtube.com/watch?v=UAtzS2l8fUc)`,
      processKeys: ['product-dev', 'analysis'],
      taskNames: ['Старт процесса', 'Согласование требований'],
    },
    {
      name: 'Шаблон технического задания',
      categoryId: categories[1].id,
      content: `# Шаблон технического задания\n\nТЗ должно содержать:\n- контекст и цель;\n- функциональные требования;\n- нефункциональные ограничения;\n- тестовые сценарии.\n\n![Пример ТЗ](https://picsum.photos/seed/spec-template/1200/500)`,
      processKeys: ['analysis', 'implementation'],
      taskNames: ['Согласование требований', 'Реализация и code review'],
    },
    {
      name: 'Чек-лист code review',
      categoryId: categories[2].id,
      content: `# Чек-лист code review\n\n- Проверка архитектурных решений\n- Проверка безопасности\n- Проверка тестов\n- Проверка производительности\n\n[OWASP Top 10](https://owasp.org/www-project-top-ten/)`,
      processKeys: ['implementation'],
      taskNames: ['Реализация и code review'],
    },
    {
      name: 'Стратегия тестирования релиза',
      categoryId: categories[1].id,
      content: `# Стратегия тестирования релиза\n\n## Обязательные проверки\n- smoke\n- regression\n- проверка ролей\n- проверка интеграций\n\n![Релизная доска](https://picsum.photos/seed/release-qc/1200/500)\n\n[Видео: release testing](https://www.youtube.com/watch?v=5xV5f8m1zq4)`,
      processKeys: ['qa-release'],
      taskNames: ['Регрессионное тестирование'],
    },
    {
      name: 'Регламент выпуска релиза',
      categoryId: categories[1].id,
      content: `# Регламент выпуска релиза\n\n1. Подготовить changelog\n2. Проверить миграции\n3. Согласовать окно релиза\n4. Проверить план отката`,
      processKeys: ['qa-release', 'support'],
      taskNames: ['Релиз и мониторинг'],
    },
    {
      name: 'Мониторинг после релиза',
      categoryId: categories[2].id,
      content: `# Мониторинг после релиза\n\nСледим за:\n- error rate\n- latency\n- загрузкой сервисов\n- бизнес-метриками\n\n[Google SRE Book](https://sre.google/sre-book/table-of-contents/)`,
      processKeys: ['support'],
      taskNames: ['Релиз и мониторинг'],
    },
    {
      name: 'Управление инцидентами',
      categoryId: categories[0].id,
      content: `# Управление инцидентами\n\n- Классификация инцидента\n- Коммуникация с командами\n- RCA и корректирующие действия\n\n![Incident flow](https://picsum.photos/seed/incident-flow/1200/500)`,
      processKeys: ['support'],
      taskNames: ['Релиз и мониторинг'],
    },
    {
      name: 'Передача задач между ролями',
      categoryId: categories[2].id,
      content: `# Передача задач между ролями\n\nИспользуйте handoff-шаблон:\n\n\`\`\`\n[HANDOFF]\nОт: <роль>\nКому: <роль>\nЧто сделано: ...\nЧто проверить: ...\nРиски: ...\n\`\`\``,
      processKeys: ['product-dev', 'implementation', 'qa-release'],
      taskNames: ['Согласование требований', 'Реализация и code review', 'Регрессионное тестирование'],
    },
  ];

  const materials = new Map<string, { id: number }>();
  for (const materialSeed of materialsSeed) {
    const material = await prisma.material.create({
      data: {
        name: materialSeed.name,
        content: materialSeed.content,
        categoryId: materialSeed.categoryId,
        userId: owner.id,
      },
    });
    materials.set(materialSeed.name, material);

    for (const processKey of materialSeed.processKeys) {
      const process = processMap.get(processKey);
      if (!process) continue;
      await prisma.processMaterial.create({
        data: {
          processId: process.id,
          materialId: material.id,
        },
      });
    }

    for (const taskName of materialSeed.taskNames) {
      const task = taskMap.get(taskName);
      if (!task) continue;
      await prisma.taskMaterial.create({
        data: {
          taskId: task.id,
          materialId: material.id,
        },
      });
    }
  }
  console.log(`📚 Created ${materials.size} materials with process/task links`);

  const testsSeed = [
    {
      name: 'Тест: Анализ требований',
      description: 'Проверка знаний по сбору и согласованию требований.',
      timeLimitMinutes: 35,
      questionScope: 'Анализ требований',
      employeeLogins: ['employee.artem'],
      positionNames: ['Бизнес-аналитик'],
      processKeys: ['analysis'],
      taskNames: ['Согласование требований'],
    },
    {
      name: 'Тест: Разработка и code review',
      description: 'Проверка практик разработки и внутреннего ревью.',
      timeLimitMinutes: 40,
      questionScope: 'Разработка и code review',
      employeeLogins: ['employee.ivan'],
      positionNames: ['Разработчик'],
      processKeys: ['implementation'],
      taskNames: ['Реализация и code review'],
    },
    {
      name: 'Тест: Тестирование релиза',
      description: 'Проверка знаний по релизному тестированию.',
      timeLimitMinutes: 30,
      questionScope: 'Тестирование и релиз',
      employeeLogins: ['employee.olga'],
      positionNames: ['QA инженер'],
      processKeys: ['qa-release'],
      taskNames: ['Регрессионное тестирование'],
    },
    {
      name: 'Тест: Сквозной процесс новой функции',
      description: 'Комплексный тест по сквозному процессу разработки новой функции.',
      timeLimitMinutes: 45,
      questionScope: 'Сквозной процесс новой функции',
      employeeLogins: ['employee.maria', 'employee.artem'],
      positionNames: ['Менеджер продукта', 'Бизнес-аналитик'],
      processKeys: ['product-dev', 'analysis', 'implementation'],
      taskNames: ['Старт процесса', 'Согласование требований', 'Реализация и code review'],
    },
    {
      name: 'Тест: Поддержка и инциденты',
      description: 'Проверка процедур мониторинга и обработки инцидентов.',
      timeLimitMinutes: 30,
      questionScope: 'Поддержка и инциденты',
      employeeLogins: ['employee.dmitry'],
      positionNames: ['DevOps инженер'],
      processKeys: ['support'],
      taskNames: ['Релиз и мониторинг'],
    },
  ];

  const tests = new Map<string, { id: number }>();
  for (const testSeed of testsSeed) {
    const questions = buildQuestions(testSeed.questionScope);

    const test = await prisma.test.create({
      data: {
        name: testSeed.name,
        description: testSeed.description,
        timeLimitMinutes: testSeed.timeLimitMinutes,
        userId: owner.id,
        questions: {
          create: questions.map((question, questionIndex) => ({
            type: question.type,
            title: question.title,
            description: question.description,
            order: questionIndex + 1,
            isRequired: question.isRequired ?? true,
            textAnswerPlaceholder: question.textAnswerPlaceholder,
            expectedTextAnswer: question.expectedTextAnswer,
            options:
              question.options && question.options.length > 0
                ? {
                    create: question.options.map((option, optionIndex) => ({
                      text: option.text,
                      isCorrect: option.isCorrect,
                      order: optionIndex + 1,
                    })),
                  }
                : undefined,
          })),
        },
        employeeLinks: {
          create: testSeed.employeeLogins.map((login) => {
            const employee = employees.get(login);
            if (!employee) {
              throw new Error(`Employee not found for login ${login}`);
            }
            return { employeeId: employee.id };
          }),
        },
        positionLinks: {
          create: testSeed.positionNames.map((name) => {
            const position = positions.get(name);
            if (!position) {
              throw new Error(`Position not found: ${name}`);
            }
            return { positionId: position.id };
          }),
        },
        processLinks: {
          create: testSeed.processKeys.map((processKey) => {
            const process = processMap.get(processKey);
            if (!process) {
              throw new Error(`Process not found: ${processKey}`);
            }
            return { processId: process.id };
          }),
        },
        taskLinks: {
          create: testSeed.taskNames.map((taskName) => {
            const task = taskMap.get(taskName);
            if (!task) {
              throw new Error(`Task not found: ${taskName}`);
            }
            return { taskId: task.id };
          }),
        },
      },
    });

    tests.set(testSeed.name, test);
  }
  console.log(`📝 Created ${tests.size} tests (10-15 questions each)`);

  await createTestResultForUser({
    testId: tests.get('Тест: Анализ требований')!.id,
    userId: employees.get('employee.artem')!.userAccountId,
    correctnessFactor: 0.92,
    durationSeconds: 1180,
  });
  await createTestResultForUser({
    testId: tests.get('Тест: Разработка и code review')!.id,
    userId: employees.get('employee.ivan')!.userAccountId,
    correctnessFactor: 0.84,
    durationSeconds: 1420,
  });
  await createTestResultForUser({
    testId: tests.get('Тест: Тестирование релиза')!.id,
    userId: employees.get('employee.olga')!.userAccountId,
    correctnessFactor: 0.88,
    durationSeconds: 1290,
  });
  await createTestResultForUser({
    testId: tests.get('Тест: Сквозной процесс новой функции')!.id,
    userId: employees.get('employee.maria')!.userAccountId,
    correctnessFactor: 0.8,
    durationSeconds: 1700,
  });
  await createTestResultForUser({
    testId: tests.get('Тест: Поддержка и инциденты')!.id,
    userId: employees.get('employee.dmitry')!.userAccountId,
    correctnessFactor: 0.9,
    durationSeconds: 1100,
  });
  console.log('📊 Created demo test results for employee accounts');

  console.log('✅ Seeding complete');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
