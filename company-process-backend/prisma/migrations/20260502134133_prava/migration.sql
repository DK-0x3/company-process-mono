-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "canEditDataObjects" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canEditMaterials" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canEditPositions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canEditProcesses" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canEditTasks" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canEditTests" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canViewDataObjects" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canViewMaterials" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canViewPositions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canViewProcesses" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canViewTasks" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canViewTests" BOOLEAN NOT NULL DEFAULT false;
