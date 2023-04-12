import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { useEffect, useState } from "react";
import { BarList, Card, DonutChart, Title } from "@tremor/react";
import type { TremorBarListData } from "~/types/TremorBarListData";

export const loader = async ({ params }: { params: { productId: string } }) => {
  const product = await db.product.findFirst({
    where: {
      id: params.productId,
    },
    include: {
      manufacturer: true,
    },
  });
  const reports = await db.report.findMany({
    where: {},
    include: {
      review: true,
      issues: true,
    },
  });
  return json({ product, reports });
};

export default function Route() {
  const { product, reports } = useLoaderData<typeof loader>();
  const [issueBarChartData, setIssueBarChartData] = useState<TremorBarListData>(
    []
  );

  useEffect(() => {
    const issueCounter = new Map<string, number>();
    const issueData: TremorBarListData = [];
    for (const report of reports) {
      for (const issue of report.issues) {
        issueCounter.set(
          issue.summary,
          (issueCounter.get(issue.summary) ?? 0) + 1
        );
      }
    }
    for (const [name, value] of issueCounter) {
      issueData.push({ name, value });
    }
    issueData.sort((a, b) => b.value - a.value);

    setIssueBarChartData(issueData);
  }, [reports]);

  return (
    <div className="mx-4 h-full grow content-center items-center space-y-4 py-4 text-center md:container md:mx-auto">
      <h1 className="text-xl font-semibold">{product?.name}</h1>
      <div className="mx-auto space-y-4 md:w-3/4 md:columns-md">
        <Card>
          <Title className="font-semibold">Top Issues</Title>
          <BarList data={issueBarChartData} />
        </Card>
        <Card>
          <Title className="font-semibold">Reliability Score</Title>
          <DonutChart
            data={[
              { name: "Score", value: 8.5 },
              { name: "Remainder", value: 2.5 },
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
          <Card key={report.id} className="mb-4 break-inside-avoid-column">
            <Title className="font-semibold">{report.review.title}</Title>
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
            <p>{report.review.text}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
