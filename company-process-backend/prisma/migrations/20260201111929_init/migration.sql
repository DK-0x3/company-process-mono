/*
  Warnings:

  - A unique constraint covering the columns `[ownerProcessId,processId]` on the table `ProcessComponent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ownerProcessId,taskId]` on the table `TaskComponent` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ownerProcessId` to the `ArrowComponent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerProcessId` to the `ProcessComponent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerProcessId` to the `TaskComponent` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."ProcessComponent_processId_key";

-- DropIndex
DROP INDEX "public"."TaskComponent_taskId_key";

-- AlterTable
ALTER TABLE "ArrowComponent" ADD COLUMN     "ownerProcessId" INTEGER NOT NULL,
ALTER COLUMN "type" SET DEFAULT 'ARROW';

-- AlterTable
ALTER TABLE "ProcessComponent" ADD COLUMN     "ownerProcessId" INTEGER NOT NULL,
ALTER COLUMN "type" SET DEFAULT 'PROCESS';

-- AlterTable
ALTER TABLE "TaskComponent" ADD COLUMN     "ownerProcessId" INTEGER NOT NULL,
ALTER COLUMN "type" SET DEFAULT 'TASK';

-- CreateIndex
CREATE UNIQUE INDEX "ProcessComponent_ownerProcessId_processId_key" ON "ProcessComponent"("ownerProcessId", "processId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskComponent_ownerProcessId_taskId_key" ON "TaskComponent"("ownerProcessId", "taskId");

-- AddForeignKey
ALTER TABLE "ProcessComponent" ADD CONSTRAINT "ProcessComponent_ownerProcessId_fkey" FOREIGN KEY ("ownerProcessId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComponent" ADD CONSTRAINT "TaskComponent_ownerProcessId_fkey" FOREIGN KEY ("ownerProcessId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrowComponent" ADD CONSTRAINT "ArrowComponent_ownerProcessId_fkey" FOREIGN KEY ("ownerProcessId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
