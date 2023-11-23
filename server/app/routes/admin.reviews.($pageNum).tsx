import type { SerializeFrom } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import type { Prisma } from "@prisma/client";
import { Card, Title, Text } from "@tremor/react";
import {
  createServerClient,
  FORBIDDEN_ROUTE,
  isAdmin,
} from "~/utils/supabase.server";

interface ReviewData {
  id: string;
  author_name: string;
  author_image_url: string | null;
  title: string;
  text: string;
  date: Date;
  attributes: Prisma.JsonValue;
  verified_purchase: boolean;
  found_helpful_count: number;
  is_top_positive_review: boolean;
  is_top_critical_review: boolean;
  images: Array<{ image_url: string }>;
  country_reviewed_in: string;
  region: string;
  createdAt: Date;
}

export const loader = async ({
  request,
  params,
}: {
  request: Request;
  params: { pageNum: string };
}) => {
  const { supabase, headers } = createServerClient(request);
  if (!(await isAdmin(supabase))) {
    return redirect(FORBIDDEN_ROUTE, { headers });
  }

  const page = parseInt(params.pageNum, 10) || 1;
  const pageSize = 10;

  return json<ReviewData[] | null>(
    await db.review.findMany({
      select: {
        id: true,
        author_name: true,
        author_image_url: true,
        title: true,
        text: true,
        date: true,
        attributes: true,
        verified_purchase: true,
        found_helpful_count: true,
        is_top_positive_review: true,
        is_top_critical_review: true,
        images: {
          select: {
            image_url: true,
          },
        },
        country_reviewed_in: true,
        region: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    { headers }
  );
};

export default function Route() {
  const reviews = useLoaderData<typeof loader>();

  return (
    <div className="mx-4 h-full content-center items-center space-y-4 pt-4 text-center md:container md:mx-auto">
      <h1 className="text-center text-2xl font-bold">
        Admin: View Recently Scraped Reviews
      </h1>
      <div className="flex flex-row flex-wrap">
        {reviews && getReviewBoxes(reviews)}
      </div>
    </div>
  );
}

function getReviewBoxes(reviews: SerializeFrom<ReviewData>[]) {
  return reviews.map((review) => {
    return (
      <Card key={review.id} className="m-5 grow basis-72">
        <Title>{review.title}</Title>
        <div className="my-3">
          <div>
            <b>By</b>: {review.author_name}
            {review.author_image_url && (
              <img
                src={review.author_image_url}
                alt={`Avatar for ${review.author_name}`}
              />
            )}
          </div>
          <div>
            <b>Scraped on</b>: {review.createdAt}
          </div>
          <div>
            <b>Rewiewed on</b>: {review.date}
          </div>
          <div>
            <b>Country</b>: {review.country_reviewed_in}
          </div>
          <div>
            <b>Region</b>: {review.region}
          </div>
          <div>
            <b>Verified Purchase</b>: {review.verified_purchase ? "Yes" : "No"}
          </div>
          <div>
            <b>Found Helpful</b>: {review.found_helpful_count}
          </div>
          <div>
            <b>Top Positive</b>: {review.is_top_positive_review ? "Yes" : "No"}
          </div>
          <div>
            <b>Top Critical</b>: {review.is_top_critical_review ? "Yes" : "No"}
          </div>
          {!!review.attributes && (
            <div>
              <b>Attributes</b>:{" "}
              {Object.entries(review.attributes as Record<string, string>)
                ?.map((a) => `${a[0]}: ${a[1]}`)
                ?.join(", ")}
            </div>
          )}
          {review.images?.length > 0 && (
            <div>
              <b>Images</b>:{" "}
              {review.images.map((image) => (
                // eslint-disable-next-line jsx-a11y/img-redundant-alt
                <img
                  key={image.image_url}
                  src={image.image_url}
                  alt="Photo Submitted By Author"
                />
              ))}
            </div>
          )}
        </div>

        <Text>{review.text}</Text>
      </Card>
    );
  });
}
