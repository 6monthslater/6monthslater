import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import type { Product } from "~/queue-handling/review.server";
import {
  ReviewRegion,
  ReviewSource,
  sendProductToQueue,
} from "~/queue-handling/review.server";
import { Button } from "~/components/ui/button";
import {
  isAdmin,
  createServerClient,
  FORBIDDEN_ROUTE,
} from "~/utils/supabase.server";

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

interface ActionData {
  data?: string;
  formError?: string;
}

export const action: ActionFunction = async ({
  request,
}): Promise<Response | ActionData> => {
  const { data } = Object.fromEntries(await request.formData());
  if (typeof data !== "string" || data.length === 0) {
    return { formError: `Data missing` };
  }

  let errors = "";

  const lines = data.split("\n");
  for (const line of lines) {
    // get first group from regex
    const productIDRegex = /amazon\..+\/dp\/(.+?)\//;
    const match = line.match(productIDRegex);
    if (match && match.length > 1) {
      const product: Product = {
        id: match[1],
        region: ReviewRegion.CA,
        type: ReviewSource.AMAZON,
      };

      sendProductToQueue(product);
    } else {
      errors += `Invalid product ID: ${line}\n`;
    }
  }

  if (errors.length > 0) {
    return { formError: errors };
  }

  return redirect("");
};

export default function Index() {
  const actionData = useActionData<ActionData | undefined>();

  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-bold">Admin: Add Review to Queue</h1>

      <Form method="post">
        <div>
          <label>
            <textarea
              defaultValue={actionData?.data}
              name="data"
              rows={20}
              cols={100}
              className="resize-y rounded-md border-2"
            />
          </label>
        </div>
        {actionData?.formError && (
          <div className="text-red-500">{actionData.formError}</div>
        )}
        <Button type="submit" className="mt-4">
          Add
        </Button>
      </Form>
    </div>
  );
}
