import React from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { useDeleteUser, useUsers } from "@/lib/queries";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/components/ui/use-toast.jsx";

export function UsersPage() {
  const { data: users = [], isLoading } = useUsers();
  const deleteUser = useDeleteUser();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user?.role !== "Admin") {
    return <div className="text-sm text-muted-foreground">Not authorized.</div>;
  }

  const [filterValue, setFilterValue] = React.useState("");
  const [tab, setTab] = React.useState("all");

  const filteredUsers = React.useMemo(() => {
    if (tab === "admin") return users.filter((u) => u.role === "Admin");
    if (tab === "editor") return users.filter((u) => u.role === "Editor");
    if (tab === "viewer") return users.filter((u) => u.role === "Viewer");
    return users;
  }, [users, tab]);

  const columns = React.useMemo(
    () => [
      { accessorKey: "email", header: "Email" },
      { accessorKey: "role", header: "Role" },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={(event) => event.stopPropagation()}>
                Remove
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove user?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the user. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={(event) => event.stopPropagation()}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteUser.mutate(row.original.id, {
                      onSuccess: () => {
                        toast({ title: "User deleted", description: "User has been removed." });
                      },
                      onError: () => {
                        toast({ title: "Delete failed", description: "Unable to delete user.", variant: "destructive" });
                      }
                    });
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )
      }
    ],
    [deleteUser]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div />
        <Button className="gap-2" onClick={() => navigate("/users/new")}>
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-sm">
              <Input
                placeholder="Filter by email..."
                value={filterValue}
                onChange={(event) => setFilterValue(event.target.value)}
              />
            </div>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="viewer">Viewer</TabsTrigger>
              </TabsList>
            </Tabs>
            <span className="text-sm text-muted-foreground">{filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading users...</p>
          ) : (
            <DataTable
              columns={columns}
              data={filteredUsers}
              filterKey="email"
              onRowClick={(user) => navigate(`/users/${user.id}`)}
              hideToolbar
              externalFilter={filterValue}
              pageSize={100}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
