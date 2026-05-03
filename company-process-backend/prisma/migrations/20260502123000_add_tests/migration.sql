-- CreateEnum
CREATE TYPE "TestQuestionType" AS ENUM ('single_choice', 'multiple_choice', 'text');

-- CreateTable
CREATE TABLE "Test" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "timeLimitMinutes" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestQuestion" (
    "id" SERIAL NOT NULL,
    "testId" INTEGER NOT NULL,
    "type" "TestQuestionType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "textAnswerPlaceholder" TEXT,
    "expectedTextAnswer" TEXT,

    CONSTRAINT "TestQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestQuestionOption" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,

    CONSTRAINT "TestQuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestEmployee" (
    "id" SERIAL NOT NULL,
    "testId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,

    CONSTRAINT "TestEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestPosition" (
    "id" SERIAL NOT NULL,
    "testId" INTEGER NOT NULL,
    "positionId" INTEGER NOT NULL,

    CONSTRAINT "TestPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestProcess" (
    "id" SERIAL NOT NULL,
    "testId" INTEGER NOT NULL,
    "processId" INTEGER NOT NULL,

    CONSTRAINT "TestProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestTask" (
    "id" SERIAL NOT NULL,
    "testId" INTEGER NOT NULL,
    "taskId" INTEGER NOT NULL,

    CONSTRAINT "TestTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Test_userId_name_key" ON "Test"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TestQuestion_testId_order_key" ON "TestQuestion"("testId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "TestQuestionOption_questionId_order_key" ON "TestQuestionOption"("questionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "TestEmployee_testId_employeeId_key" ON "TestEmployee"("testId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "TestPosition_testId_positionId_key" ON "TestPosition"("testId", "positionId");

-- CreateIndex
CREATE UNIQUE INDEX "TestProcess_testId_processId_key" ON "TestProcess"("testId", "processId");

-- CreateIndex
CREATE UNIQUE INDEX "TestTask_testId_taskId_key" ON "TestTask"("testId", "taskId");

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestQuestion" ADD CONSTRAINT "TestQuestion_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestQuestionOption" ADD CONSTRAINT "TestQuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "TestQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestEmployee" ADD CONSTRAINT "TestEmployee_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestEmployee" ADD CONSTRAINT "TestEmployee_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPosition" ADD CONSTRAINT "TestPosition_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPosition" ADD CONSTRAINT "TestPosition_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestProcess" ADD CONSTRAINT "TestProcess_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestProcess" ADD CONSTRAINT "TestProcess_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestTask" ADD CONSTRAINT "TestTask_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestTask" ADD CONSTRAINT "TestTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
