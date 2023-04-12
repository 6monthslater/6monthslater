/*
  Warnings:

  - You are about to drop the column `store_ids` on the `Manufacturer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Manufacturer" DROP COLUMN "store_ids";

-- CreateTable
CREATE TABLE "ManufacturerStoreId" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "manufacturer_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManufacturerStoreId_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManufacturerStoreId_store_id_key" ON "ManufacturerStoreId"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "ManufacturerStoreId_manufacturer_id_key" ON "ManufacturerStoreId"("manufacturer_id");

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- AddForeignKey
ALTER TABLE "ManufacturerStoreId" ADD CONSTRAINT "ManufacturerStoreId_manufacturer_id_fkey" FOREIGN KEY ("manufacturer_id") REFERENCES "Manufacturer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
