-- Add actor type and employee account linkage for personal employee cabinet
CREATE TYPE "UserActorType" AS ENUM ('OWNER', 'EMPLOYEE');

ALTER TABLE "User"
ADD COLUMN "actorType" "UserActorType" NOT NULL DEFAULT 'OWNER',
ADD COLUMN "ownerUserId" INTEGER,
ADD COLUMN "employeeProfileId" INTEGER;

ALTER TABLE "User"
ADD CONSTRAINT "User_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "User"
ADD CONSTRAINT "User_employeeProfileId_fkey"
FOREIGN KEY ("employeeProfileId") REFERENCES "Employee"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "User_employeeProfileId_key" ON "User"("employeeProfileId");
