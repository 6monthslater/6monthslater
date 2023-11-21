import type { ActionFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export const action: ActionFunction = () => {
  return redirect("/login");
};

export const Success = () => {
  return (
    <div className="mx-4 h-full content-center items-center space-y-4 pt-[20vh] text-center md:container md:mx-auto">
      <h1 className="text-2xl font-bold">Success! 🎉</h1>
      <p>Please check your email for a confirmation link.</p>
    </div>
  );
};

export default Success;
