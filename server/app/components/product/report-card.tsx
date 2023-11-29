import type { Prisma } from "@prisma/client";
import type { REPORT_INCLUDE } from "~/types/product";
import { Card, Title } from "@tremor/react";
import { getRelativeTimestampDate } from "~/utils/product";

type Report = Prisma.ReportGetPayload<{ include: typeof REPORT_INCLUDE }>;

interface ProductCardProps {
  report: Report;
  selectedProduct: string | null;
}

export default function ReportCard({
  report,
  selectedProduct,
}: ProductCardProps) {
  return (
    <Card
      className="mb-4 break-inside-avoid-column"
      id={report.id}
      decoration={selectedProduct === report.id ? "left" : ""}
    >
      <Title className="font-semibold">{report?.review?.title}</Title>
      <div>
        {report.issues.map(
          (issue) =>
            issue.text && (
              <div
                key={issue.id}
                className="my-3 rounded border-2 border-slate-100 bg-slate-50 p-2"
              >
                <div>
                  <b>Report</b>: {issue.text}
                </div>
                {issue.classification &&
                  issue.classification !== "UNKNOWN_ISSUE" && (
                    <div>
                      <b>Classification</b>: {issue.classification}
                    </div>
                  )}
                {issue.criticality && (
                  <div>
                    <b>Criticality</b>: {issue.criticality}
                  </div>
                )}
                <div>
                  <b>Date</b>:{" "}
                  {getRelativeTimestampDate(report, issue).toLocaleString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </div>
                {issue.frequency && (
                  <div>
                    <b>Frequency</b>: {issue.frequency}
                  </div>
                )}
                {issue.images?.length > 0 && (
                  <div>
                    <b>Images</b>:{" "}
                    {issue.images.map((image) => (
                      <img
                        key={image.image_url}
                        src={image.image_url}
                        alt="Product"
                      />
                    ))}
                  </div>
                )}
              </div>
            )
        )}
      </div>
      {report?.review?.is_top_positive_review ? (
        <p>
          <b>Top Positive Review</b>
        </p>
      ) : null}
      {report?.review?.is_top_critical_review ? (
        <p>
          <b>Top Critical Review</b>
        </p>
      ) : null}
      <p>
        <b>Date: </b>
        {report?.review?.date_text}
      </p>
      <p>
        <b>Verified Purchase: </b>
        {report?.review?.verified_purchase ? "Yes" : "No"}
      </p>
      <p>
        <b>"Found Helpful" Votes: </b>
        {report?.review?.found_helpful_count}
      </p>
      <hr className="my-2" />
    </Card>
  );
}
