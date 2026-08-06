-- DropIndex
DROP INDEX "Product_isBestSeller_idx";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "isBestSeller",
DROP COLUMN "isNew";
