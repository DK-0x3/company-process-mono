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

type MaterialArticle = {
  title: string;
  objective: string;
  sections: Array<{ heading: string; points: string[] }>;
  checklist: string[];
  links: string[];
  videoTitle: string;
  videoUrl: string;
};

const MATERIAL_ARTICLES: MaterialArticle[] = [
  {
    title: 'Стандарт передачи задач между ролями',
    objective: 'Снизить потери контекста между этапами процесса.',
    sections: [
      {
        heading: 'Когда передача считается корректной',
        points: [
          'Уточнены входные данные и ожидаемый результат.',
          'Назначен ответственный за приемку результата.',
          'Описаны риски и условия эскалации.',
        ],
      },
      {
        heading: 'Ключевые артефакты handoff',
        points: [
          'Карточка задачи с критериями готовности.',
          'Ссылка на актуальный регламент этапа.',
          'План коммуникации на время исполнения.',
        ],
      },
    ],
    checklist: [
      'Проверены критерии приемки.',
      'Срок и владелец этапа подтверждены.',
      'Изменения зафиксированы письменно.',
      'Риски и зависимости отмечены.',
    ],
    links: [
      '[ITIL Foundation overview](https://www.axelos.com/certifications/itil-service-management/itil-4-foundation)',
      '[RACI matrix guide](https://www.projectmanager.com/blog/raci-chart-made-simple)',
    ],
    videoTitle: 'Handoff между командами',
    videoUrl: 'https://www.youtube.com/watch?v=7xTGNNLPyMI',
  },
  {
    title: 'Шаблон плана внедрения',
    objective: 'Стандартизировать запуск изменений в эксплуатацию.',
    sections: [
      {
        heading: 'Что должно быть в плане',
        points: [
          'Окно внедрения и ответственные роли.',
          'Пошаговый сценарий запуска.',
          'План отката и контрольные точки.',
        ],
      },
      {
        heading: 'Управление рисками внедрения',
        points: [
          'Классификация рисков по влиянию и вероятности.',
          'Порог эскалации в штаб внедрения.',
          'Критерии остановки релиза.',
        ],
      },
    ],
    checklist: [
      'Согласован план отката.',
      'Проведен pre-release checklist.',
      'Утверждена коммуникация для пользователей.',
      'Настроен мониторинг после запуска.',
    ],
    links: [
      '[Deployment best practices](https://martinfowler.com/bliki/BlueGreenDeployment.html)',
      '[Release checklist example](https://www.atlassian.com/continuous-delivery/principles/release-management)',
    ],
    videoTitle: 'Как подготовить план релиза',
    videoUrl: 'https://www.youtube.com/watch?v=5xV5f8m1zq4',
  },
  {
    title: 'Чек-лист ревью результатов',
    objective: 'Повысить качество приемки результата перед переходом на следующий этап.',
    sections: [
      {
        heading: 'Проверка содержания',
        points: [
          'Результат соответствует исходной цели.',
          'Фиксированы ограничения и допущения.',
          'Подтверждены данные для последующего этапа.',
        ],
      },
      {
        heading: 'Проверка управляемости',
        points: [
          'Назначены владельцы доработок.',
          'Описаны метрики качества результата.',
          'Определен срок контрольной проверки.',
        ],
      },
    ],
    checklist: [
      'Есть ссылка на исходную постановку.',
      'Описаны изменения относительно базового плана.',
      'Есть заключение ответственной роли.',
      'Есть дата следующего контроля.',
    ],
    links: [
      '[Definition of Done](https://www.atlassian.com/agile/project-management/definition-of-done)',
      '[Quality gates in delivery](https://www.sonarsource.com/learn/quality-gate/)',
    ],
    videoTitle: 'Quality gate на этапе приемки',
    videoUrl: 'https://www.youtube.com/watch?v=OG4N2i4gS5M',
  },
  {
    title: 'Методика анализа отклонений',
    objective: 'Системно выявлять причины отклонений по срокам и качеству.',
    sections: [
      {
        heading: 'Как фиксировать отклонение',
        points: [
          'Отмечать факт, дату и затронутый этап.',
          'Оценивать влияние на downstream-процессы.',
          'Выделять первичные гипотезы причин.',
        ],
      },
      {
        heading: 'Подход к RCA',
        points: [
          'Использовать 5 Why для первичной диагностики.',
          'Привязывать выводы к фактическим метрикам.',
          'Назначать корректирующие действия с дедлайном.',
        ],
      },
    ],
    checklist: [
      'Собраны факты, а не предположения.',
      'Проверены альтернативные гипотезы.',
      'Назначен владелец корректирующего действия.',
      'Определена дата проверки эффекта.',
    ],
    links: [
      '[Root cause analysis methods](https://asq.org/quality-resources/root-cause-analysis)',
      '[5 Whys technique](https://www.mindtools.com/a3mi00v/5-whys)',
    ],
    videoTitle: 'Root cause analysis на практике',
    videoUrl: 'https://www.youtube.com/watch?v=2Xx7fSkt2iQ',
  },
  {
    title: 'Регламент эскалации рисков',
    objective: 'Обеспечить своевременную реакцию на критичные блокеры.',
    sections: [
      {
        heading: 'Уровни эскалации',
        points: [
          'Операционный уровень — внутри команды.',
          'Тактический уровень — руководитель направления.',
          'Стратегический уровень — комитет изменений.',
        ],
      },
      {
        heading: 'Триггеры эскалации',
        points: [
          'Отклонение сроков более чем на 10%.',
          'Падение ключевой метрики качества.',
          'Риск влияния на клиентский SLA.',
        ],
      },
    ],
    checklist: [
      'Риск классифицирован по приоритету.',
      'Определен канал эскалации.',
      'Зафиксировано решение по риску.',
      'Назначен контроль выполнения решения.',
    ],
    links: [
      '[Risk register basics](https://www.pmi.org/learning/library/risk-management-principles-practices-7366)',
      '[Operational risk management](https://www.iso.org/iso-31000-risk-management.html)',
    ],
    videoTitle: 'Как эскалировать риски без задержек',
    videoUrl: 'https://www.youtube.com/watch?v=miXmJ6t9W1Q',
  },
  {
    title: 'Практика документирования изменений',
    objective: 'Сделать историю изменений прозрачной и проверяемой.',
    sections: [
      {
        heading: 'Правила фиксации изменений',
        points: [
          'Каждое изменение должно иметь основание.',
          'Указывать затронутые этапы и артефакты.',
          'Фиксировать влияние на сроки и ресурсы.',
        ],
      },
      {
        heading: 'Минимальный формат записи',
        points: [
          'Дата и инициатор изменения.',
          'Описание сути и причины.',
          'Решение, согласование, дата вступления в силу.',
        ],
      },
    ],
    checklist: [
      'Заполнены все поля change-log.',
      'Указано влияние на KPI.',
      'Есть ссылка на согласование.',
      'Обновлены связанные документы.',
    ],
    links: [
      '[Change management process](https://www.servicenow.com/products/itsm/change-management.html)',
      '[Version control for docs](https://www.atlassian.com/git/tutorials/what-is-version-control)',
    ],
    videoTitle: 'Change log для операционных процессов',
    videoUrl: 'https://www.youtube.com/watch?v=USjZcfj8yxE',
  },
  {
    title: 'Шаблон итогового отчета этапа',
    objective: 'Унифицировать отчетность по завершенным этапам.',
    sections: [
      {
        heading: 'Структура отчета',
        points: [
          'Цель этапа и фактический результат.',
          'Сроки: план/факт и причины отклонений.',
          'Качество: метрики, дефекты, решения.',
        ],
      },
      {
        heading: 'Рекомендации по улучшению',
        points: [
          'Какие практики сработали.',
          'Какие риски повторяются.',
          'Что изменить в следующем цикле.',
        ],
      },
    ],
    checklist: [
      'Указаны KPI этапа.',
      'Есть раздел lessons learned.',
      'Указаны владельцы follow-up задач.',
      'Отчет согласован ответственным.',
    ],
    links: [
      '[Lessons learned template](https://www.projectmanager.com/blog/lessons-learned-template)',
      '[Post-mortem meeting guide](https://www.atlassian.com/incident-management/postmortem)',
    ],
    videoTitle: 'Как писать отчеты по этапам',
    videoUrl: 'https://www.youtube.com/watch?v=Qg8vSLDixu0',
  },
  {
    title: 'Гайд по коммуникации между командами',
    objective: 'Снизить задержки, вызванные несинхронизированной коммуникацией.',
    sections: [
      {
        heading: 'Базовые правила коммуникации',
        points: [
          'Фиксировать решения в общем канале.',
          'Разделять вопросы по приоритету и сроку ответа.',
          'Использовать единый формат статусов.',
        ],
      },
      {
        heading: 'План синхронизаций',
        points: [
          'Ежедневный статус по критичным задачам.',
          'Еженедельная синхронизация владельцев процессов.',
          'Эскалация блокеров в течение рабочего дня.',
        ],
      },
    ],
    checklist: [
      'Определены каналы коммуникации.',
      'Указано время SLA на ответы.',
      'Назначены ответственные за коммуникацию.',
      'Есть шаблон статус-сообщения.',
    ],
    links: [
      '[Team communication patterns](https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights/the-organization-blog/how-to-improve-team-communication)',
      '[Working agreements template](https://www.atlassian.com/team-playbook/plays/working-agreements)',
    ],
    videoTitle: 'Коммуникация в кросс-функциональных командах',
    videoUrl: 'https://www.youtube.com/watch?v=4x0fPZrPV3M',
  },
  {
    title: 'Памятка по качеству входных данных',
    objective: 'Минимизировать переработки из-за неполных или некорректных входов.',
    sections: [
      {
        heading: 'Что проверяем во входе',
        points: [
          'Полнота обязательных атрибутов.',
          'Актуальность источника данных.',
          'Согласованность с предыдущим этапом.',
        ],
      },
      {
        heading: 'Типичные ошибки',
        points: [
          'Несоответствие формата данных.',
          'Отсутствие владельца источника.',
          'Конфликт версий документа.',
        ],
      },
    ],
    checklist: [
      'Проведена валидация формата.',
      'Согласована версия документа.',
      'Есть подтверждение владельца данных.',
      'Входные данные архивированы.',
    ],
    links: [
      '[Data quality dimensions](https://www.ibm.com/topics/data-quality)',
      '[Data governance basics](https://www.collibra.com/us/en/knowledge-center/data-governance)',
    ],
    videoTitle: 'Проверка качества данных',
    videoUrl: 'https://www.youtube.com/watch?v=Oc9L6hY2FqY',
  },
  {
    title: 'Рекомендации по контролю сроков',
    objective: 'Улучшить прогнозируемость сроков исполнения этапов.',
    sections: [
      {
        heading: 'Планирование сроков',
        points: [
          'Оценивать задачи по единой шкале сложности.',
          'Выделять буфер на риски и согласования.',
          'Фиксировать контрольные точки заранее.',
        ],
      },
      {
        heading: 'Мониторинг исполнения',
        points: [
          'Сравнивать план/факт по каждому этапу.',
          'Отслеживать тренд задержек по ролям.',
          'Своевременно пересматривать приоритеты.',
        ],
      },
    ],
    checklist: [
      'Есть baseline-план.',
      'Определены контрольные точки.',
      'Есть правила репланирования.',
      'Фиксируются причины отклонений.',
    ],
    links: [
      '[Critical path method basics](https://www.projectmanager.com/guides/critical-path-method)',
      '[Schedule risk analysis](https://www.pmi.org/learning/library/project-schedule-risk-analysis-10317)',
    ],
    videoTitle: 'Контроль сроков в проектной деятельности',
    videoUrl: 'https://www.youtube.com/watch?v=7fNQmP0rR0M',
  },
  {
    title: 'Процедура инцидент-менеджмента',
    objective: 'Сократить время реакции и восстановления при инцидентах.',
    sections: [
      {
        heading: 'Жизненный цикл инцидента',
        points: [
          'Обнаружение и первичная диагностика.',
          'Локализация и минимизация ущерба.',
          'Восстановление и пост-инцидентный разбор.',
        ],
      },
      {
        heading: 'Роли в инциденте',
        points: [
          'Incident manager.',
          'Технический эксперт.',
          'Коммуникационный координатор.',
        ],
      },
    ],
    checklist: [
      'Открыт инцидент в системе учета.',
      'Назначен incident manager.',
      'Канал коммуникации создан.',
      'Подготовлен post-mortem.',
    ],
    links: [
      '[Incident management practice](https://www.atlassian.com/incident-management)',
      '[SRE incident response](https://sre.google/sre-book/handling-overload/)',
    ],
    videoTitle: 'Incident response в продуктовых командах',
    videoUrl: 'https://www.youtube.com/watch?v=9QJv8f9nY9Y',
  },
  {
    title: 'Регламент обратной связи',
    objective: 'Сделать обратную связь регулярной и применимой к улучшениям.',
    sections: [
      {
        heading: 'Как собирать обратную связь',
        points: [
          'Фиксировать факты и наблюдаемые эффекты.',
          'Использовать формат: факт -> влияние -> предложение.',
          'Не смешивать обратную связь и оценку личности.',
        ],
      },
      {
        heading: 'Как превращать фидбек в улучшения',
        points: [
          'Приоритизировать темы по влиянию на KPI.',
          'Назначать владельцев изменений.',
          'Проверять эффект на следующем цикле.',
        ],
      },
    ],
    checklist: [
      'Фидбек структурирован по шаблону.',
      'Назначен ответственный за обработку.',
      'Определен срок внедрения изменений.',
      'Эффект изменений зафиксирован.',
    ],
    links: [
      '[Retrospective techniques](https://www.atlassian.com/team-playbook/plays/retrospective)',
      '[Feedback model SBI](https://www.ccl.org/articles/leading-effectively-articles/closing-the-gap-between-intent-vs-impact-sbi-feedback-model/)',
    ],
    videoTitle: 'Как давать полезную обратную связь',
    videoUrl: 'https://www.youtube.com/watch?v=7m6P4R4lU8A',
  },
];

