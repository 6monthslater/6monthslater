import type { Product } from "@prisma/client";
import type {
  ActionFunction,
  SerializeFrom,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import type { SubmitFunction } from "@remix-run/react";
import {
  Link,
  useLoaderData,
  useNavigation,
  useSearchParams,
  useSubmit,
} from "@remix-run/react";
import { Card, Title } from "@tremor/react";
import { Button } from "~/components/shadcn-ui-mod/button";
import { analyzeProduct } from "~/queue-handling/review.server";
import { db } from "~/utils/db.server";
import {
  isAdmin,
  createServerClient,
  FORBIDDEN_ROUTE,
} from "~/utils/supabase.server";
import { WEBSITE_TITLE } from "~/root";
import PaginationBar from "~/components/pagination-bar";
import { parsePagination } from "~/utils/pagination.server";

const PAGE_TITLE = "Manage Scraped Products";

interface ProductData extends Product {
  reportCount: number;
  reviewCount: number;
}

export const meta: MetaFunction = () => {
  return { title: `${PAGE_TITLE} - ${WEBSITE_TITLE}` };
};

export const action: ActionFunction = async ({ request }) => {
  const { type, productId } = Object.fromEntries(await request.formData());
  if (
    typeof type !== "string" ||
    type.length === 0 ||
    typeof productId !== "string" ||
    productId.length === 0
  ) {
    return null;
  }

  switch (type) {
    case "clearReport": {
      await db.$transaction([
        db.issue.deleteMany({
          where: {
            report: {
              review: {
                product_id: productId,
              },
            },
          },
        }),
        db.reliabilityKeyframe.deleteMany({
          where: {
            report: {
              review: {
                product_id: productId,
              },
            },
          },
        }),
        db.report.deleteMany({
          where: {
            review: {
              product_id: productId,
            },
          },
        }),
      ]);
      break;
    }
    case "analyzeReviews": {
      await analyzeProduct(productId);
      break;
    }
  }

  return null;
};

export const loader: LoaderFunction = async ({ request }) => {
  const { supabase, headers } = createServerClient(request);
  if (!(await isAdmin(supabase))) {
    return redirect(FORBIDDEN_ROUTE, { headers });
  }

  const { page, pageSize } = parsePagination(request);

  const products = await Promise.all(
    (
      await db.product.findMany({
        where: {},
        orderBy: {
          createdAt: "desc",
        },
        take: pageSize,
        skip: pageSize * (page - 1),
      })
    ).map(async (product) => ({
      ...product,
      reportCount: await db.report.count({
        where: {
          review: {
            product_id: product.id,
          },
        },
      }),
      reviewCount: await db.review.count({
        where: {
          product_id: product.id,
        },
      }),
    }))
  );

  const numberOfProducts = await db.product.count();
  const pageCount = Math.ceil(numberOfProducts / pageSize);
  return json(
    {
      products,
      numberOfProducts,
      pageCount,
    },
    { headers }
  );
};

export default function Index() {
  const productData = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const pageCount = productData.pageCount;

  // Pagination
  const [searchParams, setSearchParams] = useSearchParams();
  const pageStr = searchParams.get("page") ?? "1";
  const pageSizeStr = searchParams.get("pageSize") ?? "10";
  const page = parseInt(pageStr, 10);
  const pageSize = parseInt(pageSizeStr, 10);
  const navigation = useNavigation();

  const canNextPage = pageCount - page > 0;
  const canPrevPage = pageCount - page < pageCount - 1;

  const handlePageChange = (next: boolean) => {
    let newPage: number;
    if (next) {
      if (!canNextPage) {
        return;
      }
      newPage = page + 1;
    } else {
      if (!canPrevPage) {
        return;
      }
      newPage = page - 1;
    }
    const newParams = new URLSearchParams();
    newParams.set("page", newPage.toString());
    newParams.set("pageSize", pageSize.toString());
    setSearchParams(newParams);
  };

  return (
    <div className="mx-4 h-full content-center items-center space-y-4 pt-4 text-center md:container md:mx-auto">
      <h1 className="text-2xl font-bold">Admin: {PAGE_TITLE}</h1>
      <h2 className="text-1xl">
        Total number of products: {productData.numberOfProducts}
      </h2>

      <div className="flex flex-row flex-wrap">
        {productData && getProductBoxes(productData.products, submit)}
      </div>
      <PaginationBar
        pageStr={pageStr}
        pageCount={pageCount}
        handlePageChange={handlePageChange}
        canPrevPage={canPrevPage}
        canNextPage={canNextPage}
        navigation={navigation}
      />
    </div>
  );
}

function getProductBoxes(
  products: SerializeFrom<ProductData>[],
  submit: SubmitFunction
) {
  return products.map((product) => {
    return (
      <Card key={product.id} className="m-5 grow basis-72">
        <Title>{product.name}</Title>
        <div className="my-3">
          <div>
            <b>ID</b>: {product.id}
          </div>
          <div>
            <b>Name</b>: {product.name}
          </div>
          <div>
            <b>Reviews</b>: {product.reviewCount}
          </div>
          <div>
            <b>Reports</b>: {product.reportCount}
          </div>
          <div>
            <b>Created on</b>: {product.createdAt}
          </div>
          <div>
            <b>Updated on</b>: {product.updatedAt}
          </div>
        </div>

        <Link to={`/admin/product/${product.id}`}>
          <Button className="mt-4 block" size="sm">
            View Product Information
          </Button>
        </Link>

        <Button
          type="submit"
          className="mt-4 block"
          size="sm"
          onClick={() => {
            if (confirm("Are you sure you would like to clear all reports?")) {
              submit(
                { type: "clearReport", productId: product.id },
                {
                  preventScrollReset: true,
                  method: "post",
                }
              );
            }
          }}
        >
          Clear Reports
        </Button>

        <Button
          type="submit"
          className="mt-4 block"
          size="sm"
          onClick={() => {
            submit(
              { type: "analyzeReviews", productId: product.id },
              {
                preventScrollReset: true,
                method: "post",
              }
            );
          }}
        >
          Analyze Reviews
        </Button>
      </Card>
    );
  });
}
