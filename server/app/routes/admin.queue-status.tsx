import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import {
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import type { DeltaType } from "@tremor/react";
import { BadgeDelta, Card, Title } from "@tremor/react";
import { Button } from "~/components/shadcn-ui-mod/button";
import { useEffect, useRef, useState } from "react";
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
import { WEBSITE_TITLE } from "~/root";
import { InlineLoadingSpinner } from "~/components/inline-loading-spinner";
import { useToast } from "~/components/ui/use-toast";
import type { ToastVariant } from "~/components/ui/toast";

const PAGE_TITLE = "Queue Status";

export const meta: MetaFunction = () => {
  return { title: `${PAGE_TITLE} - ${WEBSITE_TITLE}` };
};

export const action: ActionFunction = async ({ request }) => {
  const { supabase, headers } = createServerClient(request);

  if (!(await isAdmin(supabase))) {
    return json(
      { error: "Requesting user is not an administrator or is not logged in" },
      { status: 400, headers }
    );
  }

  const { type } = Object.fromEntries(await request.formData());
  if (typeof type !== "string" || type.length === 0) {
    return json({ error: "Invalid request" }, { status: 400, headers });
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

  return json({ ok: true, action: type }, { headers });
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
  const actionData = useActionData<typeof action>();
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

  // Pending UI
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [action, setAction] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (navigation.state === "idle") {
      setAction("");
      if (actionData?.ok) {
        let title: string;
        let description: string;
        let variant: ToastVariant;
        switch (actionData?.action) {
          case "clearParseQueue": {
            title = "Success!";
            description = "Scraper queue cleared.";
            variant = "default";
            break;
          }
          case "clearToAnalyzeQueue": {
            title = "Success!";
            description = "Analyzer queue cleared.";
            variant = "default";
            break;
          }
          default: {
            title = "Error";
            description = "Invalid Response";
            variant = "destructive";
            break;
          }
        }
        toast({ title, description, variant });
      } else if (actionData?.error) {
        toast({
          title: "Error",
          description: actionData.error,
          variant: "destructive",
        });
      }
    }
  }, [navigation, actionData, toast]);

  return (
    <div className="space-y-4 self-center px-6 text-center lg:w-3/5">
      <h1 className="text-2xl font-bold">Admin: {PAGE_TITLE}</h1>

      <div className="grid grid-cols-2 space-x-4">
        <div className="col col-span-1">
          <Card className="flex flex-col space-y-4">
            <Title>Product Scraping Queue</Title>

            <div className="flex">
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
            </div>

            <div>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                onClick={() => {
                  const nextAction = "clearParseQueue";
                  setAction(nextAction);
                  submit(
                    { type: nextAction },
                    {
                      preventScrollReset: true,
                      method: "post",
                    }
                  );
                }}
              >
                <InlineLoadingSpinner show={action === "clearParseQueue"} />
                Clear Queue
              </Button>
            </div>
          </Card>
        </div>
        <div className="col col-span-1">
          <Card className="flex flex-col space-y-4">
            <Title>Review Processing Queue</Title>

            <div className="flex">
              {getBadge(
                nextData?.processQueue?.messageCount,
                previousData?.processQueue?.messageCount,
                "product"
              )}

              {getBadge(
                nextData?.processQueue?.consumerCount,
                previousData?.processQueue?.consumerCount,
                "analyzer instance"
              )}
            </div>

            <div>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                onClick={() => {
                  const nextAction = "clearToAnalyzeQueue";
                  setAction(nextAction);
                  submit(
                    { type: nextAction },
                    {
                      preventScrollReset: true,
                      method: "post",
                    }
                  );
                }}
              >
                <InlineLoadingSpinner show={action === "clearToAnalyzeQueue"} />
                Clear Queue
              </Button>
            </div>
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
