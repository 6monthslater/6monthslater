import { useFetcher } from "@remix-run/react";
import { TbPlus } from "react-icons/tb";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/shadcn-ui-mod/button";
import { Separator } from "~/components/ui/separator";

interface CreateReportDialogProps {
  productName: string;
}

export default function CreateReportDialog({
  productName,
}: CreateReportDialogProps) {
  const fetcher = useFetcher();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <TbPlus className="mr-2 h-4 w-4" />
          Create Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <fetcher.Form>
          <DialogHeader>
            <DialogTitle>Create Report</DialogTitle>
            <DialogDescription>
              <p>You're adding a report for the following product:</p>
              <p className="text-neutral-500">{productName}</p>
              <p>
                Add any significant events you've experienced with your product,
                both good and bad.
              </p>
              <p>
                Not sure exactly when something happened? That's ok! Just put in
                your best estimate.
              </p>
            </DialogDescription>
          </DialogHeader>
          <Separator />
          <div className="grid grid-cols-5 items-center gap-4"></div>
          <DialogFooter>
            <Button type="submit">Submit Report</Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
