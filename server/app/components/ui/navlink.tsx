import { NavLink as RemixNavLink } from "@remix-run/react";
import type { RemixNavLinkProps } from "@remix-run/react/dist/components";
import { buttonVariants } from "~/components/ui/button";

export const NavLink = (props: RemixNavLinkProps) => {
  return (
    <RemixNavLink
      {...props}
      className={({ isActive }) =>
        `${props.className} ${buttonVariants({
          variant: "ghost",
          size: "xs",
        })} ${isActive ? "active bg-gray-50 bg-opacity-25" : ""}`
      }
    >
      {props.children}
    </RemixNavLink>
  );
};
