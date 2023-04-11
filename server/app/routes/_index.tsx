import { TextInput } from "@tremor/react";
import { TbSearch } from "react-icons/tb";
import Button from "~/components/button";

export default function Index() {
  return (
    <div className="mx-4 h-full content-center items-center space-y-4 pt-[20vh] text-center md:container md:mx-auto">
      <h1 className="w-full text-5xl font-bold">Welcome to 6 Months Later!</h1>
      <p>Start by searching for a product:</p>
      <div className="mx-auto space-x-3 md:flex md:w-1/2">
        <TextInput className="mb-3" placeholder="Search for a product..." />
        <Button className="mb-3" icon={TbSearch}>
          Search
        </Button>
      </div>
    </div>
  );
}
