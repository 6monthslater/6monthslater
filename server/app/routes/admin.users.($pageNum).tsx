import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  useFetcher,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "@remix-run/react";
import { db } from "~/utils/db.server";
import type { User } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "~/components/shadcn-ui/data-table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/shadcn-ui/dropdown-menu";
import { Button } from "~/components/shadcn-ui/button";
import { TbDots, TbPlus } from "react-icons/tb";
import { getCoreRowModel } from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Label } from "~/components/shadcn-ui/label";
import { Input } from "~/components/shadcn-ui/input";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const search = new URLSearchParams(url.search);

  const pageStr = search.get("page") ?? "1";
  const pageSizeStr = search.get("pageSize") ?? "10";

  const page = parseInt(pageStr, 10);
  const pageSize = parseInt(pageSizeStr, 10);

  const users = await db.user.findMany({
    select: {
      id: true,
      roles: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const count = await db.user.count();
  const pageCount = Math.ceil(count / pageSize);

  return json({ users, pageCount });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "role") {
    const id = formData.get("id");
    const role = formData.get("role");
    const checked = !!formData.get("checked");

    if (
      !id ||
      !role ||
      !(typeof id === "string") ||
      !(typeof role === "string")
    ) {
      return json(
        { error: "Users page backend error: Incomplete Request" },
        { status: 400 }
      );
    }

    // Get current list of roles
    const user = await db.user.upsert({
      where: {
        id: id,
      },
      update: {},
      create: { id: id },
      select: {
        id: true,
        roles: true,
      },
    });

    let newRoles: string[];

    if (checked && !user.roles.includes(role)) {
      // Add new role
      newRoles = [...user.roles, role];
    } else {
      // Remove role
      newRoles = user.roles.filter((r) => r !== role);
    }
    await db.user.update({
      where: {
        id: id,
      },
      data: {
        roles: newRoles,
      },
    });

    return json({ ok: true });
  } else {
    const userId = formData.get("userId");
    if (!userId || !(typeof userId === "string")) {
      return json(
        { error: "Users page backend error: Incomplete Request" },
        { status: 400 }
      );
    }
    await db.user.create({
      data: {
        id: userId,
      },
    });
    return json({ ok: true });
  }
};

export default function Users() {
  // Pagination
  const [searchParams, setSearchParams] = useSearchParams();
  const pageStr = searchParams.get("page") ?? "1";
  const pageSizeStr = searchParams.get("pageSize") ?? "10";
  const page = parseInt(pageStr, 10);
  const pageSize = parseInt(pageSizeStr, 10);

  const navigation = useNavigation();

  // Table Data
  const { users, pageCount } = useLoaderData<typeof loader>();

  // Action Handlers
  const fetcher = useFetcher();

  const handleRoleUpdate = (id: string, role: string, checked: boolean) => {
    fetcher.submit(
      { id: id, role: role, checked: checked, action: "role" },
      { method: "post" }
    );
  };

  const canNextPage = pageCount - page > 0;
  const canPrevPage = pageCount - page < pageCount - 1;

  const handlePageChange = (next: boolean) => {
    let newPage: number;
    if (next) {
      if (!canNextPage) {
        return;
      }
      newPage = page + 1;
    } else {
      if (!canPrevPage) {
        return;
      }
      newPage = page - 1;
    }
    const newParams = new URLSearchParams();
    newParams.set("page", newPage.toString());
    newParams.set("pageSize", pageSize.toString());
    setSearchParams(newParams);
  };

  // Table Column Definitions

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => <div className="text-left">{row.getValue("id")}</div>,
    },
    {
      accessorKey: "roles",
      header: "Roles",
      cell: ({ row }) => {
        const roles: string[] = row.getValue("roles");
        const formatted = roles.length === 0 ? "—" : roles.join(", ");
        return (
          <div
            className={`text-left ${roles.length === 0 ? "text-gray-300" : ""}`}
          >
            {formatted}
          </div>
        );
      },
    },
    {
      id: "edit-roles",
      header: () => (
        <Dialog>
          <DialogTrigger asChild>
            <div className="text-center">
              <Button variant="secondary">
                <TbPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <fetcher.Form method="post">
              <DialogHeader>
                <DialogTitle>Add User</DialogTitle>
                <DialogDescription>
                  Get the User ID from the Supabase Dashboard. They must have
                  signed in at least once. Roles will not be edited on adding.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="userId" className="text-right">
                    User ID
                  </Label>
                  <Input
                    id="userId"
                    name="userId"
                    placeholder="User ID"
                    className="col-span-3"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit">Add</Button>
                </DialogFooter>
              </div>
            </fetcher.Form>
          </DialogContent>
        </Dialog>
      ),
      cell: ({ row }) => {
        const user = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <TbDots className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Edit Roles</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                disabled={fetcher.state === "submitting"}
                checked={user.roles.includes("Admin")}
                onCheckedChange={(checked) => {
                  handleRoleUpdate(user.id, "Admin", checked);
                }}
              >
                Admin
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="mx-4 h-full content-center items-center space-y-4 pt-4 text-center md:container md:mx-auto">
      <h1 className="text-center text-2xl font-bold">Admin: Manage Users</h1>
      <div className="">
        <DataTable
          columns={columns}
          data={users}
          getCoreRowModel={getCoreRowModel()}
        />
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <span>
          Page {pageStr} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(false)}
          disabled={!canPrevPage || navigation.state === "loading"}
        >
          {navigation.state === "loading" ? "Loading..." : "Previous"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(true)}
          disabled={!canNextPage || navigation.state === "loading"}
        >
          {navigation.state === "loading" ? "Loading..." : "Next"}
        </Button>
      </div>
    </div>
  );
}
