import { useEffect, useState } from "react";
import { TextInput } from "@tremor/react";
import { TbSearch } from "react-icons/tb";
import Button from "~/components/tremor-ui/button";
import type { ActionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form } from "@remix-run/react";
import { db } from "~/utils/db.server";

export async function action({ request }: ActionArgs) {
  const body = await request.formData();
  const productName = body.get("productName");
  if (!productName) {
    return json({ errors: ["No Product Name provided"] }, { status: 400 });
  }
  const data = await db.product.findFirst({
    where: {
      name: {
        contains: productName.toString(),
        mode: "insensitive",
      },
    },
    select: {
      id: true,
    },
  });
  if (!data) {
    return json({ errors: ["Product not found"] }, { status: 400 });
  }
  return redirect(`/product/${data.id}`);
}

export default function Index() {
  const [searchProdName, setSearchProdName] = useState("");

  useEffect(() => {
    setSearchProdName("");
  }, []);

  return (
    <div className="mx-4 h-full content-center items-center space-y-4 pt-[20vh] text-center md:container md:mx-auto">
      <h1 className="w-full text-5xl font-bold">Welcome to 6 Months Later!</h1>
      <p>Start by searching for a product:</p>
      <div className="mx-auto space-x-3 md:flex md:w-1/2">
        <Form method="post" className="w-full">
          <TextInput
            className="mb-3"
            placeholder="Search for a product..."
            value={searchProdName}
            onChange={(event) => setSearchProdName(event.target.value)}
            name="productName"
          />
          <Button className="mb-3" icon={TbSearch} type="submit">
            Search
          </Button>
        </Form>
      </div>
    </div>
  );
}
