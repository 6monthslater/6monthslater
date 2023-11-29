import type { Prisma } from "@prisma/client";
import type { REPORT_INCLUDE } from "~/types/product";
import { Card, DonutChart } from "@tremor/react";
import { Badge } from "~/components/ui/badge";
import { getSingleUnitDateInterval } from "~/utils/format";
import { TbCircleCheck, TbThumbUp } from "react-icons/tb";
import { Separator } from "~/components/ui/separator";

type Report = Prisma.ReportGetPayload<{ include: typeof REPORT_INCLUDE }>;

interface ProductCardProps {
  report: Report;
  selectedProduct: string | null;
}

interface IssueTimeProps {
  days: number;
}

function IssueTimeBlock({ days }: IssueTimeProps) {
  const { interval, units } = getSingleUnitDateInterval(days);
  return (
    <div className="grid grid-rows-2 items-center justify-center text-center">
      <div className="text-3xl">
        {interval === Infinity ? <>&infin;</> : interval}
      </div>
      <div>{units} later</div>
    </div>
  );
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
      <div>
        {report.issues.map(
          (issue) =>
            issue.text && (
              <div
                key={issue.id}
                className="my-3 rounded border-2 border-slate-100 bg-slate-50 p-2"
              >
                <div>{issue.text}</div>
                {issue.classification &&
                  issue.classification !== "UNKNOWN_ISSUE" && (
                    <div>
                      <Badge variant="outline">{issue.classification}</Badge>
                    </div>
                  )}
                <div>
                  {(issue.rel_timestamp || issue.criticality) && (
                    <Separator className="my-2" />
                  )}
                  <div
                    className={`grid ${
                      issue.rel_timestamp && issue.criticality
                        ? "grid-cols-2"
                        : ""
                    } items-center justify-center divide-x-2`}
                  >
                    {issue.rel_timestamp && (
                      <span className="flex items-center justify-center">
                        <IssueTimeBlock days={issue.rel_timestamp} />
                      </span>
                    )}
                    {issue.criticality && (
                      <span className="flex flex-col items-center justify-center">
                        <DonutChart
                          data={[
                            { name: "Criticality", value: issue.criticality },
                            { name: "", value: 1 - issue.criticality },
                          ]}
                          label={`${(issue.criticality * 100).toString()}%`}
                          showLabel
                          colors={(() => {
                            if (!issue.criticality || issue.criticality > 1) {
                              return ["slate", "slate"];
                            } else if (issue.criticality > 0.8) {
                              return ["red", "slate"];
                            } else if (issue.criticality > 0.5) {
                              return ["orange", "slate"];
                            } else if (issue.criticality > 0.3) {
                              return ["yellow", "slate"];
                            } else if (issue.criticality > 0.0) {
                              return ["green", "slate"];
                            } else {
                              return ["cyan", "slate"];
                            }
                          })()}
                          className="h-20 w-20"
                        />
                        {(() => {
                          if (!issue.criticality || issue.criticality > 1) {
                            return null;
                          } else if (issue.criticality > 0.8) {
                            return (
                              <Badge className="bg-red-500">CRITICAL</Badge>
                            );
                          } else if (issue.criticality > 0.5) {
                            return (
                              <Badge className="bg-orange-500">SEVERE</Badge>
                            );
                          } else if (issue.criticality > 0.3) {
                            return (
                              <Badge className="bg-yellow-500">MODERATE</Badge>
                            );
                          } else if (issue.criticality > 0.0) {
                            return (
                              <Badge className="bg-green-500">MINOR</Badge>
                            );
                          } else {
                            return null;
                          }
                        })()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
        )}
      </div>
      <div className="grid grid-cols-3 items-center justify-center divide-x-2 text-center">
        <div className="flex h-full flex-col items-center justify-center px-2">
          {(() => {
            const date = report?.review?.date ?? report.createdAt;
            return (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="text-sm font-semibold">Report Date</div>
                <div className="text-xl font-semibold">
                  {new Date(date).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
                <div>{new Date(date).getFullYear()}</div>
              </div>
            );
          })()}
        </div>
        <div className="flex h-full flex-col items-center justify-center px-2 leading-snug">
          {report?.review?.verified_purchase ? (
            <>
              <TbCircleCheck className="h-10 w-10 stroke-lime-500" />
              <span>Verified Purchase</span>
            </>
          ) : null}
        </div>
        <div className="flex h-full items-center justify-center gap-2 px-2 text-2xl">
          <TbThumbUp className="h-8 w-8 fill-blue-400 stroke-1" />
          {report?.review?.found_helpful_count}
        </div>
      </div>
      <div
        hidden={
          !report?.review?.is_top_critical_review &&
          !report?.review?.is_top_positive_review
        }
        className="text-center"
      >
        <Separator className="my-2 h-0.5" />
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
      </div>
    </Card>
  );
}
