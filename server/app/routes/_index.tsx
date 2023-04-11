import { TextInput } from "@tremor/react";
import { TbSearch } from "react-icons/tb";
import Button from "~/components/button";

export default function Index() {
  return (
    <div className="h-full content-center items-center space-y-4 pt-[20vh] text-center md:container md:mx-auto">
      <h1 className="w-full text-5xl font-bold">Welcome to 6 Months Later!</h1>
      <p>Start by searching for a product:</p>
      <div className="mx-auto flex space-x-3 md:w-1/2">
        <TextInput className="" placeholder="Search for a product..." />
        <Button icon={TbSearch}>Search</Button>
      </div>
    </div>
  );
}
