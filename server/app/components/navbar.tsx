import {
  Link,
  useLocation,
  NavLink as RemixNavLink,
  useNavigation,
} from "@remix-run/react";
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
import { InlineLoadingSpinner } from "~/components/inline-loading-spinner";

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

  // Pending UI
  const navigation = useNavigation();

  const isLoggingOut =
    navigation.state === "loading" &&
    navigation.location.pathname === "/auth/logout";

  const isNavLoggingIn =
    navigation.state === "loading" &&
    navigation.location.pathname === "/auth/login";

  const isNavHome =
    navigation.state === "loading" && navigation.location.pathname === "/";

  const isNavAdmin =
    navigation.state === "loading" &&
    navigation.location.pathname.includes("admin");

  return (
    <nav className="!mt-0 flex flex-wrap items-center justify-between bg-gradient-to-r from-cyan-700 to-cyan-500 to-90% p-4 text-slate-200">
      <div className="mr-6 flex flex-shrink-0 items-center">
        <span className="text-xl font-semibold tracking-tight">
          <Link to="/">6 Months Later</Link>
        </span>
      </div>
      <div className="block flex-grow lg:flex lg:w-auto lg:items-center">
        <div className="space-x-3 text-sm lg:flex-grow">
          <NavLink
            to="/"
            end
            className={
              isNavHome ? "disabled pointer-events-none opacity-50" : ""
            }
          >
            <InlineLoadingSpinner show={isNavHome} />
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
                  disabled={isNavAdmin}
                >
                  <InlineLoadingSpinner show={isNavAdmin} />
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
            <NavLink
              className={`float-right ${
                isLoggingOut ? "disabled pointer-events-none opacity-50" : ""
              }`}
              to="/auth/logout"
            >
              <InlineLoadingSpinner show={isLoggingOut} />
              Log Out
            </NavLink>
          ) : (
            <NavLink
              className={`float-right ${
                isNavLoggingIn ? "disabled pointer-events-none opacity-50" : ""
              }`}
              to="/auth/login"
            >
              Login
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
