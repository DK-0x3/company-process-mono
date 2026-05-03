-- Add responsible position references for process/task
ALTER TABLE "Process"
ADD COLUMN "responsiblePositionId" INTEGER;

ALTER TABLE "Task"
ADD COLUMN "responsiblePositionId" INTEGER;

-- Backfill from currently assigned responsible employees
UPDATE "Process" AS p
SET "responsiblePositionId" = e."positionId"
FROM "Employee" AS e
WHERE p."responsibleEmployeeId" = e."id"
  AND p."responsiblePositionId" IS NULL;

UPDATE "Task" AS t
SET "responsiblePositionId" = e."positionId"
FROM "Employee" AS e
WHERE t."responsibleEmployeeId" = e."id"
  AND t."responsiblePositionId" IS NULL;

ALTER TABLE "Process"
ADD CONSTRAINT "Process_responsiblePositionId_fkey"
FOREIGN KEY ("responsiblePositionId") REFERENCES "Position"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_responsiblePositionId_fkey"
FOREIGN KEY ("responsiblePositionId") REFERENCES "Position"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
