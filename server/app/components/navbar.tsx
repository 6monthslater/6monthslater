import { Link, useLocation, NavLink as RemixNavLink } from "@remix-run/react";
import { NavLink } from "~/components/shadcn-ui-mod/navlink";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/shadcn-ui-mod/button";
import type { RemixNavLinkProps } from "@remix-run/react/dist/components";
import type { ReactNode } from "react";

interface NavbarProps {
  isLoggedIn: boolean;
  isAdmin: boolean;
}

interface DropdownNavLinkProps extends RemixNavLinkProps {
  children: ReactNode;
}

const DropdownNavLink = (props: DropdownNavLinkProps) => {
  return (
    <RemixNavLink {...props}>
      <DropdownMenuItem className="!cursor-pointer">
        {props.children}
      </DropdownMenuItem>
    </RemixNavLink>
  );
};

const Navbar = ({ isLoggedIn, isAdmin }: NavbarProps) => {
  const location = useLocation();
  const adminPath = new RegExp(/\/admin\/.*/);
  const isAdminPage = adminPath.test(location.pathname);

  return (
    <nav className="!mt-0 flex flex-wrap items-center justify-between bg-gradient-to-r from-cyan-700 to-cyan-500 to-90% p-4 text-slate-200">
      <div className="mr-6 flex flex-shrink-0 items-center">
        <span className="text-xl font-semibold tracking-tight">
          <Link to="/">6 Months Later</Link>
        </span>
      </div>
      <div className="block flex-grow lg:flex lg:w-auto lg:items-center">
        <div className="space-x-3 text-sm lg:flex-grow">
          <NavLink to="/" end>
            Home
          </NavLink>
          <span hidden={!isLoggedIn || !isAdmin}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="xs"
                  className={
                    isAdminPage ? "active bg-gray-50 bg-opacity-25" : ""
                  }
                >
                  Admin Utilities
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownNavLink to={"/admin/queue"}>
                  Add Product to Scraper Queue
                </DropdownNavLink>
                <DropdownNavLink to={"/admin/queue-status"}>
                  Queue Status
                </DropdownNavLink>
                <DropdownNavLink to={"/admin/crawler"}>
                  Manage Product Crawler
                </DropdownNavLink>
                <DropdownNavLink to={"/admin/products"}>
                  View Scraped Products
                </DropdownNavLink>
                <DropdownNavLink to={"/admin/reviews"}>
                  View Scraped Reviews
                </DropdownNavLink>
                <DropdownNavLink to={"/admin/users"}>
                  User Management
                </DropdownNavLink>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>

          {isLoggedIn ? (
            <NavLink className="float-right" to="/auth/logout">
              Log Out
            </NavLink>
          ) : (
            <NavLink className="float-right" to="/auth/login">
              Login
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
