import React from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useClientLogs,
  useClients,
  useCreateClient,
  useCustomers,
  usePeople,
  useUpdateClient
} from "@/lib/queries";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/components/ui/use-toast.jsx";
import { useMinDelay } from "@/lib/use-min-delay";

const defaultForm = {
  name: "",
  curveId: "",
  curveParentId: "",
  customerId: "",
  type: "",
  active: true,
  paymentTier: "",
  notes: ""
};

function diffLog(log) {
  const before = log?.changes?.before || {};
  const after = log?.changes?.after || {};

  if (log.action === "create") {
    return Object.entries(after)
      .filter(([field]) => field !== "createdAt" && field !== "updatedAt" && after[field] != null && after[field] !== "")
      .map(([field, value]) => ({ field, type: "added", from: null, to: value }));
  }
  if (log.action === "delete") {
    return Object.entries(before)
      .filter(([field]) => field !== "createdAt" && field !== "updatedAt")
      .map(([field, value]) => ({ field, type: "removed", from: value, to: null }));
  }

  const changes = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  keys.forEach((field) => {
    if (field === "createdAt" || field === "updatedAt") return;
    const from = before[field];
    const to = after[field];
    if (String(from) === String(to)) return;
    if (from === undefined) changes.push({ field, type: "added", from: null, to });
    else if (to === undefined) changes.push({ field, type: "removed", from, to: null });
    else changes.push({ field, type: "updated", from, to });
  });
  return changes;
}

function SwitchField({ label, checked, onCheckedChange, disabled }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <p className="text-sm font-medium">{label}</p>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: records = [], isLoading } = useClients();
  const { data: customers = [] } = useCustomers();
  const { data: people = [] } = usePeople();
  const createRecord = useCreateClient();
  const updateRecord = useUpdateClient();
  const { user } = useAuth();

  const [form, setForm] = React.useState(defaultForm);
  const [error, setError] = React.useState("");
  const [tab, setTab] = React.useState("overview");

  const isNew = id === "new";
  const canEdit = user?.role === "Admin" || user?.role === "Editor";
  const saving = useMinDelay(isNew ? createRecord.isPending : updateRecord.isPending, 1000);
  const { data: logs = [], isLoading: logsLoading } = useClientLogs(isNew ? null : id);
  const client = records.find((item) => item.id === id);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const setVal = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  React.useEffect(() => {
    if (isNew) { setForm(defaultForm); return; }
    if (client) {
      setForm({
        name: client.name || "",
        curveId: client.curveId || "",
        curveParentId: client.curveParentId || "",
        customerId: client.customerId || "",
        type: client.type || "",
        active: client.active ?? true,
        paymentTier: client.paymentTier || "",
        notes: client.notes || ""
      });
    }
  }, [client, isNew]);

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading...</div>;

  if (!client && !isNew) {
    return (
      <Card>
        <CardHeader><CardTitle>Client not found</CardTitle></CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => navigate("/clients")}>Back to clients</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => navigate("/clients")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          ← Clients
        </button>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button type="submit" form="client-detail-form" disabled={saving}>
              {saving ? <><Spinner className="h-3 w-3" />Saving...</> : "Save"}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <CardHeader>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
              {!isNew && <TabsTrigger value="logs">Logs</TabsTrigger>}
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="overview" className="mt-4">
              <form
                id="client-detail-form"
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError("");
                  if (!form.name.trim()) {
                    setError("Client name is required.");
                    return;
                  }
                  try {
                    const payload = {
                      name: form.name.trim(),
                      curveId: form.curveId || null,
                      curveParentId: form.curveParentId || null,
                      customerId: form.customerId || null,
                      type: form.type || null,
                      active: form.active,
                      paymentTier: form.paymentTier || null,
                      notes: form.notes || null
                    };
                    if (isNew) {
                      const created = await createRecord.mutateAsync(payload);
                      toast({ title: "Client created", description: "Client has been created." });
                      navigate(`/clients/${created.id}`);
                    } else {
                      await updateRecord.mutateAsync({ id: client.id, payload });
                      toast({ title: "Client saved", description: "Changes have been saved." });
                    }
                  } catch (err) {
                    setError(err.message || "Failed to save client.");
                    toast({ title: "Save failed", description: "Unable to save changes.", variant: "destructive" });
                  }
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="client-name">Name</Label>
                    <Input id="client-name" value={form.name} readOnly />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="curve-id">Curve ID</Label>
                    <Input id="curve-id" value={form.curveId} readOnly />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="curve-parent-id">Curve Parent ID</Label>
                    <Input id="curve-parent-id" value={form.curveParentId} readOnly />
                  </div>
                  <div className="grid gap-2">
                    <Label>Type</Label>
                    <Input value={form.type} readOnly />
                  </div>
                  <div className="grid gap-2">
                    <Label>Payment Tier</Label>
                    <Input value={form.paymentTier} readOnly />
                  </div>
                  <div className="grid gap-2">
                    <Label>Customer</Label>
                    <Select
                      value={form.customerId || "__none__"}
                      onValueChange={(v) => setVal("customerId")(v === "__none__" ? "" : v)}
                      disabled={!canEdit}
                    >
                      <SelectTrigger><SelectValue placeholder="Link to customer" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.businessLegalName || c.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <p className="text-sm font-medium">Active</p>
                  <Switch
                    checked={form.active}
                    onCheckedChange={(checked) => setForm((prev) => ({ ...prev, active: checked }))}
                    disabled={!canEdit}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="client-notes">Notes</Label>
                  <textarea
                    id="client-notes"
                    value={form.notes}
                    onChange={set("notes")}
                    disabled={!canEdit}
                    rows={5}
                    placeholder="Add notes..."
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertTitle>Form error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </form>
            </TabsContent>

            <TabsContent value="usage" className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">No usage data yet.</p>
            </TabsContent>

            {!isNew && (
              <TabsContent value="logs" className="mt-4">
                {logsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading logs...</p>
                ) : logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log) => {
                      const changes = diffLog(log);
                      return (
                        <details key={log.id} className="rounded-lg border p-3">
                          <summary className="cursor-pointer list-none">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium capitalize">{log.action}</p>
                                <p className="text-xs text-muted-foreground">{log.user?.email || "Unknown user"}</p>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.createdAt).toLocaleString()}
                              </span>
                            </div>
                          </summary>
                          <div className="mt-3 space-y-2 text-sm">
                            {changes.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No field changes detected.</p>
                            ) : (
                              changes.map((change, index) => (
                                <div
                                  key={`${change.field}-${index}`}
                                  className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 px-3 py-2"
                                >
                                  <span className="text-xs font-semibold uppercase text-muted-foreground">{change.type}</span>
                                  <span className="font-medium">{change.field}</span>
                                  {change.type === "updated" && (
                                    <span className="text-xs text-muted-foreground">{String(change.from)} → {String(change.to)}</span>
                                  )}
                                  {change.type === "added" && (
                                    <span className="text-xs text-muted-foreground">{String(change.to)}</span>
                                  )}
                                  {change.type === "removed" && (
                                    <span className="text-xs text-muted-foreground">{String(change.from)}</span>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            )}
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
