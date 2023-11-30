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
import { useEffect, useRef, useState } from "react";
import { InlineLoadingSpinner } from "~/components/inline-loading-spinner";
import { useToast } from "~/components/ui/use-toast";
import type { ToastVariant } from "~/components/ui/toast";

const PAGE_TITLE = "Control Product Crawler";

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

export const action: ActionFunction = async ({ request }) => {
  const { supabase, headers } = createServerClient(request);

  if (!(await isAdmin(supabase))) {
    return json(
      { error: "Requesting user is not an administrator or is not logged in" },
      { status: 400, headers }
    );
  }
  const formData = Object.fromEntries(await request.formData());
  switch (formData.command) {
    case "set": {
      const { url } = formData;
      if (typeof url !== "string" || url.length === 0) {
        return json(
          { error: "Missing or invalid URL provided" },
          { status: 400, headers }
        );
      }

      await sendCrawlerCommand({
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
      await sendCrawlerCommand({
        command: formData.command,
      });
      break;
  }

  return json({ ok: true, action: formData.command }, { headers });
};

export default function Index() {
  const actionData = useActionData<typeof action>();

  const formRef = useRef<HTMLFormElement>(null);

  // Pending UI
  const navigation = useNavigation();
  const { toast } = useToast();
  const isSubmitting =
    navigation.state === "loading" || navigation.state === "submitting";

  const [action, setAction] = useState("");

  useEffect(() => {
    if (navigation.state === "idle") {
      setAction("");
      if (actionData?.ok) {
        formRef?.current?.reset();
        let title: string;
        let description: string;
        let variant: ToastVariant;
        switch (actionData?.action) {
          case "set": {
            title = "Success!";
            description = "Crawler category set.";
            variant = "default";
            break;
          }
          case "cancel": {
            title = "Success!";
            description = "Crawler stopped.";
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
      }
    }
  }, [navigation, actionData, toast]);

  return (
    <div className="mx-4 h-full content-center items-center space-y-4 pt-4 text-center md:container md:mx-auto">
      <h1 className="text-2xl font-bold">Admin: {PAGE_TITLE}</h1>

      <Form method="post" ref={formRef}>
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
        {actionData?.error && (
          <div className="text-red-500">{actionData.error}</div>
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
