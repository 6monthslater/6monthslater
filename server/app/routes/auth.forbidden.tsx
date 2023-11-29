/**
 * Splat route (404
 */
import { Link, useNavigation } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/node";
import { WEBSITE_TITLE } from "~/root";

const PAGE_TITLE = "403 Forbidden";

export const meta: MetaFunction = () => {
  return { title: `${PAGE_TITLE} - ${WEBSITE_TITLE}` };
};

const Forbidden = () => {
  // Pending UI
  const navigation = useNavigation();
  const isNavLoading = navigation.state === "loading";

  return (
    <div className="mx-4 h-full content-center items-center space-y-4 pt-[20vh] text-center md:container md:mx-auto">
      <div>
        <h1 className="w-full text-5xl font-bold">{PAGE_TITLE}</h1>
      </div>
      <div>
        <Link
          to="/"
          className={`w-full text-xl text-blue-500 underline ${
            isNavLoading ? "disabled pointer-events-none opacity-50" : ""
          }`}
        >
          Go back Home
        </Link>
      </div>
    </div>
  );
};

export default Forbidden;
