import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import type { Product } from "~/queue-handling/review.server";
import {
  ReviewRegion,
  ReviewSource,
  sendProductToQueue,
} from "~/queue-handling/review.server";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/shadcn-ui-mod/button";
import {
  isAdmin,
  createServerClient,
  FORBIDDEN_ROUTE,
} from "~/utils/supabase.server";
import { WEBSITE_TITLE } from "~/root";
import { InlineLoadingSpinner } from "~/components/inline-loading-spinner";

const PAGE_TITLE = "Add Product to Scraper Queue";

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

  const { data } = Object.fromEntries(await request.formData());
  if (typeof data !== "string" || data.length === 0) {
    return json({ error: "Request cannot be empty" }, { status: 400, headers });
  }

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

      await sendProductToQueue(product);
    } else {
      return json(
        { error: `Invalid product ID: ${line}\n` },
        { status: 400, headers }
      );
    }
  }

  return json({ ok: true }, { headers });
};

export default function Index() {
  const actionData = useActionData<typeof action>();

  // Pending UI
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-bold">Admin: {PAGE_TITLE}</h1>

      <Form method="post">
        <div className="mx-auto px-6 md:w-3/4 lg:w-3/5">
          <label>
            <Textarea
              defaultValue={actionData?.data}
              name="data"
              rows={20}
              cols={100}
              className="resize-y border-2"
              disabled={isSubmitting}
            />
          </label>
        </div>
        {actionData?.formError && (
          <div className="text-red-500">{actionData.error}</div>
        )}
        <Button type="submit" className="mt-4" disabled={isSubmitting}>
          <InlineLoadingSpinner show={isSubmitting} />
          Add
        </Button>
      </Form>
    </div>
  );
}
