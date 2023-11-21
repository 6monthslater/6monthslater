import type { ActionFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import {
  ReviewRegion,
  ReviewSource,
  sendCrawlerCommand,
} from "~/queue-handling/review.server";
import Button from "~/components/tremor-ui/button";

interface ActionData {
  data?: string;
  formError?: string;
}

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
          region: ReviewRegion.COM,
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

  return (
    <div className="mx-4 h-full content-center items-center space-y-4 pt-4 text-center md:container md:mx-auto">
      <h1 className="text-2xl font-bold">Admin: Control the Product Crawler</h1>

      <Form method="post">
        <div>
          <label>
            <textarea
              name="url"
              rows={1}
              cols={100}
              className="resize-y rounded-md border-2"
            />
          </label>
        </div>
        {actionData?.formError && (
          <div className="text-red-500">{actionData.formError}</div>
        )}
        <Button type="submit" className="mt-4" name="command" value="set">
          Set crawler category
        </Button>
      </Form>

      <Form method="post">
        <Button type="submit" className="" name="command" value="cancel">
          Stop crawler
        </Button>
      </Form>
    </div>
  );
}
