import { useFetcher, useLoaderData } from "@remix-run/react";
import type { DeltaType } from "@tremor/react";
import { BadgeDelta, Card, Title } from "@tremor/react";
import { useEffect, useRef } from "react";
import type { QueueStatus } from "~/queue-handling/review.server";
import { getStatusOfQueue } from "~/queue-handling/review.server";

interface LoaderData {
  parseQueue: QueueStatus;
  processQueue: QueueStatus;
}

export const loader = async (): Promise<LoaderData> => {
  const parseQueue = getStatusOfQueue("parse");
  const processQueue = getStatusOfQueue("parsed_reviews");

  return {
    parseQueue: await parseQueue,
    processQueue: await processQueue,
  };
};

export default function Index() {
  const initialQueueData = useLoaderData<LoaderData>();
  const nextQueueData = useFetcher<typeof loader>();
  const allQueueDataRef = useRef([initialQueueData]);
  const interval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (nextQueueData.type === "done" && nextQueueData.data) {
      allQueueDataRef.current.push(nextQueueData.data);
    }
  }, [nextQueueData]);

  useEffect(() => {
    if (interval.current) clearInterval(interval.current);

    const intervalId = (interval.current = setInterval(() => {
      nextQueueData.load("/admin/queue-status");
    }, 3000));

    return () => clearInterval(intervalId);
  });

  const previousData =
    allQueueDataRef.current[allQueueDataRef.current.length - 2] ||
    initialQueueData;
  const nextData = nextQueueData.data;

  return (
    <div className="space-y-4 self-center px-6 text-center lg:w-3/5">
      <h1 className="text-2xl font-bold">Admin: Queue Status</h1>

      <div className="grid grid-cols-2 space-x-4">
        <div className="col col-span-1">
          <Card>
            <Title>Product Scraping Queue</Title>

            {getBadge(
              nextData?.parseQueue?.messageCount,
              previousData?.parseQueue?.messageCount,
              "message"
            )}

            {getBadge(
              nextData?.parseQueue?.consumerCount,
              previousData?.parseQueue?.consumerCount,
              "consumer"
            )}
          </Card>
        </div>
        <div className="col col-span-1">
          <Card>
            <Title>Review Processing Queue</Title>

            {getBadge(
              nextData?.processQueue?.messageCount,
              previousData?.processQueue?.messageCount,
              "message"
            )}

            {getBadge(
              nextData?.processQueue?.consumerCount,
              previousData?.processQueue?.consumerCount,
              "consumer"
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function getBadge(value: number | undefined, oldValue: number, word: string) {
  value = value || oldValue;
  let deltaType = "unchanged" as DeltaType;
  if (value > oldValue) {
    deltaType = "increase";
  } else if (value < oldValue) {
    deltaType = "decrease";
  }

  return (
    <BadgeDelta deltaType={deltaType} size="xl" className="mr-2">
      {`${value} ${word}${value === 1 ? "" : "s"}`}
    </BadgeDelta>
  );
}
