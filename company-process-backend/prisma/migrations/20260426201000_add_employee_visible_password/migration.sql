-- Admin-visible password field for employee accounts (demo/staging only)
ALTER TABLE "User"
ADD COLUMN "visiblePassword" TEXT;
