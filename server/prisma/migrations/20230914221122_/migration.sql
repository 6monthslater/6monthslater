/*
  Fix schema to follow analyzer data more closeley

*/
ALTER TABLE "Issue" DROP COLUMN "summary",
ALTER COLUMN "criticality" DROP NOT NULL,
ALTER COLUMN "rel_timestamp" DROP NOT NULL,
ALTER COLUMN "frequency" DROP NOT NULL;

ALTER TABLE "ReliabilityKeyframe" ALTER COLUMN "interp" DROP NOT NULL;

ALTER TABLE "Review" ALTER COLUMN "review_id" SET NOT NULL;

CREATE UNIQUE INDEX "Review_review_id_key" ON "Review"("review_id");
DROP INDEX "Report_review_id_key";