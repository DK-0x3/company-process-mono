-- Seed base user and demo data for local testing after migrations.
-- Credentials: admin / 123456

INSERT INTO "User" ("login", "email", "password", "createdAt", "updatedAt")
SELECT
  'admin',
  'admin@mail.com',
  '$2b$10$T4iCu9GE9ad5qpO2gPRyOOjwrENmhIWMnM3UTyBQyajEj0ceMihLu',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM "User"
  WHERE "login" = 'admin' OR "email" = 'admin@mail.com'
);

UPDATE "User"
SET
  "email" = 'admin@mail.com',
  "password" = '$2b$10$T4iCu9GE9ad5qpO2gPRyOOjwrENmhIWMnM3UTyBQyajEj0ceMihLu',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "login" = 'admin';

WITH admin_user AS (
  SELECT "id"
  FROM "User"
  WHERE "login" = 'admin' OR "email" = 'admin@mail.com'
  ORDER BY "id"
  LIMIT 1
),
position_seed("name") AS (
  VALUES
    ('Разработчик'),
    ('Менеджер'),
    ('Тестировщик'),
    ('Дизайнер'),
    ('Аналитик')
)
INSERT INTO "Position" ("name", "userId", "createdAt", "updatedAt")
SELECT
  position_seed."name",
  admin_user."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM position_seed
CROSS JOIN admin_user
WHERE NOT EXISTS (
  SELECT 1
  FROM "Position" p
  WHERE p."userId" = admin_user."id"
    AND p."name" = position_seed."name"
);

WITH admin_user AS (
  SELECT "id"
  FROM "User"
  WHERE "login" = 'admin' OR "email" = 'admin@mail.com'
  ORDER BY "id"
  LIMIT 1
),
role_seed("name", "description") AS (
  VALUES
    ('Владелец процесса', 'Отвечает за конечный результат и метрики процесса'),
    ('Бизнес-аналитик', 'Формирует и согласует бизнес-требования'),
    ('Технический лидер', 'Координирует разработку и архитектурные решения'),
    ('QA лидер', 'Отвечает за стратегию и качество тестирования')
)
INSERT INTO "Role" ("name", "description", "userId", "createdAt", "updatedAt")
SELECT
  role_seed."name",
  role_seed."description",
  admin_user."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM role_seed
CROSS JOIN admin_user
ON CONFLICT ("userId", "name")
DO UPDATE SET
  "description" = EXCLUDED."description",
  "updatedAt" = CURRENT_TIMESTAMP;

WITH admin_user AS (
  SELECT "id"
  FROM "User"
  WHERE "login" = 'admin' OR "email" = 'admin@mail.com'
  ORDER BY "id"
  LIMIT 1
),
employee_seed(
  "fullName",
  "birthDate",
  "hireDate",
  "email",
  "phone",
  "address",
  "positionName",
  "roleName"
) AS (
  VALUES
    (
      'Иван Петров',
      TIMESTAMP '1990-05-14 00:00:00',
      TIMESTAMP '2023-02-01 00:00:00',
      'ivan.petrov@example.com',
      '+79990001122',
      'Москва, ул. Ленина, 12',
      'Разработчик',
      'Технический лидер'
    ),
    (
      'Мария Сидорова',
      TIMESTAMP '1992-07-22 00:00:00',
      TIMESTAMP '2023-03-15 00:00:00',
      'maria.sidorova@example.com',
      '+79993334455',
      'Москва, ул. Пушкина, 7',
      'Менеджер',
      'Владелец процесса'
    ),
    (
      'Ольга Кузнецова',
      TIMESTAMP '1995-04-09 00:00:00',
      TIMESTAMP '2024-01-10 00:00:00',
      'olga.kuznetsova@example.com',
      '+79994445566',
      'Москва, ул. Садовая, 25',
      'Тестировщик',
      'QA лидер'
    ),
    (
      'Никита Егоров',
      TIMESTAMP '1993-11-19 00:00:00',
      TIMESTAMP '2022-10-03 00:00:00',
      'nikita.egorov@example.com',
      '+79995557788',
      'Москва, ул. Новая, 4',
      'Аналитик',
      'Бизнес-аналитик'
    )
)
INSERT INTO "Employee" (
  "fullName",
  "birthDate",
  "hireDate",
  "email",
  "phone",
  "address",
  "positionId",
  "roleId",
  "userId",
  "createdAt",
  "updatedAt"
)
SELECT
  employee_seed."fullName",
  employee_seed."birthDate",
  employee_seed."hireDate",
  employee_seed."email",
  employee_seed."phone",
  employee_seed."address",
  p."id",
  r."id",
  admin_user."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM employee_seed
