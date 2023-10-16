import type { Product } from "@prisma/client";
import type { ActionFunction, SerializeFrom } from "@remix-run/node";
import { json } from "@remix-run/node";
import type { SubmitFunction } from "@remix-run/react";
import { Link, useLoaderData, useSubmit } from "@remix-run/react";
import { Button, Card, Title } from "@tremor/react";
import { analyzeProduct } from "~/queue-handling/review.server";
import { db } from "~/utils/db.server";

interface ProductData extends Product {
  reportCount: number;
  reviewCount: number;
}

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

export const loader = async ({ params }: { params: { pageNum: string } }) => {
  const page = parseInt(params.pageNum, 10) || 1;
  const pageSize = 100;

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
  return json({
    products,
    numberOfProducts
  });
};

export default function Index() {
  const productData = useLoaderData<typeof loader>();
  const submit = useSubmit();

  return (
    <div className="mx-4 h-full content-center items-center space-y-4 pt-4 text-center md:container md:mx-auto">
      <h1 className="text-2xl font-bold">Admin: Analyze Products</h1>
      <h2 className="text-1xl">Total number of products: {productData.numberOfProducts}</h2>

      <div className="flex flex-row flex-wrap">
        {productData && getProductBoxes(productData.products, submit)}
      </div>
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
          <Button className="mt-4 block">View Product Information</Button>
        </Link>

        <Button
          type="submit"
          className="mt-4 block"
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
