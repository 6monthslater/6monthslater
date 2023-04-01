import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";

interface ProductData {
    id: string;
    name: string;
}

export const loader = async ({ params }: { params: { productId: string } }) => {
    return json<ProductData | null>(await db.product.findFirst({
        where: {
            id: params.productId
        },
        select: {
            id: true,
            name: true
        }
    }));
}

export default function Route() {
    const productData = useLoaderData<typeof loader>();

    return (
        <div>
            <h1>{productData?.name}</h1>
        </div>
    )
}