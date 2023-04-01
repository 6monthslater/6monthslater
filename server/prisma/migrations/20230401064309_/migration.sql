/*
  Warnings:

  - You are about to drop the column `review_image_id` on the `IssueImage` table. All the data in the column will be lost.
  - Added the required column `image_url` to the `IssueImage` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "IssueImage" DROP CONSTRAINT "IssueImage_review_image_id_fkey";

-- DropIndex
DROP INDEX "IssueImage_review_image_id_key";

-- AlterTable
ALTER TABLE "IssueImage" DROP COLUMN "review_image_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "image_url" TEXT NOT NULL;
