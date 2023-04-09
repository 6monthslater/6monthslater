import { NavLink as RemixNavLink } from "@remix-run/react";
import type { RemixNavLinkProps } from "@remix-run/react/dist/components";

const NavLink = (props: RemixNavLinkProps) => {
  return (
    <RemixNavLink
      {...props}
      className={({ isActive, isPending }) =>
        `${props.className} px-2 ${isPending ? "pending" : ""} ${
          isActive ? "active font-bold" : ""
        }`
      }
    >
      {props.children}
    </RemixNavLink>
  );
};

export default NavLink;
