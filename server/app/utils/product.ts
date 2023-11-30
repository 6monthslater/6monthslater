import type { ProdPageIssue, ProdPageReport, TopIssue } from "~/types/product";

export function getTopIssues(
  reports: Array<{
    issues: Array<{
      text: string;
      classification: string;
    }>;
    id: string;
  }>
): TopIssue[] {
  const issues: TopIssue[] = [];

  const addIssues = (
    classificationCriteria: (classification: string) => boolean
  ) => {
    for (const report of reports) {
      for (const issue of report.issues) {
        if (
          issue.text &&
          !issues.some((i) => i.text === issue.text) &&
          classificationCriteria(issue.classification)
        ) {
          issues.push({
            text: issue.text,
            classification: issue.classification,
            id: report.id,
          });
        }

        if (issues.length >= 5) {
          return;
        }
      }
    }
  };

  // Adds classified issues with priority
  addIssues((classification) => classification !== "UNKNOWN_ISSUE");

  // Adds unclassified issues if needed
  if (issues.length < 5) {
    addIssues((classification) => classification === "UNKNOWN_ISSUE");
  }

  return issues;
}

export function getRelativeTimestampDate(
  report: ProdPageReport,
  issue: ProdPageIssue
): Date {
  let baseDate: Date;

  if (report.purchaseDate) {
    baseDate = report.purchaseDate;
  } else if (report.review) {
    baseDate = report.review.date;
  } else {
    // Code should not be reached (all reports should have either a review or purchaseDate)
    throw new Error(`No usable date in report ${report.id}`);
  }

  if (!issue.rel_timestamp) return new Date(baseDate);

  if (issue.rel_timestamp > 1600000000) {
    // Treat as unix
    return new Date(issue.rel_timestamp * 1000);
  } else {
    // Treat as days since review was created
    const reviewDate = new Date(baseDate);
    reviewDate.setDate(reviewDate.getDate() + issue.rel_timestamp);

    return reviewDate;
  }
}
