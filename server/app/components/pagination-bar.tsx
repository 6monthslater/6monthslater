import { Button } from "~/components/shadcn-ui-mod/button";
import type { Navigation } from "@remix-run/router";
import { useEffect, useState } from "react";
import { InlineLoadingSpinner } from "~/components/inline-loading-spinner";

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
  const [prevClicked, setPrevClicked] = useState(false);
  const [nextClicked, setNextClicked] = useState(false);

  useEffect(() => {
    if (navigation.state === "idle") {
      setPrevClicked(false);
      setNextClicked(false);
    }
  }, [navigation]);

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
        onClick={() => {
          setPrevClicked(true);
          handlePageChange(false);
        }}
        disabled={!canPrevPage || navigation.state === "loading"}
      >
        <InlineLoadingSpinner show={prevClicked} />
        {prevClicked ? "Loading..." : "Previous"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setNextClicked(true);
          handlePageChange(true);
        }}
        disabled={!canNextPage || navigation.state === "loading"}
      >
        <InlineLoadingSpinner show={nextClicked} />
        {nextClicked ? "Loading..." : "Next"}
      </Button>
    </div>
  );
}
