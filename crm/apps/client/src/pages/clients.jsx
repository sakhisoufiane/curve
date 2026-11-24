import React from "react";
import { useNavigate } from "react-router-dom";

import { DataTable } from "@/components/data-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useClients } from "@/lib/queries";

export function ClientsPage() {
  const { data: records = [], isLoading: loadingRecords } = useClients();
  const navigate = useNavigate();

  const [formError, setFormError] = React.useState("");
  const [filterValue, setFilterValue] = React.useState("");

  const filteredRecords = React.useMemo(() => {
    if (!filterValue) return records;
    const lower = filterValue.toLowerCase();
    return records.filter(
      (r) =>
        (r.name || "").toLowerCase().includes(lower) ||
        (r.curveId || "").toLowerCase().includes(lower) ||
        (r.type || "").toLowerCase().includes(lower) ||
        (r.customer?.businessLegalName || "").toLowerCase().includes(lower)
    );
  }, [records, filterValue]);

  const columns = React.useMemo(
    () => [
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => row.original.type || <span className="text-muted-foreground">—</span>
      },
      {
        accessorKey: "paymentTier",
        header: "Payment Tier",
        cell: ({ row }) => row.original.paymentTier || <span className="text-muted-foreground">—</span>
      },
      {
        id: "customer",
        header: "Customer",
        cell: ({ row }) =>
          row.original.customer?.businessLegalName || (
            <span className="text-muted-foreground">—</span>
          )
      },
    ],
    []
  );

  return (
    <div className="space-y-6">

      {formError && (
        <Alert variant="destructive">
          <AlertTitle>Action needed</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-sm">
              <Input
                placeholder="Filter by name, type, Curve ID or customer..."
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
              />
            </div>
            <span className="text-sm text-muted-foreground">{filteredRecords.length} client{filteredRecords.length !== 1 ? "s" : ""}</span>
          </div>
        </CardHeader>
        <CardContent>
          {loadingRecords ? (
            <p className="text-sm text-muted-foreground">Loading clients...</p>
          ) : (
            <DataTable
              columns={columns}
              data={filteredRecords}
              filterKey="name"
              onRowClick={(client) => navigate(`/clients/${client.id}`)}
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
