# Prisma Migration Plan V2 (Step 2 input)

Документ опирается на [DOMAIN_CONTRACT_V2.md](/Users/dmitrykezarev/WebstormProjects/company-process-mono/docs/DOMAIN_CONTRACT_V2.md).

## 1) Migration Strategy

Применяем безопасную двухфазную стратегию:

1. **Expand**: добавляем новые поля/таблицы, ничего не удаляем.
2. **Backfill**: переносим данные из legacy-полей.
3. **Switch**: backend/frontend начинают использовать новые поля.
4. **Contract**: удаляем legacy-поля отдельной миграцией после стабилизации.

---

## 2) Planned Prisma Changes (Expand)

## 2.1 Enums

```prisma
enum TaskType {
  start
  end
  task
  decision
  parallel
}

enum DataFlowType {
  input
  output
}
```

## 2.2 New Model: Role

```prisma
model Role {
  id          Int       @id @default(autoincrement())
  name        String
  description String?
  userId      Int
  user        User      @relation(fields: [userId], references: [id])
  employees   Employee[]
  processes   Process[] @relation("ProcessResponsibleRole")
  tasks       Task[]    @relation("TaskResponsibleRole")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([userId, name])
}
```

## 2.3 New Model: DataObject

```prisma
model DataObject {
  id          Int       @id @default(autoincrement())
  name        String
  description String?
  userId      Int
  user        User      @relation(fields: [userId], references: [id])
  processData ProcessData[]
  taskData    TaskData[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([userId, name])
}
```

## 2.4 New Models: ProcessData / TaskData

```prisma
model ProcessData {
  id           Int          @id @default(autoincrement())
  processId    Int
  dataObjectId Int
  type         DataFlowType

  process    Process    @relation(fields: [processId], references: [id])
  dataObject DataObject @relation(fields: [dataObjectId], references: [id])

  @@unique([processId, dataObjectId, type])
}

model TaskData {
  id           Int          @id @default(autoincrement())
  taskId       Int
  dataObjectId Int
  type         DataFlowType

  task       Task       @relation(fields: [taskId], references: [id])
  dataObject DataObject @relation(fields: [dataObjectId], references: [id])

  @@unique([taskId, dataObjectId, type])
}
```

## 2.5 Process changes

Добавить поля:
- `goal String?`
- `version Int @default(1)`
- `isActive Boolean @default(true)`
- `responsibleEmployeeId Int?`
- `responsibleRoleId Int?`

Связи:
- `responsibleEmployee Employee?` (новая relation для ответственного)
- `responsibleRole Role? @relation("ProcessResponsibleRole", ...)`

## 2.6 Task changes

Добавить поля:
- `type TaskType @default(task)`
- `responsibleEmployeeId Int?`
- `responsibleRoleId Int?`

Связи:
- `responsibleEmployee Employee?` (новая relation для ответственного)
- `responsibleRole Role? @relation("TaskResponsibleRole", ...)`

## 2.7 Employee changes

Добавить:
- `roleId Int?`
- `role Role? @relation(fields: [roleId], references: [id])`

---

## 3) Backfill Plan

После применения expand-миграции выполнить SQL backfill:

```sql
UPDATE "Process"
SET "responsibleEmployeeId" = "employeeId"
WHERE "employeeId" IS NOT NULL
  AND "responsibleEmployeeId" IS NULL;

UPDATE "Task"
SET "responsibleEmployeeId" = "employeeId"
WHERE "employeeId" IS NOT NULL
  AND "responsibleEmployeeId" IS NULL;
```

Проверки:

```sql
SELECT COUNT(*) FROM "Process"
WHERE "employeeId" IS NOT NULL AND "responsibleEmployeeId" IS NULL;

SELECT COUNT(*) FROM "Task"
WHERE "employeeId" IS NOT NULL AND "responsibleEmployeeId" IS NULL;
```

Ожидаем `0`.

---

## 4) Contract Phase (later)

Удаление legacy-полей:
- `Process.employeeId`
- `Task.employeeId`

Делать только после:
1. Перевода backend DTO/service на `responsible*`.
2. Перевода frontend типов/API на `responsible*`.
3. Стабильного релиза без регрессий.

---

## 5) Service/API Impact Checklist

Обновить backend:
1. `process` DTO/service/controller
2. `task` DTO/service/controller
3. `employee` DTO/service/controller (roleId)
4. новые модули: `role`, `data-object`, `process-data`, `task-data`
5. проверки ownership для новых таблиц

Обновить frontend:
1. entity types + RTK Query endpoints
2. формы process/task для ответственных по роли/сотруднику
3. экраны для role/data objects/input-output

---

## 6) Rollout Order

1. Prisma schema + migration (expand)
2. Backfill
3. Backend DTO/service updates
4. Frontend API/type updates
5. Валидация/паспорта/PDF
6. Contract migration (удаление legacy полей)

---

## 7) Risks and Mitigations

1. Риск: конфликт семантики `Position` vs `Role`.
   - Решение: не переиспользовать `Position` как `Role`, хранить отдельно.

2. Риск: поломка старых фронтовых форм из-за новых обязательных полей.
   - Решение: новые поля сначала optional, defaults на уровне БД.

3. Риск: расхождение схемы редактора и task-полей.
   - Решение: координаты оставляем в `TaskComponent`, не дублируем в `Task` таблице.
