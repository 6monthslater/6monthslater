import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { createServerClient } from "~/utils/supabase.server";
import { WEBSITE_TITLE } from "~/root";

const PAGE_TITLE = "Logging out...";

export const meta: MetaFunction = () => {
  return { title: `${PAGE_TITLE} - ${WEBSITE_TITLE}` };
};

export const loader: LoaderFunction = async ({ request }) => {
  const { supabase, headers } = createServerClient(request);
  await supabase.auth.signOut();

  return redirect("/", {
    headers,
  });
};
