import type { ActionFunction, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { AreaChart, Card, Title } from "@tremor/react";
import { useState } from "react";
import { useRootContext, WEBSITE_TITLE } from "~/root";
import CreateReportDialog from "~/components/create-report/create-report-dialog";
import type { ReportFormRow } from "~/types/ReportFormRow";
import type { ReportFormErrors } from "~/types/ReportFormErrors";
import { createServerClient } from "~/utils/supabase.server";
import type { User } from "@supabase/supabase-js";
import ProductHeader from "~/components/product-header";

interface TopIssue {
  text: string;
  classification: string;
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
  const reports = (
    product?.reports.concat(
      product?.reviews.flatMap((review) => review.reports ?? [])
    ) ?? []
  ).map((report) => ({
    ...report,
    issues: report.issues.map((issue) => ({
      ...issue,
      text: getSentenceCase(issue.text),
    })),
  }));

  return json({ product, reports });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const formRowsStr = formData.get("data");
  const productId = formData.get("productId");
  const purchaseDateStr = formData.get("purchaseDate");

  const errors: ReportFormErrors = {
    main: [],
    rows: {},
  };

  const { supabase, headers } = createServerClient(request);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    errors.main.push("You must be logged in to create a report");
    return json({ errors }, { status: 400, headers });
  }

  if (!session.user) {
    errors.main.push("Internal error: User does not exist");
    return json({ errors }, { status: 400, headers });
  }

  const sbUser: User = session.user;

  if (
    !formRowsStr ||
    typeof formRowsStr !== "string" ||
    !productId ||
    typeof productId !== "string"
  ) {
    errors.main.push("Request missing required data");
    return json({ errors }, { status: 400, headers });
  }

  if (!purchaseDateStr || typeof purchaseDateStr !== "string") {
    errors.purchaseDate = "Purchase date is required";
    return json({ errors }, { status: 400, headers });
  }

  const formRowsObj = JSON.parse(formRowsStr);

  if (!(formRowsObj satisfies ReportFormRow[])) {
    errors.main.push("Request format invalid");
    return json({ errors }, { status: 400, headers });
  }

  const formRows = formRowsObj as ReportFormRow[];

  const eventDescErrText = "Descriptions are required for each event";
  const dateErrText = "Dates are required for each event";

  for (const row of formRows) {
    if (!row.eventDesc) {
      !errors.main.includes(eventDescErrText) &&
        errors.main.push(eventDescErrText);
      errors.rows[row.id] = errors.rows[row.id] || {
        eventDesc: false,
        date: false,
      };
      errors.rows[row.id].eventDesc = true;
    }
    if (!row.date) {
      !errors.main.includes(dateErrText) && errors.main.push(dateErrText);
      errors.rows[row.id] = errors.rows[row.id] || {
        eventDesc: false,
        date: false,
      };
      errors.rows[row.id].date = true;
    }
    // The fallback value will not actually be used since the request will reject right after
    row.date = row.date ? new Date(row.date) : new Date();
  }

  if (Object.keys(errors.rows).length > 0) {
    return json({ errors }, { status: 400, headers });
  }

  const purchaseDateTimestamp = Date.parse(purchaseDateStr);
  if (Number.isNaN(purchaseDateTimestamp)) {
    errors.purchaseDate = "Purchase date format is invalid";
    return json({ errors }, { status: 400, headers });
  }

  const purchaseDate = new Date(purchaseDateTimestamp);

  const issues = formRows.map((row) => {
    return {
      text: row.eventDesc,
      rel_timestamp: Math.round(
        ((row.date?.getTime() ?? purchaseDate.getTime()) -
          purchaseDate.getTime()) /
          (1000 * 60 * 60 * 24)
      ),
    };
  });

  await db.report.create({
    data: {
      report_weight: 1.0,
      issues: {
        create: issues,
      },
      product: {
        connect: {
          id: productId,
        },
      },
      purchaseDate,
      authorId: sbUser.id,
    },
  });

  return json({ ok: true }, { headers });
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return { title: `Product: ${data.product?.name} - ${WEBSITE_TITLE}` };
};

function getSentenceCase(str: string): string {
  // Fancy slicing done to combat issues with unicode causing strings to count multiple characters as one index
  // So, it splits it to a character array first.
  return str ? str.charAt(0).toUpperCase() + [...str].slice(1).join("") : str;
}

function getTopIssues(
  reports: Array<{
    issues: Array<{
      text: string;
      classification: string;
    }>;
    id: string;
  }>
): TopIssue[] {
  const issues: TopIssue[] = [];
  //First pass: adding classified issues with priority
  for (const report of reports) {
    for (const issue of report.issues) {
      if (issue.text && !issues.some((i) => i.text === issue.text) && issue.classification !== "UNKNOWN_ISSUE") {
        issues.push({
          text: issue.text,
          classification: issue.classification,
          id: report.id,
        });
      }
    }

    if (issues.length >= 5) {
      return issues;
    }
  }

  //Second pass: adding unclassified issues if needed
  for (const report of reports) {
    for (const issue of report.issues) {
      if (issue.text && !issues.some((i) => i.text === issue.text) && issue.classification === "UNKNOWN_ISSUE") {
        issues.push({
          text: issue.text,
          id: report.id,
        });
      }

      if (issues.length >= 5) {
        return issues;
      }
    }
  }

  return issues;
}

function getRelativeTimestampDate(
  report: {
    review: {
      date_text: string;
    };
    purchaseDate: Date;
  },
  issue: {
    text: string;
    rel_timestamp: number | null;
  }
): Date {
  if (!issue.rel_timestamp)
    return new Date(report.purchaseDate ?? report.review.date_text);

  if (issue.rel_timestamp > 1600000000) {
    // Treat as unix
    return new Date(issue.rel_timestamp * 1000);
  } else {
    // Treat as days since review was created
    const reviewDate = new Date(report.purchaseDate ?? report.review.date_text);
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
    purchaseDate: Date;
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
  const { product, reports } = useLoaderData<typeof loader>();
  const topIssues = getTopIssues(reports);
  const issueGraphData = getIssueGraphData(reports);

  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  const { isLoggedIn } = useRootContext();

  return (
    <div className="container mx-4 h-full grow content-center items-center space-y-4 py-4 text-center md:mx-auto">
      <ProductHeader product={product} />

      <div className="mx-auto flex w-full space-y-4 lg:w-3/4">
        <Card className="flex content-center px-6 py-3">
          {isLoggedIn ? (
            <>
              <span className="my-auto">Own this product? Add a report!</span>
              <span className="ml-auto">
                <CreateReportDialog
                  productName={product?.name}
                  productId={product?.id}
                />
              </span>
            </>
          ) : (
            <>
              <span className="my-auto">
                Own this product and want to add a report?{" "}
                <Link to="/auth/login" className="text-blue-500 underline">
                  Login
                </Link>{" "}
                or{" "}
                <Link to="/auth/signup" className="text-blue-500 underline">
                  sign up
                </Link>
                .
              </span>
            </>
          )}
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
                {index + 1}. {issue.classification && issue.classification !== "UNKNOWN_ISSUE" ? <b>{issue.classification}:</b> : ''} {issue.text}
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
            )
        )}
      </div>
    </div>
  );
}
