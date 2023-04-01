import { useFetcher, useLoaderData } from "@remix-run/react";
import type { DeltaType } from "@tremor/react";
import { BadgeDelta, Card, Col, Grid, Title } from "@tremor/react";
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

    interval.current = setInterval(() => {
      nextQueueData.load("/admin/queue-status");
    }, 3000);
  });

  const previousData =
    allQueueDataRef.current[allQueueDataRef.current.length - 2] ||
    initialQueueData;
  const nextData = nextQueueData.data;

  return (
    <>
      <Card style={{ textAlign: "center" }}>
        <h1>Queue Statuses</h1>
      </Card>

      <Grid numCols={2}>
        <Col numColSpan={1}>
          <Card>
            <Title>Products to scrape</Title>

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
        </Col>
        <Col numColSpan={1}>
          <Card>
            <Title>Reviews to process</Title>

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
        </Col>
      </Grid>
    </>
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
