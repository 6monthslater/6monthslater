import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";

export const loader = async ({ params }: { params: { productId: string } }) => {
  const product = await db.product.findFirst({
    where: {
      id: params.productId,
    },
    include: {
      manufacturer: true,
    },
  });
  const reports = await db.report.findMany({
    where: {},
    include: {
      review: true,
    },
  });
  return json({ product, reports });
};

export default function Route() {
  const { product, reports } = useLoaderData<typeof loader>();

  return (
    <div className="mx-4 h-full content-center items-center space-y-4 pt-4 text-center md:container md:mx-auto">
      <h1 className="text-xl font-semibold">{product?.manufacturer.name}</h1>
    </div>
  );
}
