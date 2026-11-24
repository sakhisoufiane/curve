import React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useClients } from "@/lib/queries";

export function DashboardPage() {
  const { data: records = [], isLoading } = useClients();

  const stats = React.useMemo(() => {
    const activeCount = records.filter((record) => record.status === "Active").length;
    return {
      total: records.length,
      active: activeCount,
      inactive: records.length - activeCount
    };
  }, [records]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Clients</CardTitle>
          <CardDescription>Overview of client activity.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              <Card className="flex items-center justify-between p-4">
                <div className="text-sm font-medium">Total</div>
                <div className="text-lg font-semibold">{stats.total}</div>
              </Card>
              <Card className="flex items-center justify-between p-4">
                <div className="text-sm font-medium">Active</div>
                <div className="text-lg font-semibold">{stats.active}</div>
              </Card>
              <Card className="flex items-center justify-between p-4">
                <div className="text-sm font-medium">Inactive</div>
                <div className="text-lg font-semibold">{stats.inactive}</div>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
