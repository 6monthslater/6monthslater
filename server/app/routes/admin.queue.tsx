import type { ActionFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import type { Product } from "../queue-handling/review";
import { ReviewRegion, ReviewSource, sendProductToQueue } from "../queue-handling/review";

interface ActionData {
  data?: string;
  formError?: string;
}

export const action: ActionFunction = async ({
  request,
}): Promise<Response | ActionData> => {

  const { data } = Object.fromEntries(await request.formData());
  if (typeof data !== "string" || data.length === 0) {
    return { formError: `Data missing` };
  }

  let errors = "";

  const lines = data.split("\n");
  for (const line of lines) {
    // get first group from regex
    const productIDRegex = /amazon\..+\/dp\/(.+?)\//;
    const match = line.match(productIDRegex);
    if (match && match.length > 1) {
      const product: Product = {
        id: match[1],
        region: ReviewRegion.CA,
        type: ReviewSource.AMAZON
      };

      sendProductToQueue(product);
    } else {
      errors += `Invalid product ID: ${line}\n`;
    }
  }

  if (errors.length > 0) {
    return { formError: errors };
  }

  return redirect("");
};

export default function Index() {
  const actionData = useActionData<ActionData | undefined>();

  return (
    <div style={{
      margin: "10px",
      textAlign: "center",
    }}>
      <h1 className="text-1xl font-bold">Add a review to queue to be scraped</h1>

      <Form method="post">
        <div>
          <label>
            <textarea 
              defaultValue={actionData?.data}
              name="data"
              rows={ 20 }
              cols={ 100 }
              style={{
                border: "1px solid #ccc",
              }}
            />
          </label>
        </div>
        {
          actionData?.formError && (
            <div className="text-red-500">
              {actionData.formError}
            </div>
          )
        }
        <button type="submit" className="button">
          Add
        </button>
      </Form>
    </div>
  );
}