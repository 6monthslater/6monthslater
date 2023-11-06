import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { Card, DonutChart, Title } from "@tremor/react";
import { useState } from "react";

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
                  images: true
                }
              },
            },
          }
        }
      }
    },
  });
  return json({ product });
};

interface TopIssue {
  text: string;
  id: string;
}

export default function Route() {
  const { product } = useLoaderData<typeof loader>();
  const reports = product?.reviews.flatMap((review) => review.reports) ?? [];
  const topIssues = getTopIssues(reports);

  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  return (
    <div className="mx-4 h-full grow content-center items-center space-y-4 py-4 text-center md:container md:mx-auto">
      <h1 className="text-xl font-semibold">{product?.name}</h1>
      <div className="mx-auto space-y-4 md:w-3/4 md:columns-md">
        {topIssues.length > 0 &&
          <Card>
            <Title className="font-semibold">Top Issues</Title>

            {topIssues.map((issue, index) => (
              <Link to={`#${issue.id}`} key={issue.text}
                  className="py-1 block"
                  onClick={() => {
                    setSelectedProduct(issue.id);
                  }}>
                {index + 1}.{" "}
                {issue.text}
              </Link>
            ))}
          </Card>
        }
          
        <Card>
          <Title className="font-semibold">Reliability Score</Title>
          <DonutChart
            data={[
              { name: "Score", value: 8.5 },
              { name: "Remainder", value: 1.5 },
            ]}
            label="8.5/10"
            showLabel
            colors={["cyan", "slate"]}
          />
        </Card>
      </div>
      <div>
        <h2 className="text-lg font-semibold">Recent Reports</h2>
      </div>
      <div className="spacing-y-4 mx-auto columns-sm">
        {reports.map((report) => (
          report.issues?.length > 0 && (
            <Card key={report.id}
                className="mb-4 break-inside-avoid-column"
                id={report.id}
                decoration={selectedProduct === report.id ? "left" : ""}>
              <Title className="font-semibold">{report.review.title}</Title>
                <div>
                  <b>Issues</b>:{" "}
                  {report.issues.map((issue) => (issue.text &&
                    <div key={issue.id} className="border-4">
                      <div>
                        <b>Text</b>: {issue.text}
                      </div>
                      <div>
                        <b>Classification</b>: {issue.classification}
                      </div>
                      <div>
                        <b>Criticality</b>: {issue.criticality}
                      </div>
                      <div>
                        <b>Relative Timestamp</b>: {issue.rel_timestamp}
                      </div>
                      <div>
                        <b>Frequency</b>: {issue.frequency}
                      </div>
                      {issue.images?.length > 0 && (
                        <div>
                          <b>Images</b>:{" "}
                          {issue.images.map((image) => (
                            // eslint-disable-next-line jsx-a11y/img-redundant-alt
                            <img
                              key={image.image_url}
                              src={image.image_url}
                              alt="Photo of product"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
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
        ))}
      </div>
    </div>
  );
}

function getTopIssues(reports: Array<{
  issues: Array<{
    text: string;
  }>;
  id: string;
}>): TopIssue[] {
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