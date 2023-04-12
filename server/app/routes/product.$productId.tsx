import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { useEffect, useState } from "react";
import { BarList, Card, Title } from "@tremor/react";
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
    <div className="mx-4 h-full grow content-center items-center space-y-4 pt-4 text-center md:container md:mx-auto">
      <h1 className="text-xl font-semibold">{product?.name}</h1>
      <div className="mx-auto md:w-1/2">
        <Card>
          <Title className="font-semibold">Top Issues</Title>
          <BarList data={issueBarChartData} />
        </Card>
      </div>
    </div>
  );
}
