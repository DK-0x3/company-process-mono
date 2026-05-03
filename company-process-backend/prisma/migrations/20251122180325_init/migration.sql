-- DropForeignKey
ALTER TABLE "public"."Employee" DROP CONSTRAINT "Employee_positionId_fkey";

-- AlterTable
ALTER TABLE "Employee" ALTER COLUMN "positionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;
