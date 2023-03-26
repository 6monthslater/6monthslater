-- CreateEnum
CREATE TYPE "AmazonRegion" AS ENUM ('com', 'ca');

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "author_id" TEXT,
    "author_name" TEXT NOT NULL,
    "author_image_url" TEXT,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "date_text" TEXT NOT NULL,
    "review_id" TEXT,
    "attributes" JSONB NOT NULL,
    "verified_purchase" BOOLEAN NOT NULL,
    "found_helpful_count" INTEGER NOT NULL,
    "is_top_positive_review" BOOLEAN NOT NULL,
    "is_top_critical_review" BOOLEAN NOT NULL,
    "country_reviewed_in" TEXT NOT NULL,
    "region" "AmazonRegion" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewImage" (
    "id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewId" TEXT NOT NULL,

    CONSTRAINT "ReviewImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ReviewImage" ADD CONSTRAINT "ReviewImage_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
