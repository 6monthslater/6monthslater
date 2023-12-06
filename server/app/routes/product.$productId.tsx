import type { ActionFunction, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { AreaChart, Card, Title } from "@tremor/react";
import { useState } from "react";
import { useRootContext, WEBSITE_TITLE } from "~/root";
import CreateReportDialog from "~/components/create-report/create-report-dialog";
import type { ReportFormRow } from "~/types/ReportFormRow";
import type {
  ReportFormErrorRow,
  ReportFormErrors,
} from "~/types/ReportFormErrors";
import { createServerClient } from "~/utils/supabase.server";
import type { User } from "@supabase/supabase-js";
import ProductHeader from "~/components/product/product-header";
import type { PrismaClientError } from "~/types/PrismaClientError";
import { PRISMA_ERROR_MSG } from "~/types/PrismaClientError";
import type { ProdPageReport } from "~/types/product";
import { PRODUCT_INCLUDE } from "~/types/product";
import { getRelativeTimestampDate, getTopIssues } from "~/utils/product";
import { getSentenceCase } from "~/utils/format";
import ReportCard from "~/components/product/report-card";
import { buttonVariants } from "~/components/shadcn-ui-mod/button";

interface IssueGraphData {
  date: string;
  "Issue Amount": number;
}

export const loader = async ({ params }: { params: { productId: string } }) => {
  const product = await db.product.findFirst({
    where: {
      id: params.productId,
    },
    // Spliced because ~/components/product-card also needs access to the include object
    include: PRODUCT_INCLUDE,
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

function pushMainErrorMsg(errors: ReportFormErrors, msg: string): void {
  if (!errors.main.includes(msg)) {
    errors.main.push(msg);
  }
}

function upsertErrorRow(
  errors: ReportFormErrors,
  id: string,
  field: keyof ReportFormErrorRow
) {
  errors.rows[id] = errors.rows[id] ?? {
    eventDesc: false,
    date: false,
    criticality: false,
  };
  errors.rows[id][field] = true;
}

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

  const purchaseDateTimestamp = Date.parse(purchaseDateStr);
  if (Number.isNaN(purchaseDateTimestamp)) {
    errors.purchaseDate = "Purchase date format is invalid";
    return json({ errors }, { status: 400, headers });
  }

  const purchaseDate = new Date(purchaseDateTimestamp);

  const formRowsObj = JSON.parse(formRowsStr);

  if (!(formRowsObj satisfies ReportFormRow[])) {
    errors.main.push("Request format invalid");
    return json({ errors }, { status: 400, headers });
  }

  const formRows = formRowsObj as ReportFormRow[];

  for (const row of formRows) {
    if (!row.eventDesc) {
      pushMainErrorMsg(errors, "Descriptions are required for each event");
      upsertErrorRow(errors, row.id, "eventDesc");
    }
    if (!row.date) {
      pushMainErrorMsg(errors, "Dates are required for each event");
      errors.rows[row.id] = errors.rows[row.id] || {
        eventDesc: false,
        date: false,
        criticality: false,
      };
      errors.rows[row.id].date = true;
    } else if (row.date && new Date(row.date) < purchaseDate) {
      pushMainErrorMsg(
        errors,
        "Event dates cannot be earlier than the purchase date"
      );
      upsertErrorRow(errors, row.id, "date");
    }
    if (!row.criticality || row.criticality.length < 1) {
      pushMainErrorMsg(errors, "A badness rating is required for each event");
      upsertErrorRow(errors, row.id, "criticality");
    } else if (row.criticality[0] < 0 || row.criticality[0] > 1) {
      pushMainErrorMsg(
        errors,
        "Each badness rating must be a number between 0 and 1"
      );
      upsertErrorRow(errors, row.id, "criticality");
    }
    // The fallback value will not actually be used since the request will reject right after
    row.date = row.date ? new Date(row.date) : new Date();
  }

  if (Object.keys(errors.rows).length > 0) {
    return json({ errors }, { status: 400, headers });
  }

  const issues = formRows.map((row) => {
    return {
      text: row.eventDesc,
      rel_timestamp: Math.round(
        ((row.date?.getTime() ?? purchaseDate.getTime()) -
          purchaseDate.getTime()) /
          (1000 * 60 * 60 * 24)
      ),
      criticality: row.criticality[0],
    };
  });

  try {
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
  } catch (e) {
    const prismaError = e as PrismaClientError;
    if (prismaError) {
      console.error(prismaError.message);
      errors.main.push(PRISMA_ERROR_MSG);
      return json({ errors }, { status: 500, headers });
    } else {
      console.error(e);
      throw e;
    }
  }

  return json({ ok: true }, { headers });
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return { title: `Product: ${data.product?.name} - ${WEBSITE_TITLE}` };
};

function getIssueGraphData(reports: ProdPageReport[]): IssueGraphData[] {
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
          <Card className="flex break-inside-avoid flex-col space-y-3 md:h-full">
            <Title className="font-semibold">Top Issues</Title>
            <p className="!mt-0 text-sm text-neutral-500 opacity-90">
              Click on an issue to see more details.
            </p>

            <div className="-mx-3 space-y-3 overflow-scroll px-3">
              {topIssues.map((issue, index) => (
                <Link
                  to={`#${issue.id}`}
                  key={issue.text}
                  className={`${buttonVariants({
                    variant: "secondary",
                  })} h-min w-full !justify-start !whitespace-normal`}
                  onClick={() => {
                    setSelectedProduct(issue.id);
                  }}
                >
                  <span className="w-full">
                    {index + 1}.{" "}
                    {issue.classification &&
                    issue.classification !== "UNKNOWN_ISSUE" ? (
                      <span className="font-semibold">
                        {issue.classification}:
                      </span>
                    ) : null}{" "}
                    {issue.text}
                  </span>
                </Link>
              ))}
            </div>
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
          (report: ProdPageReport) =>
            report.issues.length > 0 && (
              <ReportCard
                key={report.id}
                report={report}
                selectedProduct={selectedProduct}
              />
            )
        )}
      </div>
    </div>
  );
}