type TestQuestionSeed = {
  type: TestQuestionType;
  title: string;
  description?: string;
  textAnswerPlaceholder?: string;
  expectedTextAnswer?: string;
  options?: Array<{ text: string; isCorrect: boolean }>;
};

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

function buildMaterialContent(params: {
  article: MaterialArticle;
  unitName: string;
  processNames: string[];
  taskNames: string[];
  experts: string[];
}): string {
  const { article, unitName, processNames, taskNames, experts } = params;
  const processBlock = processNames.map((p) => `- ${p}`).join('\n');
  const taskBlock = taskNames.map((t) => `- ${t}`).join('\n');
  const expertsBlock = experts.map((e) => `- ${e}`).join('\n');
  const sectionsBlock = article.sections
    .map(
      (section) =>
        `## ${section.heading}\n${section.points.map((point) => `- ${point}`).join('\n')}`,
    )
    .join('\n\n');

  const checklistBlock = article.checklist.map((item) => `- [ ] ${item}`).join('\n');
  const linksBlock = article.links.map((link) => `- ${link}`).join('\n');

  return `# ${article.title}

**Подразделение:** ${unitName}  
**Цель материала:** ${article.objective}

## Где применяется
### Процессы
${processBlock}

### Этапы и задачи
${taskBlock}

## Ответственные эксперты
${expertsBlock}

${sectionsBlock}

## Контрольный чек-лист
${checklistBlock}

## Рекомендуемые внешние источники
${linksBlock}

## Видео по теме
[${article.videoTitle}](${article.videoUrl})
`;
}

