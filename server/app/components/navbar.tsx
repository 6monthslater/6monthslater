import { Link } from "@remix-run/react";
import NavLink from "~/components/navlink";

const Navbar = () => {
  return (
    <nav className=" to-90% flex flex-wrap items-center justify-between bg-gradient-to-r from-cyan-700 to-cyan-500 p-4 text-slate-200">
      <div className="mr-6 flex flex-shrink-0 items-center">
        <span className="text-xl font-semibold tracking-tight">
          <Link to="/">6 Months Later</Link>
        </span>
      </div>
      <div className="block w-full flex-grow lg:flex lg:w-auto lg:items-center">
        <div className="text-sm lg:flex-grow">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/admin/queue">Add to Queue</NavLink>
          <NavLink to="/admin/queue-status">Queue Status</NavLink>
          <NavLink to="/admin/crawler">Product Crawler</NavLink>
          <NavLink to="/admin/reviews">View Reviews</NavLink>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
