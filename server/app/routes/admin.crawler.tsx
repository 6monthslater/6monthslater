import type { ActionFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { sendCrawlerCommand } from "../queue-handling/review.server";
import { ReviewRegion, ReviewSource } from "../queue-handling/review.server";

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
    <div
      style={{
        margin: "10px",
        textAlign: "center",
      }}
    >
      <h1 className="text-1xl font-bold">Control the product crawler</h1>

      <Form method="post">
        <div>
          <label>
            <textarea
              name="url"
              rows={1}
              cols={100}
              style={{
                border: "1px solid #ccc",
              }}
            />
          </label>
        </div>
        {actionData?.formError && (
          <div className="text-red-500">{actionData.formError}</div>
        )}
        <button type="submit" className="button" name="command" value="set">
          Set crawler category
        </button>
      </Form>

      <Form method="post">
        <button type="submit" className="button" name="command" value="cancel">
          Stop crawler
        </button>
      </Form>
    </div>
  );
}
