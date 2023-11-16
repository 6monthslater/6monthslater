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
} from "@remix-run/react";

import stylesheet from "~/tailwind.css";

import Navbar from "~/components/navbar";
import Footer from "~/components/footer";
import { json } from "@remix-run/node";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "6 Months Later",
  viewport: "width=device-width,initial-scale=1",
});

export const loader: LoaderFunction = () => {
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  };

  return json({ env });
};

export default function App() {
  const { env } = useLoaderData<typeof loader>();
  const [supabase] = useState(() =>
    createBrowserClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
  );

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body className="flex min-h-screen flex-col space-y-4">
        <Navbar />
        <Outlet context={{ supabase }} />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
        <Footer />
      </body>
    </html>
  );
}
