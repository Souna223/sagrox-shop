-- CreateTable
CREATE TABLE "ProductQuantityPrice" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "minQuantity" INTEGER NOT NULL DEFAULT 2,
    "discountPercent" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductQuantityPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductQuantityPrice_productId_idx" ON "ProductQuantityPrice"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductQuantityPrice_productId_minQuantity_key" ON "ProductQuantityPrice"("productId", "minQuantity");

-- AddForeignKey
ALTER TABLE "ProductQuantityPrice" ADD CONSTRAINT "ProductQuantityPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
