import type { MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { AreaChart, Card, Title } from "@tremor/react";
import { useState } from "react";
import { WEBSITE_TITLE } from "~/root";
import CreateReportDialog from "~/components/create-report/create-report-dialog";

interface TopIssue {
  text: string;
  id: string;
}

interface IssueGraphData {
  date: string;
  "Issue Amount": number;
}

export const loader = async ({ params }: { params: { productId: string } }) => {
  const product = await db.product.findFirst({
    where: {
      id: params.productId,
    },
    include: {
      manufacturer: true,
      reviews: {
        include: {
          reports: {
            include: {
              review: true,
              issues: {
                include: {
                  images: true,
                },
              },
            },
          },
        },
      },
    },
  });
  return json({ product });
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return { title: `Product: ${data.product?.name} - ${WEBSITE_TITLE}` };
};

function getTopIssues(
  reports: Array<{
    issues: Array<{
      text: string;
    }>;
    id: string;
  }>
): TopIssue[] {
  const issues: TopIssue[] = [];
  for (const report of reports) {
    for (const issue of report.issues) {
      if (issue.text) {
        issues.push({
          text: issue.text,
          id: report.id,
        });
      }
    }

    if (issues.length >= 5) {
      break;
    }
  }

  return issues;
}

function getRelativeTimestampDate(
  report: {
    review: {
      date_text: string;
    };
  },
  issue: {
    text: string;
    rel_timestamp: number | null;
  }
): Date {
  if (!issue.rel_timestamp) return new Date(report.review.date_text);

  if (issue.rel_timestamp > 1600000000) {
    // Treat as unix
    return new Date(issue.rel_timestamp * 1000);
  } else {
    // Treat as days since review was created
    const reviewDate = new Date(report.review.date_text);
    reviewDate.setDate(reviewDate.getDate() + issue.rel_timestamp);

    return reviewDate;
  }
}

function getIssueGraphData(
  reports: Array<{
    issues: Array<{
      text: string;
      rel_timestamp: number | null;
    }>;
    review: {
      date_text: string;
    };
  }>
): IssueGraphData[] {
  const issueGraphData: IssueGraphData[] = [];
  const months: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const month = new Date().getMonth() - i;
    months.push(month);

    issueGraphData.push({
      date: new Date(new Date().setMonth(month)).toLocaleString("default", {
        month: "long",
        year: "numeric",
      }),
      "Issue Amount": 0,
    });
  }

  for (const report of reports) {
    for (const issue of report.issues) {
      if (issue.text) {
        const date = getRelativeTimestampDate(report, issue);
        const month = date.getMonth();

        // Increment appropriate month
        for (let i = 0; i < months.length; i++) {
          if (month === months[i]) {
            issueGraphData[i]["Issue Amount"]++;
            break;
          }
        }
      }
    }
  }

  return issueGraphData;
}

export default function Route() {
  const { product } = useLoaderData<typeof loader>();
  const reports = product?.reviews.flatMap((review) => review.reports) ?? [];
  const topIssues = getTopIssues(reports);
  const issueGraphData = getIssueGraphData(reports);

  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  return (
    <div className="container mx-4 h-full grow content-center items-center space-y-4 py-4 text-center md:mx-auto">
      <h1 className="text-xl font-semibold">{product?.name}</h1>
      <div className="mx-auto flex w-full space-y-4 lg:w-3/4">
        <Card className="flex content-center px-6 py-3">
          <span className="my-auto">Own this product? Add a report!</span>
          <span className="ml-auto">
            <CreateReportDialog productName={product?.name} />
          </span>
        </Card>
      </div>
      <div className="mx-auto w-full space-y-4 md:h-[40vh] md:min-h-[calc(272px+16px+1.75rem+64px)] md:columns-2 lg:w-3/4 ">
        {topIssues.length > 0 && (
          <Card className="break-inside-avoid md:h-full">
            <Title className="font-semibold">Top Issues</Title>

            {topIssues.map((issue, index) => (
              <Link
                to={`#${issue.id}`}
                key={issue.text}
                className="block py-1"
                onClick={() => {
                  setSelectedProduct(issue.id);
                }}
              >
                {index + 1}. {issue.text}
              </Link>
            ))}
          </Card>
        )}

        <Card className="break-inside-avoid md:h-full">
          <Title className="font-semibold">Report History</Title>
          <AreaChart
            className="mt-4 h-72"
            data={issueGraphData}
            index="date"
            categories={["Issue Amount"]}
            colors={["cyan"]}
            valueFormatter={(n) => `${n.toLocaleString()} issues`}
          />
        </Card>
      </div>
      <div>
        <h2 className="text-lg font-semibold">Recent Reports</h2>
      </div>
      <div className="spacing-y-4 mx-auto columns-sm">
        {reports.map(
          (report) =>
            report.issues?.length > 0 && (
              <Card
                key={report.id}
                className="mb-4 break-inside-avoid-column"
                id={report.id}
                decoration={selectedProduct === report.id ? "left" : ""}
              >
                <Title className="font-semibold">{report.review.title}</Title>
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
                            {getRelativeTimestampDate(
                              report,
                              issue
                            ).toLocaleString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
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
                {report.review.is_top_positive_review ? (
                  <p>
                    <b>Top Positive Review</b>
                  </p>
                ) : null}
                {report.review.is_top_critical_review ? (
                  <p>
                    <b>Top Critical Review</b>
                  </p>
                ) : null}
                <p>
                  <b>Date: </b>
                  {report.review.date_text}
                </p>
                <p>
                  <b>Verified Purchase: </b>
                  {report.review.verified_purchase ? "Yes" : "No"}
                </p>
                <p>
                  <b>"Found Helpful" Votes: </b>
                  {report.review.found_helpful_count}
                </p>
                <hr className="my-2" />
              </Card>
            )
        )}
      </div>
    </div>
  );
}
