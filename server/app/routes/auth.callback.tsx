import type { LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { createServerClient } from "~/utils/supabase.server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const loader: LoaderFunction = async ({ request, params }) => {
  const code = params.code;

  let headers: Headers = new Headers();
  let supabase: SupabaseClient | null = null;

  if (code) {
    ({ supabase, headers } = createServerClient(request));
    await supabase.auth.exchangeCodeForSession(code);
  } else {
    console.log("AUTH: No code!");
  }
  return redirect("/", {
    headers,
  });
};
