import type { SerializeFrom, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Card, Title } from "@tremor/react";
import { db } from "~/utils/db.server";
import {
  isAdmin,
  createServerClient,
  FORBIDDEN_ROUTE,
} from "~/utils/supabase.server";
import { WEBSITE_TITLE } from "~/root";

const PAGE_TITLE = "View Scraped Product";

export const meta: MetaFunction = () => {
  return { title: `${PAGE_TITLE} - ${WEBSITE_TITLE}` };
};

export const loader = async ({
  request,
  params,
}: {
  request: Request;
  params: { productId: string };
}) => {
  const { supabase, headers } = createServerClient(request);
  if (!(await isAdmin(supabase))) {
    return redirect(FORBIDDEN_ROUTE, { headers });
  }

  const reviews = await db.review.findMany({
    where: {
      product_id: params.productId,
    },
    include: {
      reports: {
        include: {
          issues: {
            include: {
              images: true,
            },
          },
          reliability_keyframes: true,
        },
      },
      images: true,
    },
  });

  return json(reviews, { headers });
};

export default function Index() {
  const reviews = useLoaderData<typeof loader>();

  return (
    <div className="mx-4 h-full content-center items-center space-y-4 pt-4 text-center md:container md:mx-auto">
      <h1 className="text-2xl font-bold">Admin: {PAGE_TITLE}</h1>

      <div className="flex flex-row flex-wrap">
        {reviews && getReviewBoxes(reviews)}
      </div>
    </div>
  );
}

function getReviewBoxes(reviews: SerializeFrom<typeof loader>) {
  return reviews.map((review) => {
    return (
      <Card key={review.id} className="m-5 grow basis-1/3">
        <Title>{review.text}</Title>
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
            <b>Reviewed on</b>: {review.date}
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

          {review.reports?.length > 0 && (
            <div>
              <b>Reports</b>:{" "}
              {review.reports.map((report) => (
                <div key={report.id} className="border-4">
                  <div>
                    <b>ID</b>: {report.id}
                  </div>
                  <div>
                    <b>Weight</b>: {report.report_weight}
                  </div>

                  {report.issues?.length > 0 && (
                    <div>
                      <b>Issues</b>:{" "}
                      {report.issues.map((issue) => (
                        <div key={issue.id} className="border-4">
                          <div>
                            <b>ID</b>: {issue.id}
                          </div>
                          <div>
                            <b>Text</b>: {issue.text}
                          </div>
                          <div>
                            <b>Classification</b>: {issue.classification}
                          </div>
                          <div>
                            <b>Criticality</b>: {issue.criticality}
                          </div>
                          <div>
                            <b>Relative Timestamp</b>: {issue.rel_timestamp}
                          </div>
                          <div>
                            <b>Frequency</b>: {issue.frequency}
                          </div>
                          {issue.images?.length > 0 && (
                            <div>
                              <b>Images</b>:{" "}
                              {issue.images.map((image) => (
                                // eslint-disable-next-line jsx-a11y/img-redundant-alt
                                <img
                                  key={image.image_url}
                                  src={image.image_url}
                                  alt="Photo of product"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {report.reliability_keyframes?.length > 0 && (
                    <div>
                      <b>Reliability Keyframes</b>:{" "}
                      {report.reliability_keyframes.map(
                        (reliability_keyframe) => (
                          <div key={reliability_keyframe.id}>
                            <div>
                              <b>ID</b>: {reliability_keyframe.id}
                            </div>
                            <div>
                              <b>Relative Timestamp</b>:{" "}
                              {reliability_keyframe.rel_timestamp}
                            </div>
                            <div>
                              <b>Sentiment</b>: {reliability_keyframe.sentiment}
                            </div>
                            <div>
                              <b>Interp</b>: {reliability_keyframe.interp}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    );
  });
}