CROSS JOIN admin_user
LEFT JOIN "Position" p
  ON p."userId" = admin_user."id"
  AND p."name" = employee_seed."positionName"
LEFT JOIN "Role" r
  ON r."userId" = admin_user."id"
  AND r."name" = employee_seed."roleName"
WHERE NOT EXISTS (
  SELECT 1
  FROM "Employee" e
  WHERE e."userId" = admin_user."id"
    AND e."email" = employee_seed."email"
);

WITH admin_user AS (
  SELECT "id"
  FROM "User"
  WHERE "login" = 'admin' OR "email" = 'admin@mail.com'
  ORDER BY "id"
  LIMIT 1
),
process_seed("name", "description", "goal", "responsiblePositionName", "responsibleRoleName") AS (
  VALUES
    (
      'Разработка новой функции',
      'Сквозной процесс от требований до выпуска функциональности',
      'Подготовить и выпустить новую бизнес-функцию',
      'Менеджер',
      'Владелец процесса'
    ),
    (
      'Тестирование релиза',
      'Проверка релизного пакета перед публикацией',
      'Подтвердить готовность релиза к поставке',
      'Тестировщик',
      'QA лидер'
    )
)
INSERT INTO "Process" (
  "name",
  "description",
  "goal",
  "userId",
  "responsiblePositionId",
  "responsibleRoleId",
  "version",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  process_seed."name",
  process_seed."description",
  process_seed."goal",
  admin_user."id",
  p."id",
  r."id",
  1,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM process_seed
CROSS JOIN admin_user
LEFT JOIN "Position" p
  ON p."userId" = admin_user."id"
  AND p."name" = process_seed."responsiblePositionName"
LEFT JOIN "Role" r
  ON r."userId" = admin_user."id"
  AND r."name" = process_seed."responsibleRoleName"
WHERE NOT EXISTS (
  SELECT 1
  FROM "Process" pr
  WHERE pr."userId" = admin_user."id"
    AND pr."name" = process_seed."name"
);

WITH admin_user AS (
  SELECT "id"
  FROM "User"
  WHERE "login" = 'admin' OR "email" = 'admin@mail.com'
  ORDER BY "id"
  LIMIT 1
),
parent_process AS (
  SELECT pr."id", pr."userId"
  FROM "Process" pr
  CROSS JOIN admin_user
  WHERE pr."userId" = admin_user."id"
    AND pr."name" = 'Разработка новой функции'
  LIMIT 1
)
INSERT INTO "Process" (
  "name",
  "description",
  "goal",
  "parent_id",
  "userId",
  "responsiblePositionId",
  "responsibleRoleId",
  "version",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  'Анализ требований',
  'Подпроцесс сбора, уточнения и согласования требований',
  'Сформировать полный и согласованный набор требований',
  parent_process."id",
  parent_process."userId",
  p."id",
  r."id",
  1,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM parent_process
LEFT JOIN "Position" p
  ON p."userId" = parent_process."userId"
  AND p."name" = 'Аналитик'
LEFT JOIN "Role" r
  ON r."userId" = parent_process."userId"
  AND r."name" = 'Бизнес-аналитик'
WHERE NOT EXISTS (
  SELECT 1
  FROM "Process" pr
  WHERE pr."userId" = parent_process."userId"
    AND pr."name" = 'Анализ требований'
);

WITH admin_user AS (
  SELECT "id"
  FROM "User"
  WHERE "login" = 'admin' OR "email" = 'admin@mail.com'
  ORDER BY "id"
  LIMIT 1
),
task_seed(
  "name",
  "description",
  "type",
  "processName",
  "responsiblePositionName",
  "responsibleRoleName"
) AS (
  VALUES
    (
      'Старт процесса',
      'Инициация процесса разработки',
      'start',
      'Разработка новой функции',
      'Менеджер',
      'Владелец процесса'
    ),
    (
      'Сбор требований',
      'Сбор и формализация входящих бизнес-требований',
      'task',
      'Разработка новой функции',
      'Аналитик',
      'Бизнес-аналитик'
    ),
    (
      'Требования согласованы?',
      'Проверка полноты и согласования требований',
      'decision',
      'Разработка новой функции',
      'Менеджер',
      'Владелец процесса'
    ),
    (
      'Разработка',
      'Реализация функциональности в коде',
      'task',
      'Разработка новой функции',
      'Разработчик',
      'Технический лидер'
    ),
    (
      'Подготовка тест-кейсов',
      'Подготовка набора тестов на реализованный функционал',
      'parallel',
      'Разработка новой функции',
      'Тестировщик',
      'QA лидер'
    ),
    (
      'Завершение процесса',
      'Закрытие процесса после выпуска',
      'end',
      'Разработка новой функции',
      'Менеджер',
      'Владелец процесса'
    ),
    (
      'Старт тестирования релиза',
      'Начало регрессионного тестирования',
      'start',
      'Тестирование релиза',
      'Тестировщик',
      'QA лидер'
    ),
    (
      'Регрессионное тестирование',
      'Проверка стабильности и критических сценариев',
      'task',
      'Тестирование релиза',
      'Тестировщик',
      'QA лидер'
    ),
    (
      'Завершение релиза',
      'Подготовка заключения по качеству релиза',
      'end',
      'Тестирование релиза',
      'Менеджер',
      'Владелец процесса'
    ),
    (
      'Старт анализа',
      'Запуск подпроцесса анализа требований',
      'start',
      'Анализ требований',
      'Аналитик',
      'Бизнес-аналитик'
    ),
    (
      'Подготовка BRD',
      'Подготовка документа бизнес-требований',
      'task',
      'Анализ требований',
      'Аналитик',
      'Бизнес-аналитик'
    ),
    (
      'Завершение анализа',
      'Завершение подпроцесса анализа требований',
      'end',
      'Анализ требований',
      'Аналитик',
      'Бизнес-аналитик'
    )
)
INSERT INTO "Task" (
  "name",
  "description",
  "type",
  "processId",
  "userId",
  "responsiblePositionId",
  "responsibleRoleId",
  "createdAt",
  "updatedAt"
)
SELECT
  task_seed."name",
  task_seed."description",
  task_seed."type"::"TaskType",
  pr."id",
  admin_user."id",
  p."id",
  r."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM task_seed
CROSS JOIN admin_user
JOIN "Process" pr
  ON pr."userId" = admin_user."id"
  AND pr."name" = task_seed."processName"
LEFT JOIN "Position" p
  ON p."userId" = admin_user."id"
  AND p."name" = task_seed."responsiblePositionName"
LEFT JOIN "Role" r
  ON r."userId" = admin_user."id"
  AND r."name" = task_seed."responsibleRoleName"
WHERE NOT EXISTS (
  SELECT 1
  FROM "Task" t
  WHERE t."userId" = admin_user."id"
    AND t."processId" = pr."id"
    AND t."name" = task_seed."name"
);

WITH admin_user AS (
  SELECT "id"
  FROM "User"
  WHERE "login" = 'admin' OR "email" = 'admin@mail.com'
  ORDER BY "id"
  LIMIT 1
),
data_object_seed("name", "description") AS (
  VALUES
    ('Запрос на изменение', 'Инициирующее обращение на доработку'),
    ('Бизнес-требования', 'Согласованные бизнес-требования'),
    ('Техническое задание', 'Техническая детализация для разработки'),
    ('Исходный код', 'Результат реализации функциональности'),
    ('Тест-кейсы', 'Набор сценариев для проверки функциональности'),
    ('Релизный пакет', 'Собранный пакет для релизного тестирования'),
    ('Протокол тестирования', 'Итоговый отчет о тестировании')
)
INSERT INTO "DataObject" ("name", "description", "userId", "createdAt", "updatedAt")
SELECT
  data_object_seed."name",
  data_object_seed."description",
  admin_user."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM data_object_seed
CROSS JOIN admin_user
ON CONFLICT ("userId", "name")
DO UPDATE SET
  "description" = EXCLUDED."description",
  "updatedAt" = CURRENT_TIMESTAMP;

WITH admin_user AS (
  SELECT "id"
  FROM "User"
  WHERE "login" = 'admin' OR "email" = 'admin@mail.com'
  ORDER BY "id"
  LIMIT 1
),
process_data_seed("processName", "dataObjectName", "type") AS (
  VALUES
    ('Разработка новой функции', 'Бизнес-требования', 'input'),
    ('Разработка новой функции', 'Релизный пакет', 'output'),
    ('Тестирование релиза', 'Релизный пакет', 'input'),
    ('Тестирование релиза', 'Протокол тестирования', 'output'),
    ('Анализ требований', 'Запрос на изменение', 'input'),
    ('Анализ требований', 'Бизнес-требования', 'output')
)
INSERT INTO "ProcessData" ("processId", "dataObjectId", "type")
SELECT
  pr."id",
  d."id",
  process_data_seed."type"::"DataFlowType"
FROM process_data_seed
CROSS JOIN admin_user
JOIN "Process" pr
  ON pr."userId" = admin_user."id"
  AND pr."name" = process_data_seed."processName"
JOIN "DataObject" d
  ON d."userId" = admin_user."id"
  AND d."name" = process_data_seed."dataObjectName"
ON CONFLICT ("processId", "dataObjectId", "type") DO NOTHING;

WITH admin_user AS (
  SELECT "id"
  FROM "User"
  WHERE "login" = 'admin' OR "email" = 'admin@mail.com'
  ORDER BY "id"
  LIMIT 1
),
task_data_seed("taskName", "processName", "dataObjectName", "type") AS (
  VALUES
    ('Сбор требований', 'Разработка новой функции', 'Запрос на изменение', 'input'),
    ('Сбор требований', 'Разработка новой функции', 'Бизнес-требования', 'output'),
    ('Требования согласованы?', 'Разработка новой функции', 'Бизнес-требования', 'input'),
    ('Требования согласованы?', 'Разработка новой функции', 'Техническое задание', 'output'),
    ('Разработка', 'Разработка новой функции', 'Техническое задание', 'input'),
    ('Разработка', 'Разработка новой функции', 'Исходный код', 'output'),
    ('Подготовка тест-кейсов', 'Разработка новой функции', 'Бизнес-требования', 'input'),
    ('Подготовка тест-кейсов', 'Разработка новой функции', 'Тест-кейсы', 'output'),
    ('Регрессионное тестирование', 'Тестирование релиза', 'Релизный пакет', 'input'),
    ('Регрессионное тестирование', 'Тестирование релиза', 'Протокол тестирования', 'output'),
    ('Подготовка BRD', 'Анализ требований', 'Запрос на изменение', 'input'),
    ('Подготовка BRD', 'Анализ требований', 'Бизнес-требования', 'output')
)
INSERT INTO "TaskData" ("taskId", "dataObjectId", "type")
SELECT
  t."id",
  d."id",
  task_data_seed."type"::"DataFlowType"
FROM task_data_seed
CROSS JOIN admin_user
JOIN "Process" pr
  ON pr."userId" = admin_user."id"
  AND pr."name" = task_data_seed."processName"
JOIN "Task" t
  ON t."processId" = pr."id"
  AND t."name" = task_data_seed."taskName"
JOIN "DataObject" d
  ON d."userId" = admin_user."id"
  AND d."name" = task_data_seed."dataObjectName"
ON CONFLICT ("taskId", "dataObjectId", "type") DO NOTHING;

WITH admin_user AS (
  SELECT "id"
  FROM "User"
  WHERE "login" = 'admin' OR "email" = 'admin@mail.com'
  ORDER BY "id"
  LIMIT 1
),
owner_process AS (
  SELECT pr."id", pr."userId"
  FROM "Process" pr
  JOIN admin_user ON admin_user."id" = pr."userId"
  WHERE pr."name" = 'Разработка новой функции'
  LIMIT 1
),
task_component_seed("taskName", "x", "y", "width", "height") AS (
  VALUES
    ('Старт процесса', 3.0, 5.0, 8.0, 3.0),
    ('Сбор требований', 13.0, 5.0, 9.0, 3.0),
    ('Требования согласованы?', 25.0, 5.0, 10.0, 3.0),
    ('Разработка', 38.0, 3.0, 8.0, 3.0),
    ('Подготовка тест-кейсов', 38.0, 9.0, 10.0, 3.0),
    ('Завершение процесса', 51.0, 5.0, 10.0, 3.0)
)
INSERT INTO "TaskComponent" (
  "x",
  "y",
  "width",
  "height",
  "type",
  "ownerProcessId",
  "taskId"
)
SELECT
  task_component_seed."x",
  task_component_seed."y",
  task_component_seed."width",
  task_component_seed."height",
  'TASK'::"ComponentType",
  owner_process."id",
  t."id"
FROM task_component_seed
JOIN owner_process ON TRUE
JOIN "Task" t
  ON t."processId" = owner_process."id"
  AND t."name" = task_component_seed."taskName"
ON CONFLICT ("ownerProcessId", "taskId") DO NOTHING;

WITH admin_user AS (
  SELECT "id"
  FROM "User"
  WHERE "login" = 'admin' OR "email" = 'admin@mail.com'
  ORDER BY "id"
  LIMIT 1
),
owner_process AS (
  SELECT pr."id", pr."userId"
  FROM "Process" pr
  JOIN admin_user ON admin_user."id" = pr."userId"
  WHERE pr."name" = 'Разработка новой функции'
  LIMIT 1
),
arrow_seed("fromTaskName", "toTaskName") AS (
  VALUES
    ('Старт процесса', 'Сбор требований'),
    ('Сбор требований', 'Требования согласованы?'),
    ('Требования согласованы?', 'Разработка'),
    ('Требования согласованы?', 'Завершение процесса'),
    ('Разработка', 'Подготовка тест-кейсов'),
    ('Подготовка тест-кейсов', 'Завершение процесса')
)
INSERT INTO "ArrowComponent" (
  "type",
  "ownerProcessId",
  "fromSide",
  "fromOffset",
  "fromTaskComponentId",
  "toSide",
  "toOffset",
  "toTaskComponentId"
)
SELECT
  'ARROW'::"ComponentType",
  owner_process."id",
  'right'::"DotSide",
  1.0,
  from_component."id",
  'left'::"DotSide",
  1.0,
  to_component."id"
FROM arrow_seed
JOIN owner_process ON TRUE
JOIN "Task" from_task
  ON from_task."processId" = owner_process."id"
  AND from_task."name" = arrow_seed."fromTaskName"
JOIN "Task" to_task
  ON to_task."processId" = owner_process."id"
  AND to_task."name" = arrow_seed."toTaskName"
JOIN "TaskComponent" from_component
  ON from_component."ownerProcessId" = owner_process."id"
  AND from_component."taskId" = from_task."id"
JOIN "TaskComponent" to_component
  ON to_component."ownerProcessId" = owner_process."id"
  AND to_component."taskId" = to_task."id"
WHERE NOT EXISTS (
  SELECT 1
  FROM "ArrowComponent" a
  WHERE a."ownerProcessId" = owner_process."id"
    AND a."fromTaskComponentId" = from_component."id"
    AND a."toTaskComponentId" = to_component."id"
);
