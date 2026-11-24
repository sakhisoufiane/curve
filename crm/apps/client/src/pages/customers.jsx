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
import { useCustomers, useDeleteCustomer } from "@/lib/queries";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/components/ui/use-toast.jsx";

export function CustomersPage() {
  const { data: customers = [], isLoading } = useCustomers();
  const deleteCustomer = useDeleteCustomer();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [filterValue, setFilterValue] = React.useState("");

  const filteredCustomers = React.useMemo(() => {
    if (!filterValue) return customers;
    const lower = filterValue.toLowerCase();
    return customers.filter((c) =>
      (c.businessLegalName || "").toLowerCase().includes(lower)
    );
  }, [customers, filterValue]);

  const canEdit = user?.role === "Admin" || user?.role === "Editor";

  const columns = React.useMemo(
    () => [
      {
        accessorKey: "businessLegalName",
        header: "Business Name",
        cell: ({ row }) => row.original.businessLegalName || <span className="text-muted-foreground">—</span>
      },
      {
        accessorKey: "lastInvoiceDate",
        header: "Last Invoice Date",
        cell: ({ row }) => row.original.lastInvoiceDate
          ? new Date(row.original.lastInvoiceDate).toLocaleDateString()
          : <span className="text-muted-foreground">—</span>
      },
      {
        id: "inArrears",
        header: "Unpaid Invoices",
        cell: () => <span className="text-muted-foreground">—</span>
      },
      {
        accessorKey: "active",
        header: "Active",
        cell: ({ row }) => row.original.active ? "Yes" : "No"
      },
      ...(canEdit
        ? [
            {
              id: "actions",
              header: "Actions",
              cell: ({ row }) => (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                      Remove
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove customer?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this customer. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCustomer.mutate(row.original.id, {
                            onSuccess: () => toast({ title: "Customer deleted", description: "Customer has been removed." }),
                            onError: () => toast({ title: "Delete failed", description: "Unable to delete customer.", variant: "destructive" })
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
    [deleteCustomer, canEdit]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div />
        {canEdit && (
          <Button className="gap-2" onClick={() => navigate("/customers/new")}>
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-sm">
              <Input
                placeholder="Filter by name..."
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
              />
            </div>
            <span className="text-sm text-muted-foreground">{filteredCustomers.length} customer{filteredCustomers.length !== 1 ? "s" : ""}</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading customers...</p>
          ) : (
            <DataTable
              columns={columns}
              data={filteredCustomers}
              filterKey="businessLegalName"
              onRowClick={(customer) => navigate(`/customers/${customer.id}`)}
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
