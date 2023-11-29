import type { Prisma } from "@prisma/client";

export const ISSUE_INCLUDE = {
  images: true,
};

export const REPORT_INCLUDE = {
  review: true,
  issues: {
    include: ISSUE_INCLUDE,
  },
};

export const REVIEW_INCLUDE = {
  reports: {
    include: {
      review: true,
      issues: {
        include: ISSUE_INCLUDE,
      },
    },
  },
};

export const PRODUCT_INCLUDE = {
  manufacturer: true,
  reports: {
    include: REPORT_INCLUDE,
  },
  reviews: {
    include: REVIEW_INCLUDE,
  },
};

export type ProdPageReport = Prisma.ReportGetPayload<{
  include: typeof REPORT_INCLUDE;
}>;
export type ProdPageReview = Prisma.ReviewGetPayload<{
  include: typeof REVIEW_INCLUDE;
}>;
export type ProdPageProduct = Prisma.ProductGetPayload<{
  include: typeof PRODUCT_INCLUDE;
}>;
export type ProdPageIssue = Prisma.IssueGetPayload<{
  include: typeof ISSUE_INCLUDE;
}>;
