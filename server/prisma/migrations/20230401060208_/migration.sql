-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "report_weight" DOUBLE PRECISION NOT NULL,
    "review_id" TEXT NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReliabilityKeyframe" (
    "id" TEXT NOT NULL,
    "rel_timestamp" INTEGER NOT NULL,
    "sentiment" DOUBLE PRECISION NOT NULL,
    "interp" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,

    CONSTRAINT "ReliabilityKeyframe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "criticality" DOUBLE PRECISION NOT NULL,
    "rel_timestamp" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueImage" (
    "id" TEXT NOT NULL,
    "review_image_id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,

    CONSTRAINT "IssueImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Report_review_id_key" ON "Report"("review_id");

-- CreateIndex
CREATE UNIQUE INDEX "IssueImage_review_image_id_key" ON "IssueImage"("review_image_id");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "Review"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReliabilityKeyframe" ADD CONSTRAINT "ReliabilityKeyframe_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueImage" ADD CONSTRAINT "IssueImage_review_image_id_fkey" FOREIGN KEY ("review_image_id") REFERENCES "ReviewImage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueImage" ADD CONSTRAINT "IssueImage_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "Issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
