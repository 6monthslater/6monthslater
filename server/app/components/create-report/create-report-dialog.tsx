import { useFetcher } from "@remix-run/react";
import { useState } from "react";
import { createId } from "@paralleldrive/cuid2";
import { TbPlus, TbMinus } from "react-icons/tb";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Separator } from "~/components/ui/separator";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/shadcn-ui-mod/button";
import { DatePickerControlled } from "~/components/shadcn-ui-mod/date-picker-controlled";
import { Label } from "~/components/ui/label";
import type { ReportFormRow } from "~/types/ReportFormRow";

interface CreateReportDialogProps {
  productName: string;
  productId: string;
}

export default function CreateReportDialog({
  productName,
  productId,
}: CreateReportDialogProps) {
  const [formRows, setFormRows] = useState<ReportFormRow[]>([
    { id: createId(), eventDesc: "", date: undefined },
  ]);
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const fetcher = useFetcher();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" onClick={() => setOpen(true)}>
          <TbPlus className="mr-2 h-4 w-4" />
          Create Report
        </Button>
      </DialogTrigger>
      <DialogContent className="md:max-w-[650px]">
        <fetcher.Form
          method="post"
          onSubmit={(event) => {
            event.preventDefault();
            const purchaseDateStr = purchaseDate?.toISOString();
            fetcher.submit(
              {
                productId,
                data: JSON.stringify(formRows),
                purchaseDate: purchaseDateStr ?? "",
              },
              { method: "post" }
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>Create Report</DialogTitle>
            <DialogDescription>
              Add any significant events you've experienced with your product,
              both good and bad. <br />
              Not sure exactly when something happened? That's ok! Just put in
              your best estimate.
            </DialogDescription>
          </DialogHeader>
          <p>You're adding a report for the following product:</p>
          <p className="text-xs text-neutral-500">{productName}</p>
          <Separator className="my-3" />
          <div className="space-y-3">
            <div className="flex flex-row items-center gap-4 px-2">
              <Label
                htmlFor="purchaseDate"
                className="grow basis-7/12 text-right"
              >
                Purchase Date
              </Label>
              <DatePickerControlled
                className="basis-5/12"
                date={purchaseDate}
                setDate={(newDate) => setPurchaseDate(newDate)}
              />
              <span className="invisible h-10 w-10 shrink-0">
                {/* Extremely lazy way of aligning the purchase date picker with the date pickers below*/}
              </span>
            </div>
            <p
              className={`text-center text-sm text-red-500`}
              hidden={!fetcher.data?.errors?.purchaseDate}
            >
              {fetcher.data?.errors?.purchaseDate}
            </p>
            <div className="max-h-[40vh] space-y-3 overflow-scroll p-2">
              {formRows.map((row) => (
                <div key={row.id} className="flex flex-row items-center gap-4">
                  <Input
                    placeholder="Event Description"
                    className={`grow basis-7/12 ${
                      fetcher?.data?.errors?.rows[row.id]?.eventDesc
                        ? "!ring-ring !ring-2 !ring-red-500"
                        : ""
                    }`}
                    name="eventDesc"
                    value={row.eventDesc}
                    onChange={(event) => {
                      const nextFormRows = formRows.map((someRow) =>
                        someRow.id === row.id
                          ? { ...someRow, eventDesc: event.target.value }
                          : someRow
                      );
                      setFormRows(nextFormRows);
                    }}
                  ></Input>
                  <DatePickerControlled
                    className={`basis-5/12 ${
                      fetcher?.data?.errors?.rows[row.id]?.date
                        ? "!ring-ring !ring-2 !ring-red-500"
                        : ""
                    }`}
                    date={row.date}
                    setDate={(newDate) => {
                      const nextFormRows = formRows.map((oldRow) =>
                        oldRow.id === row.id
                          ? { ...oldRow, date: newDate }
                          : oldRow
                      );
                      setFormRows(nextFormRows);
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="ml-auto shrink-0 grow-0"
                    type="button"
                    onClick={() => {
                      setFormRows(
                        formRows.filter((someRow) => someRow.id !== row.id)
                      );
                    }}
                  >
                    <TbMinus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div>
              <Button
                variant="outline"
                className="w-full"
                type="button"
                onClick={() =>
                  setFormRows([
                    ...formRows,
                    { id: createId(), eventDesc: "", date: undefined },
                  ])
                }
              >
                <TbPlus className="mr-2 h-4 w-4" />
                Add Event
              </Button>
            </div>
            <div>
              {fetcher.data?.errors?.main?.length > 0
                ? fetcher.data?.errors?.main?.map((errorText: string) => (
                    <p
                      key={createId()}
                      className="text-center text-sm text-red-500"
                    >
                      {errorText}
                    </p>
                  ))
                : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              className="mt-3"
              disabled={fetcher.state === "submitting"}
            >
              Submit Report
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
