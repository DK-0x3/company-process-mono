# Domain Contract V2 (Step 1)

## 1) Scope

Цель шага: зафиксировать **единый контракт домена** перед миграциями БД и реализацией новых endpoint'ов.

Документ учитывает текущую архитектуру проекта:
- Backend: NestJS + Prisma + PostgreSQL
- Frontend: React + RTK Query + Konva-редактор схем
- Мультитенантность на уровне `userId` (владелец данных)

---

## 2) Key Decisions (зафиксировано)

1. Идентификаторы в проекте остаются `Int` (не `string/uuid`) на текущем этапе.
2. `Position` не удаляем: это кадровая должность (HR-сущность), она уже используется в UI/данных.
3. `Role` добавляем как отдельную бизнес-сущность процесса (роль в процессе).
4. Координаты задач остаются на уровне диаграммы (`TaskComponent`), а не в `Task`:
   - одна и та же задача может отображаться в схеме;
   - текущая редакторная модель уже построена вокруг `ProcessComponent/TaskComponent/ArrowComponent`.
5. Поля из примера пользователя принимаем как целевые, но адаптируем к текущей модели без ломки существующего функционала.

---

## 3) Target Domain Model

## 3.1 Process

```ts
Process {
  id: number
  userId: number

  name: string
  description?: string
  goal?: string

  parentId?: number

  responsibleEmployeeId?: number
  responsibleRoleId?: number

  version: number          // default: 1
  isActive: boolean        // default: true

  createdAt: Date
  updatedAt: Date
}
```

## 3.2 Task

```ts
Task {
  id: number
  userId: number
  processId: number

  name: string
  description?: string
  type: TaskType           // default: "task"

  responsibleEmployeeId?: number
  responsibleRoleId?: number

  createdAt: Date
  updatedAt: Date
}
```

```ts
TaskType = "start" | "end" | "task" | "decision" | "parallel"
```

Примечание по позициям:
- `positionX/positionY` хранятся в `TaskComponent` (`x/y`) как часть схемы.
- В API паспорта/описания координаты могут отдаваться как вычисляемые поля из схемы.

## 3.3 Employee

```ts
Employee {
  id: number
  userId: number

  fullName: string
  email: string
  phone?: string
  address?: string
  birthDate: Date
  hireDate: Date

  positionId?: number      // кадровая должность (existing Position)
  roleId?: number          // дефолтная роль сотрудника в процессах

  createdAt: Date
  updatedAt: Date
}
```

## 3.4 Role (new)

```ts
Role {
  id: number
  userId: number

  name: string
  description?: string

  createdAt: Date
  updatedAt: Date
}
```

## 3.5 DataObject (new)

```ts
DataObject {
  id: number
  userId: number

  name: string
  description?: string

  createdAt: Date
  updatedAt: Date
}
```

## 3.6 ProcessData (new)

```ts
ProcessData {
  id: number
  processId: number
  dataObjectId: number
  type: DataFlowType       // "input" | "output"
}
```

## 3.7 TaskData (new)

```ts
TaskData {
  id: number
  taskId: number
  dataObjectId: number
  type: DataFlowType       // "input" | "output"
}
```

```ts
DataFlowType = "input" | "output"
```

---

## 4) Mapping Current -> Target

1. `Process.employeeId` и `Task.employeeId` трактуются как legacy-поля.
2. Целевые поля: `responsibleEmployeeId` + `responsibleRoleId`.
3. На этапе миграции:
   - добавить новые поля;
   - заполнить `responsibleEmployeeId` значениями из legacy `employeeId`;
   - оставить legacy поля временно для совместимости (1 этап).
4. После стабилизации API/UI — удалить/скрыть legacy-поля.

---

## 5) API Contract (planned)

## 5.1 CRUD

- `/processes` (+ новые поля `goal`, `version`, `isActive`, `responsible*`)
- `/tasks` (+ `type`, `responsible*`)
- `/employees` (+ `roleId`)
- `/roles` (new)
- `/data-objects` (new)
- `/process-data` (new)
- `/task-data` (new)

## 5.2 Validation

`GET /processes/:id/validate`

Response:

```ts
{
  isValid: boolean
  checks: {
    hasStart: boolean
    hasEnd: boolean
    allTasksConnected: boolean
    noDanglingTasks: boolean
    noCycleWithoutExit: boolean
    allTasksHaveResponsible: boolean
  }
  errors: Array<{
    code: string
    message: string
    taskId?: number
    details?: Record<string, unknown>
  }>
  warnings: Array<{
    code: string
    message: string
    taskId?: number
  }>
  metrics: {
    totalTasks: number
    startCount: number
    endCount: number
    edgesCount: number
  }
}
```

## 5.3 Text Generation

`GET /processes/:id/description`

Response:

```ts
{
  processId: number
  text: string
  generatedAt: string
}
```

## 5.4 Passports

`GET /processes/:id/passport`
`GET /tasks/:id/passport`

`ProcessPassport`:

```ts
{
  name: string
  description?: string
  goal?: string
  version: number
  createdAt: string
  responsible: { employeeId?: number; roleId?: number }
  participants: Array<{ employeeId?: number; roleId?: number; name: string }>
  inputs: Array<{ dataObjectId: number; name: string }>
  outputs: Array<{ dataObjectId: number; name: string }>
  tasks: Array<{
    id: number
    name: string
    type: TaskType
    responsibleEmployeeId?: number
    responsibleRoleId?: number
  }>
  diagram: {
    ownerProcessId: number
    processComponents: number
    taskComponents: number
    arrows: number
  }
}
```

`TaskPassport`:

```ts
{
  id: number
  name: string
  description?: string
  process: { id: number; name: string }
  responsible: { employeeId?: number; roleId?: number }
  inputs: Array<{ dataObjectId: number; name: string }>
  outputs: Array<{ dataObjectId: number; name: string }>
  previousTasks: Array<{ id: number; name: string }>
  nextTasks: Array<{ id: number; name: string }>
}
```

## 5.5 PDF

`POST /processes/:id/pdf`

Request:

```ts
{
  diagramImageBase64?: string
}
```

Response: `application/pdf`

Минимальный состав PDF:
- Заголовок организации
- Название процесса
- Описание и цель
- Таблица задач
- Схема процесса (из изображения)
- Дата генерации
- Версия

---

## 6) Validation Rules (exact semantics)

Для `processId`:
1. `hasStart`: в scope процесса есть >=1 задачи `type=start`.
2. `hasEnd`: в scope процесса есть >=1 задачи `type=end`.
3. `allTasksConnected`: каждая задача достижима хотя бы из одного `start` и может дойти хотя бы до одного `end`.
4. `noDanglingTasks`: нет задач без входящих и исходящих связей (кроме допустимых start/end по типу).
5. `noCycleWithoutExit`: нет циклических компонент графа, из которых невозможно выйти к `end`.
6. `allTasksHaveResponsible`: для каждой задачи задан `responsibleEmployeeId` или `responsibleRoleId`.

---

## 7) Backward Compatibility Rules

1. Старые endpoint'ы не удаляем до полной миграции фронта.
2. В ответах допускается временная отдача и legacy-полей, и новых полей.
3. Авторизация/ownership обязательно сохраняется для всех новых сущностей.

---

## 8) Definition of Done for Step 1

Step 1 считается завершенным, если:
1. Все поля и сущности из документа согласованы.
2. Зафиксированы правила совместимости и границы ответственности.
3. Есть четкий вход в Step 2: миграции Prisma + обновление DTO/API.
