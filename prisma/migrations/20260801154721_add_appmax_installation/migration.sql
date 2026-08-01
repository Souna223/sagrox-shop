-- CreateTable
CREATE TABLE "AppmaxInstallation" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "merchantClientId" TEXT NOT NULL,
    "merchantClientSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppmaxInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppmaxInstallation_externalKey_key" ON "AppmaxInstallation"("externalKey");

-- CreateIndex
CREATE INDEX "AppmaxInstallation_appId_idx" ON "AppmaxInstallation"("appId");
