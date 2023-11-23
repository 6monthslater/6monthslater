import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { useFetcher, useLoaderData, useSubmit } from "@remix-run/react";
import type { DeltaType } from "@tremor/react";
import { BadgeDelta, Card, Title } from "@tremor/react";
import { Button } from "~/components/shadcn-ui-mod/button";
import { useEffect, useRef } from "react";
import {
  clearParseQueue,
  clearToAnalyzeQueue,
  getStatusOfQueue,
} from "~/queue-handling/review.server";
import { json, redirect } from "@remix-run/node";
import {
  isAdmin,
  createServerClient,
  FORBIDDEN_ROUTE,
} from "~/utils/supabase.server";

export const action: ActionFunction = async ({ request }) => {
  const { type } = Object.fromEntries(await request.formData());
  if (typeof type !== "string" || type.length === 0) {
    return null;
  }

  switch (type) {
    case "clearParseQueue": {
      await clearParseQueue();
      break;
    }
    case "clearToAnalyzeQueue": {
      await clearToAnalyzeQueue();
      break;
    }
  }

  return null;
};

export const loader: LoaderFunction = async ({ request }) => {
  const { supabase, headers } = createServerClient(request);
  if (!(await isAdmin(supabase))) {
    return redirect(FORBIDDEN_ROUTE, { headers });
  }

  const parseQueue = getStatusOfQueue("parse");
  const processQueue = getStatusOfQueue("to_analyze");

  return json(
    {
      parseQueue: await parseQueue,
      processQueue: await processQueue,
    },
    { headers }
  );
};

export default function Index() {
  const submit = useSubmit();
  const initialQueueData = useLoaderData<typeof loader>();
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
          <Card className="space-y-4">
            <Title>Product Scraping Queue</Title>

            {getBadge(
              nextData?.parseQueue?.messageCount,
              previousData?.parseQueue?.messageCount,
              "product"
            )}

            {getBadge(
              nextData?.parseQueue?.consumerCount,
              previousData?.parseQueue?.consumerCount,
              "scraper instance"
            )}

            <Button
              type="submit"
              className="block"
              size="sm"
              onClick={() => {
                submit(
                  { type: "clearParseQueue" },
                  {
                    preventScrollReset: true,
                    method: "post",
                  }
                );
              }}
            >
              Clear Queue
            </Button>
          </Card>
        </div>
        <div className="col col-span-1">
          <Card className="space-y-4">
            <Title>Review Processing Queue</Title>

            {getBadge(
              nextData?.processQueue?.messageCount,
              previousData?.processQueue?.messageCount,
              "review"
            )}

            {getBadge(
              nextData?.processQueue?.consumerCount,
              previousData?.processQueue?.consumerCount,
              "processing instance"
            )}

            <Button
              type="submit"
              className="block"
              size="sm"
              onClick={() => {
                submit(
                  { type: "clearToAnalyzeQueue" },
                  {
                    preventScrollReset: true,
                    method: "post",
                  }
                );
              }}
            >
              Clear Queue
            </Button>
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
