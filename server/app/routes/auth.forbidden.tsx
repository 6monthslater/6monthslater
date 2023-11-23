/**
 * Splat route (404
 */
import { Link } from "@remix-run/react";

const Forbidden = () => {
  return (
    <div className="mx-4 h-full content-center items-center space-y-4 pt-[20vh] text-center md:container md:mx-auto">
      <div>
        <h1 className="w-full text-5xl font-bold">403 Forbidden</h1>
      </div>
      <div>
        <Link to="/" className="w-full text-xl text-blue-500 underline">
          Go back Home
        </Link>
      </div>
    </div>
  );
};

export default Forbidden;
