import type { LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { createServerClient, parse, serialize } from "@supabase/ssr";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const cookies = parse(request.headers.get("Cookie") ?? "");
  const headers = new Headers();

  if (code) {
    const supabase = createServerClient(
      process.env.SUPABASE_URL ?? "",
      process.env.SUPABASE_ANON_KEY ?? "",
      {
        cookies: {
          get(key) {
            return cookies[key];
          },
          set(key, value, options) {
            headers.append("Set-Cookie", serialize(key, value, options));
          },
          remove(key, options) {
            headers.append("Set-Cookie", serialize(key, "", options));
          },
        },
      }
    );
    await supabase.auth.exchangeCodeForSession(code);
  } else {
    console.log("AUTH: No code!");
  }
  return redirect("/", {
    headers,
  });
};
