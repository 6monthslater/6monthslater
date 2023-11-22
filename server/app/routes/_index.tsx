import { useEffect, useRef, useState } from "react";
import { TbSearch } from "react-icons/tb";
import Button from "~/components/button";
import type { ActionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useFetcher, useNavigate, useSubmit } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { getProductImageUrl } from "~/utils/amazon";
import { Combobox, Transition } from "@headlessui/react";

interface Suggestion {
  name: string;
  imageUrl: string;
  id: string;
}

const suggestionNumber = 3;

export async function action({ request }: ActionArgs) {
  const body = await request.formData();
  const productName = body.get("productName");
  if (!productName) {
    return json({ errors: ["No Product Name provided"] }, { status: 400 });
  }

  const searchTerm = createSearchTerm(productName.toString());

  const data = await db.product.findFirst({
    where: {
      name: {
        search: searchTerm,
        mode: "insensitive",
      },
    },
    orderBy: {
      _relevance: {
        fields: ["name"],
        search: searchTerm,
        sort: "desc",
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

/**
 * Search suggestions
 */
export const loader = async ({ request }): Promise<Suggestion[]> => {
  const { searchParams } = new URL(request.url);
  const productName = searchParams.get("productName");
  if (!productName) return [];

  const searchTerm = createSearchTerm(productName);

  const data = await db.product.findMany({
    select: {
      name: true,
      id: true,
    },
    where: {
      name: {
        search: searchTerm,
        mode: "insensitive",
      },
    },
    orderBy: {
      _relevance: {
        fields: ["name"],
        search: searchTerm,
        sort: "desc",
      },
    },
    take: suggestionNumber,
  });

  return data.map((product) => ({
    name: product.name,
    imageUrl: getProductImageUrl(product.id),
    id: product.id,
  }));
};

function createSearchTerm(productName: string) {
  return (
    productName
      .toLowerCase()
      .trim()
      .split(" ")
      // :* used to search prefixes
      .map((s) => `${s}:*`)
      .join(" & ")
  );
}

export default function Index() {
  const [searchProdName, setSearchProdName] = useState("");
  const searchSuggestionFetcher = useFetcher<typeof loader>();
  const [currentSuggestions, setCurrentSuggestions] = useState<Suggestion[]>(
    []
  );
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const submit = useSubmit();

  useEffect(() => {
    if (
      searchSuggestionFetcher.type === "done" &&
      searchSuggestionFetcher.data
    ) {
      setCurrentSuggestions(searchSuggestionFetcher.data);
    }
  }, [searchSuggestionFetcher]);

  return (
    <div className="mx-4 h-full content-center items-center space-y-4 pt-[20vh] text-center md:container md:mx-auto">
      <h1 className="w-full text-5xl font-bold">Welcome to 6 Months Later!</h1>
      <p>Start by searching for a product:</p>
      <div className="mx-auto space-x-3 md:flex md:w-1/2">
        <Form method="post" className="w-full" ref={formRef}>
          <Combobox
            as="div"
            className="text-tremor-default relative w-full min-w-[10rem]"
            value={searchProdName}
          >
            <Combobox.Button className="tremor-TextInput-root relative mb-3 flex w-full w-full min-w-[10rem] items-center rounded-md border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
              <Combobox.Input
                className="tremor-TextInput-input w-full border-0 bg-transparent py-2 pl-4 pr-4 text-sm font-medium placeholder:text-gray-500 focus:outline-none focus:ring-0"
                placeholder="Search for a product..."
                name="productName"
                value={searchProdName}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.stopPropagation();

                    submit(formRef.current);
                  }
                }}
                onChange={(event) => {
                  const value = event.target.value;

                  searchSuggestionFetcher.submit(
                    {
                      productName: value,
                    },
                    {
                      preventScrollReset: true,
                      method: "get",
                    }
                  );

                  setSearchProdName(value);
                }}
              />
            </Combobox.Button>
            {currentSuggestions.length > 0 && (
              <Transition
                className="absolute z-10 w-full"
                enter="transition ease duration-100 transform"
                enterFrom="opacity-0 -translate-y-4"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease duration-100 transform"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 -translate-y-4"
              >
                <Combobox.Options className="rounded-tremor-default text-tremor-default bg-tremor-background divide-tremor-border shadow-tremor-dropdown left-0 max-h-[228px] divide-y overflow-y-auto rounded-t-md border outline-none">
                  {currentSuggestions.map((suggestion) => (
                    <Combobox.Option
                      key={suggestion.id}
                      className="tremor-TextInput-root border-b-1 relative flex w-full min-w-[10rem] cursor-pointer items-center border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        navigate(`/product/${suggestion.id}`);
                        setSearchProdName(suggestion.name);
                      }}
                      value={suggestion.name}
                    >
                      {suggestion.name}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              </Transition>
            )}
          </Combobox>

          <Button className="mb-3" icon={TbSearch} type="submit">
            Search
          </Button>
        </Form>
      </div>
    </div>
  );
}
