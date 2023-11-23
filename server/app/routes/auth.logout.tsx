import type { LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { createServerClient } from "~/utils/supabase.server";

export const loader: LoaderFunction = async ({ request }) => {
  const { supabase, headers } = createServerClient(request);
  await supabase.auth.signOut();

  return redirect("/", {
    headers,
  });
};
