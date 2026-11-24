import React from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useDeletePerson, usePeople } from "@/lib/queries";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/components/ui/use-toast.jsx";

export function TeamPage() {
  const { data: people = [], isLoading } = usePeople();
  const deletePerson = useDeletePerson();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [filterValue, setFilterValue] = React.useState("");

  const filteredPeople = React.useMemo(() => {
    if (!filterValue) return people;
    const lower = filterValue.toLowerCase();
    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.department.toLowerCase().includes(lower)
    );
  }, [people, filterValue]);

  const columns = React.useMemo(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "department", header: "Department" },
      {
        accessorKey: "hourlyRate",
        header: "Hourly Rate",
        cell: ({ row }) => `$${Number(row.original.hourlyRate).toFixed(2)}`
      },
      ...(user?.role === "Admin" || user?.role === "Editor"
        ? [
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
                      <AlertDialogTitle>Remove person?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this person. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={(event) => event.stopPropagation()}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(event) => {
                          event.stopPropagation();
                          deletePerson.mutate(row.original.id, {
                            onSuccess: () => {
                              toast({ title: "Person deleted", description: "Person has been removed." });
                            },
                            onError: () => {
                              toast({ title: "Delete failed", description: "Unable to delete person.", variant: "destructive" });
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
          ]
        : [])
    ],
    [deletePerson, user?.role]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div />
        {(user?.role === "Admin" || user?.role === "Editor") && (
          <Button className="gap-2" onClick={() => navigate("/team/new")}>
            <Plus className="h-4 w-4" />
            Add Person
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-sm">
              <Input
                placeholder="Filter by name or department..."
                value={filterValue}
                onChange={(event) => setFilterValue(event.target.value)}
              />
            </div>
            <span className="text-sm text-muted-foreground">{filteredPeople.length} member{filteredPeople.length !== 1 ? "s" : ""}</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading team...</p>
          ) : (
            <DataTable
              columns={columns}
              data={filteredPeople}
              filterKey="name"
              onRowClick={(person) => navigate(`/team/${person.id}`)}
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
