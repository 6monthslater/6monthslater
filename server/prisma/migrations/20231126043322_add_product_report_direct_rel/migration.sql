-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_review_id_fkey";

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "image_url" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "productId" TEXT,
ALTER COLUMN "review_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
