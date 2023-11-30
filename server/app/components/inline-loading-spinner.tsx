import type { LucideProps } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface InlineLoadingSpinnerProps extends LucideProps {
  show: boolean;
}

export function InlineLoadingSpinner({
  className,
  show,
  ...props
}: InlineLoadingSpinnerProps) {
  const [realShow, setRealShow] = useState(false);

  useEffect(() => {
    if (show) {
      // Timeout
      const timeout = setTimeout(() => setRealShow(true), 150);
      return () => clearTimeout(timeout);
    } else {
      setRealShow(false);
      return;
    }
  }, [show]);

  return realShow ? (
    <Loader2 {...props} className={`${className} mr-2 h-4 w-4 animate-spin`} />
  ) : null;
}
