-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('start', 'end', 'task', 'decision', 'parallel');

-- CreateEnum
CREATE TYPE "DataFlowType" AS ENUM ('input', 'output');

-- AlterTable
ALTER TABLE "Process" ADD COLUMN     "goal" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "responsibleEmployeeId" INTEGER,
ADD COLUMN     "responsibleRoleId" INTEGER,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "responsibleEmployeeId" INTEGER,
ADD COLUMN     "responsibleRoleId" INTEGER,
ADD COLUMN     "type" "TaskType" NOT NULL DEFAULT 'task';

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "roleId" INTEGER;

-- Backfill legacy -> new responsible fields
UPDATE "Process"
SET "responsibleEmployeeId" = "employeeId"
WHERE "employeeId" IS NOT NULL
  AND "responsibleEmployeeId" IS NULL;

UPDATE "Task"
SET "responsibleEmployeeId" = "employeeId"
WHERE "employeeId" IS NOT NULL
  AND "responsibleEmployeeId" IS NULL;

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataObject" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessData" (
    "id" SERIAL NOT NULL,
    "processId" INTEGER NOT NULL,
    "dataObjectId" INTEGER NOT NULL,
    "type" "DataFlowType" NOT NULL,

    CONSTRAINT "ProcessData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskData" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "dataObjectId" INTEGER NOT NULL,
    "type" "DataFlowType" NOT NULL,

    CONSTRAINT "TaskData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_userId_name_key" ON "Role"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "DataObject_userId_name_key" ON "DataObject"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessData_processId_dataObjectId_type_key" ON "ProcessData"("processId", "dataObjectId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "TaskData_taskId_dataObjectId_type_key" ON "TaskData"("taskId", "dataObjectId", "type");

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_responsibleEmployeeId_fkey" FOREIGN KEY ("responsibleEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_responsibleRoleId_fkey" FOREIGN KEY ("responsibleRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_responsibleEmployeeId_fkey" FOREIGN KEY ("responsibleEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_responsibleRoleId_fkey" FOREIGN KEY ("responsibleRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataObject" ADD CONSTRAINT "DataObject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessData" ADD CONSTRAINT "ProcessData_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessData" ADD CONSTRAINT "ProcessData_dataObjectId_fkey" FOREIGN KEY ("dataObjectId") REFERENCES "DataObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskData" ADD CONSTRAINT "TaskData_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskData" ADD CONSTRAINT "TaskData_dataObjectId_fkey" FOREIGN KEY ("dataObjectId") REFERENCES "DataObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
