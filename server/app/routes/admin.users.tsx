import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  useFetcher,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "@remix-run/react";
import { db } from "~/utils/db.server";
import type { User } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "~/components/shadcn-ui-mod/data-table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/shadcn-ui-mod/button";
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
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import {
  ADMIN_ROLE_NAME,
  isAdmin,
  createServerClient,
  FORBIDDEN_ROUTE,
} from "~/utils/supabase.server";
import { WEBSITE_TITLE } from "~/root";
import { parsePagination } from "~/utils/pagination.server";
import PaginationBar from "~/components/pagination-bar";
import { Prisma } from "@prisma/client";
import { InlineLoadingSpinner } from "~/components/inline-loading-spinner";
import { useEffect, useState } from "react";
import { useToast } from "~/components/ui/use-toast";

const PAGE_TITLE = "User Management";

export const meta: MetaFunction = () => {
  return { title: `${PAGE_TITLE} - ${WEBSITE_TITLE}` };
};

export const loader: LoaderFunction = async ({ request }) => {
  const { supabase, headers } = createServerClient(request);
  if (!(await isAdmin(supabase))) {
    return redirect(FORBIDDEN_ROUTE, { headers });
  }

  const { page, pageSize } = parsePagination(request);

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

  return json({ users, pageCount, ADMIN_ROLE_NAME }, { headers });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const action = formData.get("action");

  const { supabase, headers } = createServerClient(request);

  if (!(await isAdmin(supabase))) {
    return json(
      { error: "Requesting user is not an administrator or is not logged in" },
      { status: 400, headers }
    );
  }

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
        { status: 400, headers }
      );
    }

    if (role !== ADMIN_ROLE_NAME) {
      return json(
        { error: `Users page backend error: Invalid Role '${role}'` },
        { status: 400, headers }
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

    return json({ ok: true, action, userId: id }, { headers });
  } else {
    const userId = formData.get("userId");
    if (!userId || !(typeof userId === "string")) {
      return json(
        { error: "Users page backend error: Incomplete Request" },
        { status: 400, headers }
      );
    }
    try {
      await db.user.create({
        data: {
          id: userId,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          return json(
            { error: "User already exists in the database" },
            { status: 400, headers }
          );
        } else {
          throw e;
        }
      }
    }
    return json({ ok: true, action, userId }, { headers });
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
  const fetcher = useFetcher();

  // Pending UI
  const isDialogSubmitting = navigation.state === "submitting";
  const isRoleSubmitting = fetcher.state === "submitting";
  const [modUserId, setModUserId] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (fetcher.state === "idle") {
      setModUserId("");
      if (fetcher?.data?.ok) {
        toast({
          title:
            fetcher?.data?.action === "role"
              ? "User roles updated!"
              : "User added!",
          description: `User ID: ${fetcher?.data?.userId}`,
        });
      } else if (fetcher?.data?.error) {
        toast({
          title: "Error",
          description: fetcher.data.error,
          variant: "destructive",
        });
      }
    }
  }, [fetcher, toast]);

  // Table Data
  const { users, pageCount, ADMIN_ROLE_NAME } = useLoaderData<typeof loader>();

  // Action Handlers
  const handleRoleUpdate = (id: string, role: string, checked: boolean) => {
    setModUserId(id);
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
                    disabled={isDialogSubmitting}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isDialogSubmitting}>
                    <InlineLoadingSpinner show={isDialogSubmitting} />
                    Add
                  </Button>
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
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                disabled={isRoleSubmitting}
              >
                <span className="sr-only">Open menu</span>
                {isRoleSubmitting && modUserId === user.id ? (
                  <InlineLoadingSpinner show={true} className="!mr-0" />
                ) : (
                  <TbDots className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Edit Roles</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                disabled={isRoleSubmitting}
                checked={user.roles.includes(ADMIN_ROLE_NAME)}
                onCheckedChange={(checked) => {
                  handleRoleUpdate(user.id, ADMIN_ROLE_NAME, checked);
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
      <h1 className="text-center text-2xl font-bold">Admin: {PAGE_TITLE}</h1>
      <div className="">
        <DataTable
          columns={columns}
          data={users}
          getCoreRowModel={getCoreRowModel()}
        />
      </div>
      <PaginationBar
        pageStr={pageStr}
        pageCount={pageCount}
        handlePageChange={handlePageChange}
        canPrevPage={canPrevPage}
        canNextPage={canNextPage}
        navigation={navigation}
      />
    </div>
  );
}
