// noinspection HtmlRequiredTitleElement

import type {
  LinksFunction,
  MetaFunction,
  LoaderFunction,
} from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useOutletContext,
  useRevalidator,
} from "@remix-run/react";

import stylesheet from "~/tailwind.css";

import Navbar from "~/components/navbar";
import Footer from "~/components/footer";
import { json } from "@remix-run/node";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient, isAdmin } from "~/utils/supabase.server";

export const WEBSITE_TITLE = "6 Months Later";

type ContextType = { supabase: SupabaseClient; isLoggedIn: boolean };

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: WEBSITE_TITLE,
  viewport: "width=device-width,initial-scale=1",
});

export const loader: LoaderFunction = async ({ request }) => {
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  };

  const { supabase, headers } = createServerClient(request);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const admin = await isAdmin(supabase);

  return json({ env, session, isAdmin: admin }, { headers });
};

export default function App() {
  const { env, session, isAdmin } = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();
  const [supabase] = useState(() =>
    createBrowserClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
  );
  const serverAccessToken = session?.access_token;
  const isLoggedIn = !!session;

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event !== "INITIAL_SESSION" &&
        session?.access_token !== serverAccessToken
      ) {
        // server and client are out of sync.
        revalidate();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [serverAccessToken, supabase, revalidate]);

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body className="flex min-h-screen flex-col space-y-4">
        <Navbar isLoggedIn={isLoggedIn} isAdmin={isAdmin} />
        <Outlet context={{ supabase, isLoggedIn } satisfies ContextType} />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
        <Footer />
      </body>
    </html>
  );
}

export function useRootContext() {
  return useOutletContext<ContextType>();
}
