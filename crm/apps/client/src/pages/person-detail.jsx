import React from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  useCreatePerson,
  useDeletePerson,
  usePersonInvolvements,
  usePersonLogs,
  usePeople,
  useUpdatePerson,
  useUpdateProductInvolvement
} from "@/lib/queries";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/components/ui/use-toast.jsx";
import { useMinDelay } from "@/lib/use-min-delay";

const defaultForm = {
  name: "",
  department: "",
  hourlyRate: ""
};

export function PersonDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: people = [], isLoading } = usePeople();
  const createPerson = useCreatePerson();
  const updatePerson = useUpdatePerson();
  const deletePerson = useDeletePerson();
  const updateInvolvement = useUpdateProductInvolvement();
  const { data: logs = [], isLoading: logsLoading } = usePersonLogs(id);
  const { data: involvements = [], isLoading: involvementsLoading } = usePersonInvolvements(id);
  const { user: currentUser } = useAuth();

  const isNew = id === "new";
  const saving = useMinDelay(isNew ? createPerson.isPending : updatePerson.isPending, 1000);
  const deleting = useMinDelay(deletePerson.isPending, 1000);

  const person = people.find((item) => item.id === id);

  const [form, setForm] = React.useState(defaultForm);
  const [error, setError] = React.useState("");
  const [tab, setTab] = React.useState("overview");
  const [editingInvolvementId, setEditingInvolvementId] = React.useState(null);
  const [involvementHours, setInvolvementHours] = React.useState("");
  const [involvementError, setInvolvementError] = React.useState("");

  const canEdit = currentUser?.role === "Admin" || currentUser?.role === "Editor";

  React.useEffect(() => {
    if (isNew) {
      setForm(defaultForm);
      return;
    }
    if (person) {
      setForm({
        name: person.name || "",
        department: person.department || "",
        hourlyRate: person.hourlyRate != null ? String(person.hourlyRate) : ""
      });
    }
  }, [isNew, person]);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (!person && !isNew) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Person not found</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => navigate("/team")}>Back to team</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => navigate("/team")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          ← Team
        </button>
        {canEdit && (
          <div className="flex items-center gap-2">
            {!isNew && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" type="button" disabled={deleting}>
                    {deleting ? <Spinner className="h-3 w-3" /> : null}
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete person?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this person. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await deletePerson.mutateAsync(person.id);
                        toast({ title: "Person deleted", description: "Person has been removed." });
                        navigate("/team");
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button type="submit" form="person-detail-form" disabled={saving}>
              {saving ? (
                <>
                  <Spinner className="h-3 w-3" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        )}
      </div>

      <Card>
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <CardHeader>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {!isNew && <TabsTrigger value="involvements">Involvements</TabsTrigger>}
              {!isNew && <TabsTrigger value="logs">Logs</TabsTrigger>}
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="overview" className="mt-4">
              <form
                id="person-detail-form"
                className="space-y-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setError("");

                  if (!form.name.trim()) {
                    setError("Name is required.");
                    return;
                  }

                  if (!form.department.trim()) {
                    setError("Department is required.");
                    return;
                  }

                  const rate = parseFloat(form.hourlyRate);
                  if (isNaN(rate) || rate < 0) {
                    setError("Please enter a valid hourly rate.");
                    return;
                  }

                  try {
                    const payload = {
                      name: form.name.trim(),
                      department: form.department.trim(),
                      hourlyRate: rate
                    };
                    if (isNew) {
                      const created = await createPerson.mutateAsync(payload);
                      toast({ title: "Person created", description: "Person has been added to the team." });
                      navigate(`/team/${created.id}`);
                    } else {
                      await updatePerson.mutateAsync({ id: person.id, payload });
                      toast({ title: "Person saved", description: "Changes have been saved." });
                    }
                  } catch (err) {
                    setError(err.message || "Failed to save person.");
                    toast({ title: "Save failed", description: "Unable to save person.", variant: "destructive" });
                  }
                }}
              >
                <div className="grid gap-2">
                  <Label htmlFor="person-name">Name</Label>
                  <Input
                    id="person-name"
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    disabled={!canEdit}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="person-department">Department</Label>
                  <Input
                    id="person-department"
                    type="text"
                    value={form.department}
                    onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value }))}
                    disabled={!canEdit}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="person-hourly-rate">Hourly Rate ($)</Label>
                  <Input
                    id="person-hourly-rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.hourlyRate}
                    onChange={(event) => setForm((prev) => ({ ...prev, hourlyRate: event.target.value }))}
                    disabled={!canEdit}
                    required
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
            {!isNew && (
              <TabsContent value="involvements" className="mt-4">
                {involvementsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading involvements...</p>
                ) : involvements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No involvement yet.</p>
                ) : (
                  <div className="space-y-2">
                    {involvements.map((involvement) => {
                      const product = involvement.product;
                      const ownerLabel = product?.client?.name
                        ? `Client: ${product.client.name}`
                        : (product?.customer?.businessLegalName ? `Customer: ${product.customer.businessLegalName}` : "Unknown");
                      const isEditing = editingInvolvementId === involvement.id;
                      return (
                        <div key={involvement.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                          <div>
                            <p className="text-sm font-medium">{ownerLabel}</p>
                            <p className="text-xs text-muted-foreground">{product?.type || "Product"}</p>
                          </div>
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                step="0.25"
                                value={involvementHours}
                                onChange={(event) => setInvolvementHours(event.target.value)}
                                className="w-28"
                              />
                              <Button
                                type="button"
                                onClick={async () => {
                                  if (involvementHours === "") {
                                    setInvolvementError("Total hours is required.");
                                    return;
                                  }
                                  setInvolvementError("");
                                  try {
                                    await updateInvolvement.mutateAsync({
                                      id: involvement.id,
                                      payload: {
                                        productId: involvement.productId,
                                        personId: id,
                                        totalHours: parseFloat(involvementHours)
                                      }
                                    });
                                    setEditingInvolvementId(null);
                                    setInvolvementHours("");
                                    toast({ title: "Involvement updated", description: "Total hours has been updated." });
                                  } catch (err) {
                                    setInvolvementError(err.message || "Failed to update involvement.");
                                    toast({ title: "Update failed", description: "Unable to update involvement.", variant: "destructive" });
                                  }
                                }}
                                disabled={updateInvolvement.isPending}
                              >
                                {updateInvolvement.isPending ? <><Spinner className="h-3 w-3" />Saving...</> : "Save"}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                  setEditingInvolvementId(null);
                                  setInvolvementHours("");
                                  setInvolvementError("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <p className="text-sm text-muted-foreground">
                                {Number(involvement.totalHours).toLocaleString()} hours
                              </p>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                  setEditingInvolvementId(involvement.id);
                                  setInvolvementHours(String(involvement.totalHours));
                                  setInvolvementError("");
                                }}
                              >
                                Edit
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {involvementError && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{involvementError}</AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            )}
            {!isNew && (
              <TabsContent value="logs" className="mt-4">
                {logsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading logs...</p>
                ) : logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <details key={log.id} className="rounded-lg border p-3">
                        <summary className="cursor-pointer list-none">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium capitalize">{log.action}</p>
                              <p className="text-xs text-muted-foreground">
                                {log.user ? log.user.email : "Unknown user"}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </summary>
                        <div className="mt-3 space-y-2 text-sm">
                          {(() => {
                            const before = log?.changes?.before || {};
                            const after = log?.changes?.after || {};
                            const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
                            const changes = [];
                            keys.forEach((field) => {
                              if (field === "createdAt" || field === "updatedAt") return;
                              const from = before[field];
                              const to = after[field];
                              if (from === to) return;
                              if (from === undefined) {
                                changes.push({ field, type: "added", from: null, to });
                              } else if (to === undefined) {
                                changes.push({ field, type: "removed", from, to: null });
                              } else {
                                changes.push({ field, type: "updated", from, to });
                              }
                            });
                            if (changes.length === 0) {
                              return <p className="text-xs text-muted-foreground">No field changes detected.</p>;
                            }
                            return changes.map((change, index) => (
                              <div
                                key={`${change.field}-${index}`}
                                className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 px-3 py-2"
                              >
                                <span className="text-xs font-semibold uppercase text-muted-foreground">
                                  {change.type}
                                </span>
                                <span className="font-medium">{change.field}</span>
                                {change.type === "updated" && (
                                  <span className="text-xs text-muted-foreground">
                                    {String(change.from)} → {String(change.to)}
                                  </span>
                                )}
                                {change.type === "added" && (
                                  <span className="text-xs text-muted-foreground">{String(change.to)}</span>
                                )}
                                {change.type === "removed" && (
                                  <span className="text-xs text-muted-foreground">{String(change.from)}</span>
                                )}
                              </div>
                            ));
                          })()}
                        </div>
                      </details>
                    ))}
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