function buildQuestionsForTest(params: {
  unitName: string;
  processNames: string[];
  experts: string[];
  testIndex: number;
}): TestQuestionSeed[] {
  const { unitName, processNames, experts, testIndex } = params;
  const processA = processNames[0] ?? 'Ключевой процесс';
  const processB = processNames[1] ?? processA;
  const expertA = experts[0] ?? 'Ответственная роль этапа';
  const expertB = experts[1] ?? expertA;

  return [
    {
      type: TestQuestionType.single_choice,
      title: `Какой вход обязателен перед стартом процесса "${processA}"?`,
      description: 'Выберите наиболее полный и корректный вариант.',
      options: [
        { text: 'Согласованные требования, критерии приемки и владелец результата', isCorrect: true },
        { text: 'Только устная договоренность команды', isCorrect: false },
        { text: 'Любой набор данных без проверки качества', isCorrect: false },
      ],
    },
    {
      type: TestQuestionType.multiple_choice,
      title: `Какие признаки у качественного handoff в "${unitName}"?`,
      options: [
        { text: 'Зафиксированы входные данные', isCorrect: true },
        { text: 'Назначена ответственная роль за приемку', isCorrect: true },
        { text: 'Описаны риски и ограничения', isCorrect: true },
        { text: 'Отсутствует связь с предыдущим этапом', isCorrect: false },
      ],
    },
    {
      type: TestQuestionType.single_choice,
      title: `Кто утверждает итог этапа в "${processB}"?`,
      options: [
        { text: expertA, isCorrect: true },
        { text: 'Случайный участник команды', isCorrect: false },
        { text: 'Любой наблюдатель без полномочий', isCorrect: false },
      ],
    },
    {
      type: TestQuestionType.multiple_choice,
      title: 'Что обязательно должно быть в статус-отчете этапа?',
      options: [
        { text: 'Статус и факт отклонений от плана', isCorrect: true },
        { text: 'Риски и принятые решения', isCorrect: true },
        { text: 'Факты по качеству и метрикам', isCorrect: true },
        { text: 'Необоснованные оценки без данных', isCorrect: false },
      ],
    },
    {
      type: TestQuestionType.text,
      title: `Опишите цель процесса "${processA}" в одном предложении`,
      textAnswerPlaceholder: 'Кратко сформулируйте целевой результат процесса',
      expectedTextAnswer:
        'Процесс должен завершаться предсказуемым результатом, подтвержденным ответственными ролями и метриками качества.',
    },
    {
      type: TestQuestionType.single_choice,
      title: 'Когда нужно запускать эскалацию риска?',
      options: [
        { text: 'Когда риск влияет на срок, качество или SLA и команда не может снять его в рабочем контуре', isCorrect: true },
        { text: 'Только после завершения этапа', isCorrect: false },
        { text: 'Никогда, если есть формальный план', isCorrect: false },
      ],
    },
    {
      type: TestQuestionType.multiple_choice,
      title: 'Какие действия относятся к корректной работе с изменениями?',
      options: [
        { text: 'Фиксировать инициатора и причину изменения', isCorrect: true },
        { text: 'Оценивать влияние на сроки и ресурсы', isCorrect: true },
        { text: 'Обновлять связанные документы', isCorrect: true },
        { text: 'Вносить изменения без согласования', isCorrect: false },
      ],
    },
    {
      type: TestQuestionType.single_choice,
      title: `Кто контролирует полноту входных данных в "${unitName}"?`,
      options: [
        { text: expertB, isCorrect: true },
        { text: 'Только внешний подрядчик', isCorrect: false },
        { text: 'Произвольный сотрудник без роли', isCorrect: false },
      ],
    },
    {
      type: TestQuestionType.text,
      title: 'Как проверить, что результат этапа готов к передаче дальше?',
      textAnswerPlaceholder: 'Опишите краткий алгоритм проверки',
      expectedTextAnswer:
        'Проверить критерии приемки, подтвердить качество данных, зафиксировать риски и получить подтверждение ответственной роли.',
    },
    {
      type: TestQuestionType.multiple_choice,
      title: 'Выберите корректные практики коммуникации между командами',
      options: [
        { text: 'Письменно фиксировать решения', isCorrect: true },
        { text: 'Согласовывать SLA на ответы', isCorrect: true },
        { text: 'Эскалировать блокеры в день обнаружения', isCorrect: true },
        { text: 'Скрывать риски до ретроспективы', isCorrect: false },
      ],
    },
    {
      type: TestQuestionType.single_choice,
      title: 'Что является признаком зрелого процесса?',
      options: [
        { text: 'Предсказуемость результата и прозрачная ответственность', isCorrect: true },
        { text: 'Частые исключения без анализа причин', isCorrect: false },
        { text: 'Отсутствие формальных критериев качества', isCorrect: false },
      ],
    },
    {
      type: TestQuestionType.multiple_choice,
      title: `Какие артефакты обязательны для контроля качества в тесте #${testIndex}?`,
      options: [
        { text: 'Чек-лист контроля', isCorrect: true },
        { text: 'Протокол проверки', isCorrect: true },
        { text: 'Отчет о рисках', isCorrect: true },
        { text: 'Несогласованные заметки в личном чате', isCorrect: false },
      ],
    },
    {
      type: TestQuestionType.text,
      title: `Какие улучшения вы предложите для процесса "${processB}"?`,
      textAnswerPlaceholder: '2-3 конкретных улучшения',
      expectedTextAnswer:
        'Уточнить критерии приемки, усилить контроль входных данных и ввести регулярный review рисков на контрольных точках.',
    },
    {
      type: TestQuestionType.single_choice,
      title: 'Какой показатель важнее всего для управляемости этапа?',
      options: [
        { text: 'Отклонение план/факт и качество результата', isCorrect: true },
        { text: 'Только количество задач в бэклоге', isCorrect: false },
        { text: 'Только субъективная оценка команды', isCorrect: false },
      ],
    },
  ];
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
    const article = MATERIAL_ARTICLES[i % MATERIAL_ARTICLES.length];
    const category = sample(categories);
    const linkedProcessesForBody = sampleManyUnique(unit.processes, Math.min(3, unit.processes.length));
    const linkedTasksForBody = sampleManyUnique(unit.tasks, Math.min(4, unit.tasks.length));
    const expertsForBody = sampleManyUnique(unit.employees, Math.min(3, unit.employees.length)).map((e) => e.fullName);
    const content = buildMaterialContent({
      article,
      unitName: unit.unitName,
      processNames: linkedProcessesForBody.map((p) => p.name),
      taskNames: linkedTasksForBody.map((t) => t.name),
      experts: expertsForBody,
    });

    const material = await prisma.material.create({
      data: {
        name: `${article.title}: ${unit.unitName}`,
        content,
        categoryId: category.id,
        userId: ownerId,
      },
    });

    for (const process of sampleManyUnique(unit.processes, 3)) {
      await prisma.processMaterial.create({
        data: {
          processId: process.id,
          materialId: material.id,
        },
      });
    }
    for (const task of sampleManyUnique(unit.tasks, 4)) {
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

    const questions = buildQuestionsForTest({
      unitName: unit.unitName,
      processNames: linkedProcesses.map((p) => p.name),
      experts: linkedEmployees.map((e) => e.fullName),
      testIndex: i,
    });

    const test = await prisma.test.create({
      data: {
        name: `Аттестация по процессам (${unit.unitName}) #${i}`,
        description: `Проверка знаний и практик исполнения процессов в "${unit.unitName}".`,
        timeLimitMinutes: 45 + i * 10,
        userId: ownerId,
        questions: {
          create: questions.map((question, index) => ({
            type: question.type,
            title: question.title,
            description: question.description,
            order: index + 1,
            isRequired: true,
            textAnswerPlaceholder: question.textAnswerPlaceholder,
            expectedTextAnswer: question.expectedTextAnswer,
            options: question.options
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
      const totalQuestions = questions.length;
      const correctAnswers = Math.max(8, Math.floor(totalQuestions * (0.65 + Math.random() * 0.3)));
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
