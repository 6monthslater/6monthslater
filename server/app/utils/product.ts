import type { ProdPageIssue, ProdPageReport, TopIssue } from "~/types/product";

export function getTopIssues(reports: ProdPageReport[]): TopIssue[] {
  const issues: TopIssue[] = [];
  for (const report of reports) {
    for (const issue of report.issues) {
      if (issue.text && !issues.some((i) => i.text === issue.text)) {
        issues.push({
          text: issue.text,
          id: report.id,
        });
      }

      if (issues.length >= 5) {
        return issues;
      }
    }
  }

  return issues;
}

export function getRelativeTimestampDate(
  report: ProdPageReport,
  issue: ProdPageIssue
): Date {
  if (!report.purchaseDate && !report.review) {
    throw new Error(`No usable date in report ${report.id}`);
  }
  if (!report.review) {
    // Code should not be reached (all reports should have either a review or purchaseDate)
    throw new Error(`Illegal ${report.id}`);
  }
  if (!issue.rel_timestamp)
    return new Date(report.purchaseDate ?? report.review.date_text);

  if (issue.rel_timestamp > 1600000000) {
    // Treat as unix
    return new Date(issue.rel_timestamp * 1000);
  } else {
    // Treat as days since review was created
    const reviewDate = new Date(report.purchaseDate ?? report.review.date_text);
    reviewDate.setDate(reviewDate.getDate() + issue.rel_timestamp);

    return reviewDate;
  }
}
