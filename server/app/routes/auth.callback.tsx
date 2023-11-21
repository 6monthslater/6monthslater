import type { LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { createServerClient } from "~/utils/supabase.server";
import type { SupabaseClient } from "@supabase/supabase-js";

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
