import React from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useCreateUser, useDeleteUser, useUpdateUser, useUserLogs, useUsers } from "@/lib/queries";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/components/ui/use-toast.jsx";
import { useMinDelay } from "@/lib/use-min-delay";

const defaultForm = {
  email: "",
  password: "",
  role: "Viewer"
};

export function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: users = [], isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const { data: logs = [], isLoading: logsLoading } = useUserLogs(id);
  const { user: currentUser } = useAuth();

  const isNew = id === "new";
  const saving = useMinDelay(isNew ? createUser.isPending : updateUser.isPending, 1000);
  const deleting = useMinDelay(deleteUser.isPending, 1000);

  const user = users.find((item) => item.id === id);

  const [form, setForm] = React.useState(defaultForm);
  const [error, setError] = React.useState("");
  const [tab, setTab] = React.useState("overview");

  React.useEffect(() => {
    if (isNew) {
      setForm(defaultForm);
      return;
    }
    if (user) {
      setForm({
        email: user.email || "",
        password: "",
        role: user.role || "Viewer"
      });
    }
  }, [isNew, user]);

  if (currentUser?.role !== "Admin") {
    return <div className="text-sm text-muted-foreground">Not authorized.</div>;
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (!user && !isNew) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User not found</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => navigate("/users")}>Back to users</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => navigate("/users")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          ← Users
        </button>
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
                  <AlertDialogTitle>Delete user?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the user. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await deleteUser.mutateAsync(user.id);
                      toast({ title: "User deleted", description: "User has been removed." });
                      navigate("/users");
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button type="submit" form="user-detail-form" disabled={saving}>
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
      </div>

      <Card>
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <CardHeader>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {!isNew && <TabsTrigger value="logs">Logs</TabsTrigger>}
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="overview" className="mt-4">
              <form
                id="user-detail-form"
                className="space-y-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setError("");

                  const emailValue = form.email.trim();
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
                    setError("Please enter a valid email address.");
                    return;
                  }

                  if (isNew && form.password.length < 8) {
                    setError("Password must be at least 8 characters.");
                    return;
                  }

                  try {
                    const payload = {
                      email: emailValue,
                      role: form.role,
                      ...(form.password ? { password: form.password } : {})
                    };
                    if (isNew) {
                      const created = await createUser.mutateAsync(payload);
                      toast({ title: "User created", description: "User has been created." });
                      navigate(`/users/${created.id}`);
                    } else {
                      await updateUser.mutateAsync({ id: user.id, payload });
                      toast({ title: "User saved", description: "Changes have been saved." });
                    }
                  } catch (err) {
                    setError(err.message || "Failed to save user.");
                    toast({ title: "Save failed", description: "Unable to save user.", variant: "destructive" });
                  }
                }}
              >
                <div className="grid gap-2">
                  <Label htmlFor="user-email">Email</Label>
                  <Input
                    id="user-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="user-password">Password</Label>
                  <Input
                    id="user-password"
                    type="password"
                    placeholder={isNew ? "At least 8 characters" : "Leave blank to keep unchanged"}
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(value) => setForm((prev) => ({ ...prev, role: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Editor">Editor</SelectItem>
                      <SelectItem value="Viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
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
              <TabsContent value="logs" className="mt-4">
                {logsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading logs...</p>
                ) : logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Client Changes</p>
                      <div className="mt-2 space-y-3">
                        {logs.filter((log) => log.type !== "activity").length === 0 ? (
                          <p className="text-xs text-muted-foreground">No client changes yet.</p>
                        ) : (
                          logs.filter((log) => log.type !== "activity").map((log) => (
                            <details key={log.id} className="rounded-lg border p-3">
                              <summary className="cursor-pointer list-none">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium capitalize">{log.action}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {log.client ? `${log.client.name} (${log.client.id})` : "Unknown client"}
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
                                        <span className="text-xs text-muted-foreground">
                                          {String(change.to)}
                                        </span>
                                      )}
                                      {change.type === "removed" && (
                                        <span className="text-xs text-muted-foreground">
                                          {String(change.from)}
                                        </span>
                                      )}
                                    </div>
                                  ));
                                })()}
                              </div>
                            </details>
                          ))
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Import/Export</p>
                      <div className="mt-2 space-y-3">
                        {logs.filter((log) => log.type === "activity" && log.action !== "login").length === 0 ? (
                          <p className="text-xs text-muted-foreground">No import/export activity yet.</p>
                        ) : (
                          logs
                            .filter((log) => log.type === "activity" && log.action !== "login")
                            .map((log) => (
                              <details key={log.id} className="rounded-lg border p-3">
                                <summary className="cursor-pointer list-none">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-medium capitalize">
                                        {log.action.replace(/_/g, " ")}
                                      </p>
                                      <p className="text-xs text-muted-foreground">System activity</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(log.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                </summary>
                                <div className="mt-3 space-y-2 text-sm">
                                  {log.meta ? (
                                    Object.entries(log.meta).map(([key, value]) => (
                                      <div
                                        key={key}
                                        className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 px-3 py-2"
                                      >
                                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                                          meta
                                        </span>
                                        <span className="font-medium">{key}</span>
                                        <span className="text-xs text-muted-foreground">{String(value)}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-xs text-muted-foreground">No details.</p>
                                  )}
                                </div>
                              </details>
                            ))
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Logins</p>
                      <div className="mt-2 space-y-3">
                        {logs.filter((log) => log.type === "activity" && log.action === "login").length === 0 ? (
                          <p className="text-xs text-muted-foreground">No login activity yet.</p>
                        ) : (
                          logs
                            .filter((log) => log.type === "activity" && log.action === "login")
                            .map((log) => (
                              <details key={log.id} className="rounded-lg border p-3">
                                <summary className="cursor-pointer list-none">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-medium">Login</p>
                                      <p className="text-xs text-muted-foreground">Authentication</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(log.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                </summary>
                                <div className="mt-3 space-y-2 text-sm">
                                  {log.meta ? (
                                    Object.entries(log.meta).map(([key, value]) => (
                                      <div
                                        key={key}
                                        className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 px-3 py-2"
                                      >
                                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                                          meta
                                        </span>
                                        <span className="font-medium">{key}</span>
                                        <span className="text-xs text-muted-foreground">{String(value)}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-xs text-muted-foreground">No details.</p>
                                  )}
                                </div>
                              </details>
                            ))
                        )}
                      </div>
                    </div>
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
