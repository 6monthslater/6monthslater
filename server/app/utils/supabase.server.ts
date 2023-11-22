import {
  createServerClient as createSupabaseServerClient,
  parse,
  serialize,
} from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { db } from "~/utils/db.server";

export const ADMIN_ROLE_NAME = "Admin";
export const FORBIDDEN_ROUTE = "/auth/forbidden";

export const createServerClient = (request: Request) => {
  const cookies = parse(request.headers.get("Cookie") ?? "");
  const headers = new Headers();

  if (!process.env.SUPABASE_URL) {
    throw new Error("SUPABASE_URL is not defined in the .env file!");
  }

  if (!process.env.SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_ANON_KEY is not defined in the .env file!");
  }

  const supabase = createSupabaseServerClient(
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

  return { supabase, headers };
};

export const isAdmin = async (supabase: SupabaseClient) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // Unauthenticated
    return false;
  }

  const sbUser = session.user;

  const userProfile = await db.user.findFirst({
    where: {
      id: sbUser.id,
    },
    select: {
      id: true,
      roles: true,
    },
  });

  return userProfile && userProfile.roles.includes(ADMIN_ROLE_NAME);
};
