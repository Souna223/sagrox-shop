-- AlterTable
ALTER TABLE "AppmaxInstallation" ADD COLUMN "externalId" TEXT;
CREATE UNIQUE INDEX "AppmaxInstallation_externalId_key" ON "AppmaxInstallation"("externalId");
