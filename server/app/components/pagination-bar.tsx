import { Button } from "~/components/shadcn-ui-mod/button";
import type { Navigation } from "@remix-run/router";

interface PaginationBarProps {
  pageStr: string;
  pageCount: number;
  handlePageChange: (next: boolean) => void;
  canPrevPage: boolean;
  canNextPage: boolean;
  navigation: Navigation;
  className?: string;
}

export default function PaginationBar({
  pageStr,
  pageCount,
  handlePageChange,
  canPrevPage,
  canNextPage,
  navigation,
  className,
}: PaginationBarProps) {
  return (
    <div
      className={`${className} flex items-center justify-end space-x-2 py-4`}
    >
      <span>
        Page {pageStr} of {pageCount}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(false)}
        disabled={!canPrevPage || navigation.state === "loading"}
      >
        {navigation.state === "loading" ? "Loading..." : "Previous"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(true)}
        disabled={!canNextPage || navigation.state === "loading"}
      >
        {navigation.state === "loading" ? "Loading..." : "Next"}
      </Button>
    </div>
  );
}
