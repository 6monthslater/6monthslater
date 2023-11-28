import { useEffect, useRef, useState } from "react";
import { TbSearch } from "react-icons/tb";
import { Button } from "~/components/shadcn-ui-mod/button";
import type { ActionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  useActionData,
  useFetcher,
  useNavigate,
  useSearchParams,
  useSubmit,
} from "@remix-run/react";
import { db } from "~/utils/db.server";
import { getProductImageUrl } from "~/utils/amazon";
import { Combobox, Transition } from "@headlessui/react";
import { Separator } from "~/components/ui/separator";
import { WEBSITE_TITLE } from "~/root";
import { useToast } from "~/components/ui/use-toast";
import type { PrismaClientError } from "~/types/PrismaClientError";
import { PRISMA_ERROR_MSG } from "~/types/PrismaClientError";

interface Suggestion {
  name: string;
  imageUrl: string;
  id: string;
}

const suggestionNumber = 3;

export const meta: MetaFunction = () => {
  return { title: WEBSITE_TITLE };
};

export async function action({ request }: ActionArgs) {
  const body = await request.formData();
  const productName = body.get("productName");
  if (!productName) {
    return json({ error: "No Product Name provided" }, { status: 400 });
  }

  const searchTerm = createSearchTerm(productName.toString());

  let data;

  try {
    data = await db.product.findFirst({
      where: {
        name: {
          search: searchTerm,
          mode: "insensitive",
        },
        reviews: {
          some: {
            reports: {
              some: {
                issues: {
                  some: {
                    text: {
                      not: "",
                    },
                  },
                },
              },
            },
          },
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
  } catch (e) {
    const prismaError = e as PrismaClientError;
    if (prismaError) {
      console.error(prismaError.message);
      return json({ error: PRISMA_ERROR_MSG }, { status: 500 });
    } else {
      console.error(e);
      throw e;
    }
  }
  if (!data) {
    return json({ error: "Product not found" }, { status: 400 });
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
      reviews: {
        some: {
          reports: {
            some: {
              issues: {
                some: {
                  text: {
                    not: "",
                  },
                },
              },
            },
          },
        },
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
  const actionData = useActionData<typeof action>();
  const [currentSuggestions, setCurrentSuggestions] = useState<Suggestion[]>(
    []
  );
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const submit = useSubmit();

  // Email Verification confirmation
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [toastDisplayed, setToastDisplayed] = useState(false);

  useEffect(() => {
    if (searchParams.get("code") && !toastDisplayed) {
      setToastDisplayed(true);
      // Without the timeout, it appears the toast attempts to render too early and doesn't show up
      setTimeout(
        () =>
          toast({
            title: "Success!",
            description: "Your email has been verified.",
          }),
        100
      );
    }
  }, [searchParams, toast, toastDisplayed]);

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
      <p className="text-neutral-500 opacity-90">
        A long term reliability assessment assistant.
      </p>
      <Separator className="mx-auto md:w-1/2" />
      <p>Start by searching for a product:</p>
      <div className="mx-auto space-x-3 md:flex md:w-1/2">
        <Form method="post" className="w-full" ref={formRef}>
          <Combobox
            as="div"
            className="text-tremor-default relative w-full min-w-[10rem]"
            value={searchProdName}
          >
            <Combobox.Button className="tremor-TextInput-root relative mb-3 flex w-full min-w-[10rem] items-center rounded-md border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
              <Combobox.Input
                className="tremor-TextInput-input w-full border-0 bg-transparent py-2 pl-4 pr-4 text-sm font-medium placeholder:text-gray-500 focus:outline-none focus:ring-0"
                placeholder="Search for a product..."
                name="productName"
                autoComplete="off"
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
                      className="tremor-TextInput-root border-b-1 relative flex w-full min-w-[10rem] cursor-pointer items-center border-gray-300 bg-white p-2 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
          <p
            className={`text-center text-sm text-red-500`}
            hidden={!actionData?.error}
          >
            {actionData?.error}
          </p>

          <Button className="my-3" type="submit">
            <TbSearch className="mr-2 h-4 w-4" /> Search
          </Button>
        </Form>
      </div>
    </div>
  );
}
