import type { LucideProps } from "lucide-react";
import { Loader2 } from "lucide-react";

interface InlineLoadingSpinnerProps extends LucideProps {
  show: boolean;
}

export function InlineLoadingSpinner({
  className,
  show,
  ...props
}: InlineLoadingSpinnerProps) {
  return show ? (
    <Loader2 {...props} className={`${className} mr-2 h-4 w-4`} />
  ) : null;
}
