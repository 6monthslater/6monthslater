import { Card } from "@tremor/react";

interface ProductHeaderProps {
  product: {
    image_url: string;
    name: string;
  };
}

const ProductHeader = ({ product }: ProductHeaderProps) => (
  <>
    {product?.image_url && (
      <Card className="mx-auto grid w-full grid-cols-1 gap-1 md:grid-cols-7 md:gap-6 lg:w-3/4">
        <span className="grid justify-center">
          <img
            className="my-auto"
            src={product.image_url.replace("US120", "US240")}
            alt="Product"
            width={120}
          />
        </span>

        <span className="grid justify-center md:col-span-6">
          <h1 className="my-auto text-center text-xl font-semibold md:text-left">
            {product?.name}
          </h1>
        </span>
      </Card>
    )}
  </>
);

export default ProductHeader;
