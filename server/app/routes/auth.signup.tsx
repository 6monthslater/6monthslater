import type { ActionFunction, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { createServerClient } from "~/utils/supabase.server";
import {
  Form,
  useActionData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/shadcn-ui-mod/button";
import { Label } from "~/components/ui/label";
import { WEBSITE_TITLE } from "~/root";
import { InlineLoadingSpinner } from "~/components/inline-loading-spinner";

const PAGE_TITLE = "Sign Up";

export const meta: MetaFunction = () => {
  return { title: `${PAGE_TITLE} - ${WEBSITE_TITLE}` };
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const { supabase, headers } = createServerClient(request);

  const errors: {
    email?: string;
    password?: string;
  } = {};

  const emailRegex = new RegExp(
    /^[a-z0-9]+(?!.*(?:\+{2,}|-{2,}|\.{2,}))(?:[.+-]?[a-z0-9])*@[\w-]+\.+[\w-]{2,4}$/
  );

  if (!emailRegex.test(email)) {
    errors.email = "Invalid email address";
  }

  if (password.length < 8) {
    errors.password = "Password must be at least 8 characters long";
  }

  // Reject for validation errors
  if (Object.keys(errors).length > 0) {
    return json({ errors }, { status: 400, headers });
  }

  const data = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: formData.get("redirectUrl")?.toString() ?? "" },
  });

  if (data.error) {
    errors.email = data.error.message;
    errors.password = "\u00A0";
  }

  // Reject for Supabase errors
  if (Object.keys(errors).length > 0) {
    return json({ errors }, { status: 400, headers });
  }

  return redirect("/auth/success", {
    headers,
  });
};

export const Signup = () => {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  // Pending UI
  const isSubmitting =
    navigation.state === "submitting" || navigation.state === "loading";

  return (
    <div className="mx-4 h-full content-center items-center space-y-4 pt-[20vh] text-center md:container md:mx-auto">
      <h1 className="text-2xl font-bold">{PAGE_TITLE}</h1>

      <div className="mx-auto content-center items-center space-x-3 md:flex md:w-1/3">
        <Form
          className="w-full space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            formData.set(
              "redirectUrl",
              `${window.location.protocol}//${window.location.host}/`
            );

            submit(formData, {
              method: "post",
            });
          }}
        >
          <Label htmlFor="email">Email</Label>
          <Input
            type="email"
            placeholder="Email"
            name="email"
            disabled={isSubmitting}
            className={`${
              actionData?.errors?.email
                ? "!ring-ring !ring-2 !ring-red-500"
                : ""
            }`}
          ></Input>
          <p
            className={`text-sm text-red-500 ${
              !actionData?.errors?.email ? "invisible" : ""
            }`}
          >
            {actionData?.errors?.email}
            {"\u00A0"}
          </p>
          <Label htmlFor="email">Password</Label>
          <Input
            type="password"
            name="password"
            placeholder="Password"
            disabled={isSubmitting}
            className={`${
              actionData?.errors?.password
                ? "!ring-ring !ring-2 !ring-red-500"
                : ""
            }`}
          ></Input>
          <p
            className={`text-sm text-red-500 ${
              !actionData?.errors?.password ? "invisible" : ""
            }`}
          >
            {actionData?.errors?.password}
            {"\u00A0"}
          </p>
          <div className="space-x-3">
            <Button
              type="submit"
              name="_action"
              value="signUp"
              disabled={isSubmitting}
            >
              <InlineLoadingSpinner show={isSubmitting} /> Sign Up
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default Signup;
