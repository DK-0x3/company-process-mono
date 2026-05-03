-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('PROCESS', 'TASK', 'ARROW');

-- CreateEnum
CREATE TYPE "DotSide" AS ENUM ('top', 'bottom', 'left', 'right');

-- CreateTable
CREATE TABLE "ProcessComponent" (
    "id" SERIAL NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "type" "ComponentType" NOT NULL,
    "processId" INTEGER NOT NULL,

    CONSTRAINT "ProcessComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskComponent" (
    "id" SERIAL NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "type" "ComponentType" NOT NULL,
    "taskId" INTEGER NOT NULL,

    CONSTRAINT "TaskComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArrowComponent" (
    "id" SERIAL NOT NULL,
    "type" "ComponentType" NOT NULL,
    "fromSide" "DotSide" NOT NULL,
    "fromOffset" DOUBLE PRECISION NOT NULL,
    "fromProcessComponentId" INTEGER,
    "fromTaskComponentId" INTEGER,
    "toSide" "DotSide" NOT NULL,
    "toOffset" DOUBLE PRECISION NOT NULL,
    "toProcessComponentId" INTEGER,
    "toTaskComponentId" INTEGER,

    CONSTRAINT "ArrowComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessComponent_processId_key" ON "ProcessComponent"("processId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskComponent_taskId_key" ON "TaskComponent"("taskId");

-- AddForeignKey
ALTER TABLE "ProcessComponent" ADD CONSTRAINT "ProcessComponent_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComponent" ADD CONSTRAINT "TaskComponent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrowComponent" ADD CONSTRAINT "ArrowComponent_fromProcessComponentId_fkey" FOREIGN KEY ("fromProcessComponentId") REFERENCES "ProcessComponent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrowComponent" ADD CONSTRAINT "ArrowComponent_fromTaskComponentId_fkey" FOREIGN KEY ("fromTaskComponentId") REFERENCES "TaskComponent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrowComponent" ADD CONSTRAINT "ArrowComponent_toProcessComponentId_fkey" FOREIGN KEY ("toProcessComponentId") REFERENCES "ProcessComponent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrowComponent" ADD CONSTRAINT "ArrowComponent_toTaskComponentId_fkey" FOREIGN KEY ("toTaskComponentId") REFERENCES "TaskComponent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
