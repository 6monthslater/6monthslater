import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { createServerClient } from "~/utils/supabase.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { WEBSITE_TITLE } from "~/root";

const PAGE_TITLE = "Verifying email...";

export const meta: MetaFunction = () => {
  return { title: `${PAGE_TITLE} - ${WEBSITE_TITLE}` };
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const search = new URLSearchParams(url.search);
  const code = search.get("code");
  let headers: Headers = new Headers();
  let supabase: SupabaseClient | null = null;

  if (code) {
    ({ supabase, headers } = createServerClient(request));
    await supabase.auth.exchangeCodeForSession(code);
  } else {
    console.log("AUTH: No code!");
    return redirect("/auth/forbidden", {
      headers,
    });
  }
  return redirect("/", {
    headers,
  });
};
