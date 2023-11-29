import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import {
  ReviewRegion,
  ReviewSource,
  sendCrawlerCommand,
} from "~/queue-handling/review.server";
import { Button } from "~/components/shadcn-ui-mod/button";
import { Textarea } from "~/components/ui/textarea";
import {
  isAdmin,
  createServerClient,
  FORBIDDEN_ROUTE,
} from "~/utils/supabase.server";
import { WEBSITE_TITLE } from "~/root";
import { useEffect, useState } from "react";
import { InlineLoadingSpinner } from "~/components/inline-loading-spinner";

const PAGE_TITLE = "Control Product Crawler";

interface ActionData {
  data?: string;
  formError?: string;
}

export const meta: MetaFunction = () => {
  return { title: `${PAGE_TITLE} - ${WEBSITE_TITLE}` };
};

export const loader: LoaderFunction = async ({ request }) => {
  const { supabase, headers } = createServerClient(request);
  if (!(await isAdmin(supabase))) {
    return redirect(FORBIDDEN_ROUTE, { headers });
  }

  return json(
    { ok: true },
    {
      headers,
    }
  );
};

export const action: ActionFunction = async ({
  request,
}): Promise<Response | ActionData> => {
  const formData = Object.fromEntries(await request.formData());
  switch (formData.command) {
    case "set": {
      const { url } = formData;
      if (typeof url !== "string" || url.length === 0) {
        return { formError: `Data missing` };
      }

      sendCrawlerCommand({
        command: formData.command,
        url,
        review_info: {
          region: url.includes("amazon.ca")
            ? ReviewRegion.CA
            : ReviewRegion.COM,
          type: ReviewSource.AMAZON,
        },
      });
      break;
    }
    case "cancel":
      sendCrawlerCommand({
        command: formData.command,
      });
      break;
  }

  return redirect("");
};

export default function Index() {
  const actionData = useActionData<ActionData | undefined>();

  // Pending UI
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === "loading" || navigation.state === "submitting";

  const [action, setAction] = useState("");

  useEffect(() => {
    if (navigation.state === "idle") {
      setAction("");
    }
  }, [navigation]);

  return (
    <div className="mx-4 h-full content-center items-center space-y-4 pt-4 text-center md:container md:mx-auto">
      <h1 className="text-2xl font-bold">Admin: {PAGE_TITLE}</h1>

      <Form method="post">
        <div className="mx-auto px-6 md:w-1/2">
          <label>
            <Textarea
              name="url"
              rows={1}
              cols={100}
              className="resize-y border-2"
              disabled={isSubmitting}
            />
          </label>
        </div>
        {actionData?.formError && (
          <div className="text-red-500">{actionData.formError}</div>
        )}
        <Button
          type="submit"
          className="mt-4"
          name="command"
          value="set"
          size="sm"
          disabled={isSubmitting}
          onClick={() => {
            setAction("set");
          }}
        >
          <InlineLoadingSpinner show={action === "set"} />
          Set crawler category
        </Button>
      </Form>

      <Form method="post">
        <Button
          type="submit"
          className=""
          name="command"
          value="cancel"
          size="sm"
          disabled={isSubmitting}
          onClick={() => {
            setAction("cancel");
          }}
        >
          <InlineLoadingSpinner show={action === "cancel"} />
          Stop crawler
        </Button>
      </Form>
    </div>
  );
}
