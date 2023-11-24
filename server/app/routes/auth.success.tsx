import type { ActionFunction, MetaFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { WEBSITE_TITLE } from "~/root";

const PAGE_TITLE = "Success! 🎉";

export const meta: MetaFunction = () => {
  return { title: `${PAGE_TITLE} - ${WEBSITE_TITLE}` };
};

export const action: ActionFunction = () => {
  return redirect("/login");
};

export const Success = () => {
  return (
    <div className="mx-4 h-full content-center items-center space-y-4 pt-[20vh] text-center md:container md:mx-auto">
      <h1 className="text-2xl font-bold">{PAGE_TITLE}</h1>
      <p>Please check your email for a confirmation link.</p>
    </div>
  );
};

export default Success;
