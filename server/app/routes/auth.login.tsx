import type { ActionFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { createServerClient } from "~/utils/supabase.server";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { Input } from "~/components/shadcn-ui/input";
import Button from "~/components/tremor-ui/button";
import { Label } from "~/components/shadcn-ui/label";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const action = String(formData.get("_action"));
  const { supabase, headers } = createServerClient(request);

  const errors: {
    email?: string;
    password?: string;
  } = {};

  const emailRegex = new RegExp(
    /^[a-z0-9]+(?!.*(?:\+{2,}|-{2,}|\.{2,}))(?:[.+-]?[a-z0-9])*@[\w-]+\.+[\w-]{2,4}$/
  );

  if (action === "signUp") {
    return redirect("/auth/signup");
  }

  if (!emailRegex.test(email)) {
    errors.email = "Invalid email address";
  }

  if (password.length < 8) {
    errors.password = "Password must be at least 8 characters long";
  }

  // Reject for validation errors
  if (Object.keys(errors).length > 0) {
    return json({ errors });
  }

  const data = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (data.error) {
    errors.email = data.error.message;
    errors.password = "\u00A0";
  }

  // Reject for Supabase errors
  if (Object.keys(errors).length > 0) {
    return json({ errors });
  }

  return redirect("/", {
    headers,
  });
};

export const Login = () => {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === "submitting" || navigation.state === "loading";

  return (
    <div className="mx-4 h-full content-center items-center space-y-4 pt-[20vh] text-center md:container md:mx-auto">
      <h1 className="text-2xl font-bold">Login</h1>

      <div className="mx-auto content-center items-center space-x-3 md:flex md:w-1/3">
        <Form method="post" className="w-full space-y-3">
          <Label htmlFor="email">Email</Label>
          <Input
            type="email"
            placeholder="Email"
            name="email"
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
              variant="secondary"
            >
              Sign Up
            </Button>
            <Button
              type="submit"
              name="_action"
              value="login"
              variant="primary"
              disabled={isSubmitting}
            >
              Login
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default Login;
