import React from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
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
  useCreateCustomer,
  useCustomerLogs,
  useCustomers,
  useClients,
  useCreateProduct,
  useCreateProductInvolvement,
  useDeleteProductInvolvement,
  useDeleteProduct,
  useUpdateProduct,
  usePeople,
  useProducts,
  useProductInvolvements,
  useDeleteCustomer,
  useUpdateCustomer
} from "@/lib/queries";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/components/ui/use-toast.jsx";
import { useMinDelay } from "@/lib/use-min-delay";

const defaultForm = {
  businessLegalName: "",
  businessType: "",
  primaryEmail: "",
  secondaryEmail: "",
  phone: "",
  active: true,
  hasContract: false,
  curveTerms: false,
  amendedTerms: false,
  stage: "",
  closeDate: null,
  opportunityOwnerId: "",
  curveParentId: "",
  referrer: "",
  notes: "",
  estimatedMonthlyServices: "",
  estimatedMonthlyServicesCurrency: "",
  activationFee: "",
  activationFeeCurrency: "",
  estimatedAnnualNetRevenue: "",
  estimatedAnnualNetRevenueCurrency: "",
  estimatedOnboardingFee: "",
  estimatedOnboardingFeeCurrency: "",
  billingType: "",
  billingFrequency: "",
  lastInvoiceDate: null,
  nextInvoiceDate: null,
  billingAddressLine1: "",
  billingAddressLine2: "",
  billingCity: "",
  billingState: "",
  billingPostcode: "",
  billingCountry: ""
};

function SwitchField({ label, checked, onCheckedChange, disabled }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <p className="text-sm font-medium">{label}</p>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

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

function formatMoney(amount, currency) {
  if (amount == null || amount === "") return null;
  const numberValue = Number(amount);
  if (Number.isNaN(numberValue)) return `${currency || ""} ${amount}`;
  return `${currency || ""} ${numberValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
}

export function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: customers = [], isLoading } = useCustomers();
  const { data: allClients = [] } = useClients();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const { data: logs = [], isLoading: logsLoading } = useCustomerLogs(id);
  const { data: products = [], isLoading: productsLoading } = useProducts(id);
  const { data: people = [] } = usePeople();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const createProductInvolvement = useCreateProductInvolvement();
  const deleteProductInvolvement = useDeleteProductInvolvement();
  const { user: currentUser } = useAuth();

  const isNew = id === "new";
  const saving = useMinDelay(isNew ? createCustomer.isPending : updateCustomer.isPending, 1000);
  const deleting = useMinDelay(deleteCustomer.isPending, 1000);
  const canEdit = currentUser?.role === "Admin" || currentUser?.role === "Editor";

  const customer = customers.find((c) => c.id === id);
  const customerClients = allClients.filter((c) => c.customerId === id);

  const [form, setForm] = React.useState(defaultForm);
  const [error, setError] = React.useState("");
  const [tab, setTab] = React.useState("overview");
  const [productError, setProductError] = React.useState("");
  const [editingProductId, setEditingProductId] = React.useState(null);
  const [productModalOpen, setProductModalOpen] = React.useState(false);
  const [involvementError, setInvolvementError] = React.useState("");
  const [productForm, setProductForm] = React.useState({
    type: "",
    recurring: false,
    recurringPeriod: "",
    dueDate: null,
    closeDate: null,
    stage: "",
    delivered: false,
    ownerId: "",
    billingType: "",
    amount: "",
    currency: "",
    convertedAmount: "",
    convertedCurrency: "",
    hourlyRate: "",
    hourlyRateCurrency: "",
    estimatedNetAnnualRevenue: "",
    estimatedNetAnnualRevenueCurrency: "",
    calculatedAnnualNetRevenue: "",
    calculatedAnnualNetRevenueCurrency: "",
    calculatedAnnualNetRevenueConveted: "",
    calculatedAnnualNetRevenueConvetedCurrency: "",
    estimatedOnboardingFee: "",
    estimatedOnboardingFeeCurrency: "",
    estimatedMonthlyServicesFee: "",
    estimatedMonthlyServicesFeeCurrency: "",
    productsCap: "",
    contractsCap: "",
    releasesCap: "",
    tracksCap: "",
    worksCap: "",
    periodRecalculationsCap: "",
    notes: ""
  });
  const [involvementForm, setInvolvementForm] = React.useState({
    personId: "",
    totalHours: ""
  });

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const setVal = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));
  const setProduct = (field) => (e) => setProductForm((prev) => ({ ...prev, [field]: e.target.value }));
  const setProductVal = (field) => (value) => setProductForm((prev) => ({ ...prev, [field]: value }));
  const setInvolvement = (field) => (e) => setInvolvementForm((prev) => ({ ...prev, [field]: e.target.value }));
  const setInvolvementVal = (field) => (value) => setInvolvementForm((prev) => ({ ...prev, [field]: value }));
  const resetProductForm = () => {
    setProductForm({
      type: "",
      recurring: false,
      recurringPeriod: "",
      dueDate: null,
      closeDate: null,
      stage: "",
      delivered: false,
      ownerId: "",
      billingType: "",
      amount: "",
      currency: "",
      convertedAmount: "",
      convertedCurrency: "",
      hourlyRate: "",
      hourlyRateCurrency: "",
      estimatedNetAnnualRevenue: "",
      estimatedNetAnnualRevenueCurrency: "",
      calculatedAnnualNetRevenue: "",
      calculatedAnnualNetRevenueCurrency: "",
      calculatedAnnualNetRevenueConveted: "",
      calculatedAnnualNetRevenueConvetedCurrency: "",
      estimatedOnboardingFee: "",
      estimatedOnboardingFeeCurrency: "",
      estimatedMonthlyServicesFee: "",
      estimatedMonthlyServicesFeeCurrency: "",
      productsCap: "",
      contractsCap: "",
      releasesCap: "",
      tracksCap: "",
      worksCap: "",
      periodRecalculationsCap: "",
      notes: ""
    });
    setEditingProductId(null);
    setProductError("");
    setInvolvementForm({ personId: "", totalHours: "" });
    setInvolvementError("");
  };

  const { data: involvements = [], isLoading: involvementsLoading } = useProductInvolvements(editingProductId);

  React.useEffect(() => {
    if (isNew) { setForm(defaultForm); return; }
    if (customer) {
      setForm({
        businessLegalName: customer.businessLegalName || "",
        businessType: customer.businessType || "",
        primaryEmail: customer.primaryEmail || "",
        secondaryEmail: customer.secondaryEmail || "",
        phone: customer.phone || "",
        active: customer.active ?? true,
        hasContract: customer.hasContract ?? false,
        curveTerms: customer.curveTerms ?? false,
        amendedTerms: customer.amendedTerms ?? false,
        stage: customer.stage || "",
        closeDate: customer.closeDate ? new Date(customer.closeDate) : null,
        opportunityOwnerId: customer.opportunityOwnerId || "",
        curveParentId: customer.curveParentId || "",
        referrer: customer.referrer || "",
        notes: customer.notes || "",
        estimatedMonthlyServices: customer.estimatedMonthlyServices != null ? String(customer.estimatedMonthlyServices) : "",
        estimatedMonthlyServicesCurrency: customer.estimatedMonthlyServicesCurrency || "",
        activationFee: customer.activationFee != null ? String(customer.activationFee) : "",
        activationFeeCurrency: customer.activationFeeCurrency || "",
        estimatedAnnualNetRevenue: customer.estimatedAnnualNetRevenue != null ? String(customer.estimatedAnnualNetRevenue) : "",
        estimatedAnnualNetRevenueCurrency: customer.estimatedAnnualNetRevenueCurrency || "",
        estimatedOnboardingFee: customer.estimatedOnboardingFee != null ? String(customer.estimatedOnboardingFee) : "",
        estimatedOnboardingFeeCurrency: customer.estimatedOnboardingFeeCurrency || "",
        billingType: customer.billingType || "",
        billingFrequency: customer.billingFrequency || "",
        lastInvoiceDate: customer.lastInvoiceDate ? new Date(customer.lastInvoiceDate) : null,
        nextInvoiceDate: customer.nextInvoiceDate ? new Date(customer.nextInvoiceDate) : null,
        billingAddressLine1: customer.billingAddressLine1 || "",
        billingAddressLine2: customer.billingAddressLine2 || "",
        billingCity: customer.billingCity || "",
        billingState: customer.billingState || "",
        billingPostcode: customer.billingPostcode || "",
        billingCountry: customer.billingCountry || ""
      });
    }
  }, [isNew, customer]);

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading...</div>;

  if (!customer && !isNew) {
    return (
      <Card>
        <CardHeader><CardTitle>Customer not found</CardTitle></CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => navigate("/customers")}>Back to customers</Button>
        </CardContent>
      </Card>
    );
  }

  const displayName = isNew ? "New Customer" : (customer.businessLegalName || "Unnamed Customer");

  const buildPayload = () => ({
    businessLegalName: form.businessLegalName || null,
    businessType: form.businessType || null,
    primaryEmail: form.primaryEmail || null,
    secondaryEmail: form.secondaryEmail || null,
    phone: form.phone || null,
    active: form.active,
    hasContract: form.hasContract,
    curveTerms: form.curveTerms,
    amendedTerms: form.amendedTerms,
    stage: form.stage || null,
    closeDate: form.closeDate ? form.closeDate.toISOString() : null,
    opportunityOwnerId: form.opportunityOwnerId || null,
    curveParentId: form.curveParentId || null,
    referrer: form.referrer || null,
    notes: form.notes || null,
    estimatedMonthlyServices: form.estimatedMonthlyServices !== "" ? parseFloat(form.estimatedMonthlyServices) : null,
    estimatedMonthlyServicesCurrency: form.estimatedMonthlyServicesCurrency || null,
    activationFee: form.activationFee !== "" ? parseFloat(form.activationFee) : null,
    activationFeeCurrency: form.activationFeeCurrency || null,
    estimatedAnnualNetRevenue: form.estimatedAnnualNetRevenue !== "" ? parseFloat(form.estimatedAnnualNetRevenue) : null,
    estimatedAnnualNetRevenueCurrency: form.estimatedAnnualNetRevenueCurrency || null,
    estimatedOnboardingFee: form.estimatedOnboardingFee !== "" ? parseFloat(form.estimatedOnboardingFee) : null,
    estimatedOnboardingFeeCurrency: form.estimatedOnboardingFeeCurrency || null,
    billingType: form.billingType || null,
    billingFrequency: form.billingFrequency || null,
    lastInvoiceDate: form.lastInvoiceDate ? form.lastInvoiceDate.toISOString() : null,
    nextInvoiceDate: form.nextInvoiceDate ? form.nextInvoiceDate.toISOString() : null,
    billingAddressLine1: form.billingAddressLine1 || null,
    billingAddressLine2: form.billingAddressLine2 || null,
    billingCity: form.billingCity || null,
    billingState: form.billingState || null,
    billingPostcode: form.billingPostcode || null,
    billingCountry: form.billingCountry || null
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => navigate("/customers")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          ← Customers
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
                    <AlertDialogTitle>Delete customer?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this customer. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await deleteCustomer.mutateAsync(customer.id);
                        toast({ title: "Customer deleted", description: "Customer has been removed." });
                        navigate("/customers");
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button type="submit" form="customer-detail-form" disabled={saving}>
              {saving ? <><Spinner className="h-3 w-3" />Saving...</> : "Save"}
            </Button>
          </div>
        )}
      </div>

      <Card>
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <CardHeader>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {!isNew && <TabsTrigger value="clients">Clients</TabsTrigger>}
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="support">Support Requests</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              {!isNew && <TabsTrigger value="logs">Logs</TabsTrigger>}
            </TabsList>
          </CardHeader>
          <CardContent>
            <form
              id="customer-detail-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setError("");
                try {
                  const payload = buildPayload();
                  if (isNew) {
                    const created = await createCustomer.mutateAsync(payload);
                    toast({ title: "Customer created", description: "Customer has been added." });
                    navigate(`/customers/${created.id}`);
                  } else {
                    await updateCustomer.mutateAsync({ id: customer.id, payload });
                    toast({ title: "Customer saved", description: "Changes have been saved." });
                  }
                } catch (err) {
                  setError(err.message || "Failed to save customer.");
                  toast({ title: "Save failed", description: "Unable to save customer.", variant: "destructive" });
                }
              }}
            >
              {/* Tab 1: Overview */}
              <TabsContent value="overview" className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="business-legal-name">Business Legal Name</Label>
                    <Input id="business-legal-name" value={form.businessLegalName} onChange={set("businessLegalName")} disabled={!canEdit} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="business-type">Business Type</Label>
                    <Input id="business-type" value={form.businessType} onChange={set("businessType")} disabled={!canEdit} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="primary-email">Primary Email</Label>
                    <Input id="primary-email" type="email" value={form.primaryEmail} onChange={set("primaryEmail")} disabled={!canEdit} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="secondary-email">Secondary Email</Label>
                    <Input id="secondary-email" type="email" value={form.secondaryEmail} onChange={set("secondaryEmail")} disabled={!canEdit} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={form.phone} onChange={set("phone")} disabled={!canEdit} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Stage</Label>
                    <Select value={form.stage} onValueChange={setVal("stage")} disabled={!canEdit}>
                      <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lead">Lead</SelectItem>
                        <SelectItem value="Prospect">Prospect</SelectItem>
                        <SelectItem value="Qualified">Qualified</SelectItem>
                        <SelectItem value="Proposal">Proposal</SelectItem>
                        <SelectItem value="Negotiation">Negotiation</SelectItem>
                        <SelectItem value="Closed Won">Closed Won</SelectItem>
                        <SelectItem value="Closed Lost">Closed Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Close Date</Label>
                    <DatePicker value={form.closeDate} onChange={setVal("closeDate")} disabled={!canEdit} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Opportunity Owner</Label>
                    <Select value={form.opportunityOwnerId} onValueChange={setVal("opportunityOwnerId")} disabled={!canEdit}>
                      <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                      <SelectContent>
                        {people.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="curve-parent-id">Curve Parent ID</Label>
                    <Input id="curve-parent-id" value={form.curveParentId} onChange={set("curveParentId")} disabled={!canEdit} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="referrer">Referrer</Label>
                    <Input id="referrer" value={form.referrer} onChange={set("referrer")} disabled={!canEdit} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <SwitchField label="Active" checked={form.active} onCheckedChange={setVal("active")} disabled={!canEdit} />
                  <SwitchField label="Has Contract" checked={form.hasContract} onCheckedChange={setVal("hasContract")} disabled={!canEdit} />
                  <SwitchField label="Curve Terms" checked={form.curveTerms} onCheckedChange={setVal("curveTerms")} disabled={!canEdit} />
                  <SwitchField label="Amended Terms" checked={form.amendedTerms} onCheckedChange={setVal("amendedTerms")} disabled={!canEdit} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    value={form.notes}
                    onChange={set("notes")}
                    disabled={!canEdit}
                    rows={8}
                    placeholder="Add notes..."
                    className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Tab 2: Clients */}
              <TabsContent value="clients" className="mt-4">
                {customerClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No clients linked to this customer.</p>
                ) : (
                  <div className="space-y-2">
                    {customerClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => navigate(`/clients/${client.id}`)}
                        className="flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm hover:bg-muted/50"
                      >
                        <span className="font-medium">{client.name}</span>
                        <span className="text-muted-foreground">{client.type || "—"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab 3: Products */}
              <TabsContent value="products" className="mt-4 space-y-4">
                {!isNew && (
                  <div className="space-y-3 rounded-lg border p-4">
                    <div>
                      <p className="text-sm font-medium">Products</p>
                      <p className="text-xs text-muted-foreground">Products tied to this customer.</p>
                    </div>

                    {productsLoading ? (
                      <p className="text-sm text-muted-foreground">Loading products...</p>
                    ) : products.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No products yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {products.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              setEditingProductId(product.id);
                              setProductError("");
                              setProductForm({
                                type: product.type || "",
                                recurring: product.recurring ?? false,
                                recurringPeriod: product.recurringPeriod || "",
                                dueDate: product.dueDate ? new Date(product.dueDate) : null,
                                closeDate: product.closeDate ? new Date(product.closeDate) : null,
                                stage: product.stage || "",
                                delivered: product.delivered ?? false,
                                ownerId: product.ownerId || "",
                                billingType: product.billingType || "",
                                amount: product.amount != null ? String(product.amount) : "",
                                currency: product.currency || "",
                                convertedAmount: product.convertedAmount != null ? String(product.convertedAmount) : "",
                                convertedCurrency: product.convertedCurrency || "",
                                hourlyRate: product.hourlyRate != null ? String(product.hourlyRate) : "",
                                hourlyRateCurrency: product.hourlyRateCurrency || "",
                                estimatedNetAnnualRevenue: product.estimatedNetAnnualRevenue != null ? String(product.estimatedNetAnnualRevenue) : "",
                                estimatedNetAnnualRevenueCurrency: product.estimatedNetAnnualRevenueCurrency || "",
                                calculatedAnnualNetRevenue: product.calculatedAnnualNetRevenue != null ? String(product.calculatedAnnualNetRevenue) : "",
                                calculatedAnnualNetRevenueCurrency: product.calculatedAnnualNetRevenueCurrency || "",
                                calculatedAnnualNetRevenueConveted: product.calculatedAnnualNetRevenueConveted != null ? String(product.calculatedAnnualNetRevenueConveted) : "",
                                calculatedAnnualNetRevenueConvetedCurrency: product.calculatedAnnualNetRevenueConvetedCurrency || "",
                                estimatedOnboardingFee: product.estimatedOnboardingFee != null ? String(product.estimatedOnboardingFee) : "",
                                estimatedOnboardingFeeCurrency: product.estimatedOnboardingFeeCurrency || "",
                                estimatedMonthlyServicesFee: product.estimatedMonthlyServicesFee != null ? String(product.estimatedMonthlyServicesFee) : "",
                                estimatedMonthlyServicesFeeCurrency: product.estimatedMonthlyServicesFeeCurrency || "",
                                productsCap: product.productsCap != null ? String(product.productsCap) : "",
                                contractsCap: product.contractsCap != null ? String(product.contractsCap) : "",
                                releasesCap: product.releasesCap != null ? String(product.releasesCap) : "",
                                tracksCap: product.tracksCap != null ? String(product.tracksCap) : "",
                                worksCap: product.worksCap != null ? String(product.worksCap) : "",
                                periodRecalculationsCap: product.periodRecalculationsCap != null ? String(product.periodRecalculationsCap) : "",
                                notes: product.notes || ""
                              });
                              setProductModalOpen(true);
                            }}
                            className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-left transition hover:bg-muted/40"
                          >
                            <div className="min-w-[180px]">
                              <p className="text-sm font-medium">{product.type}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.recurring ? "Recurring" : "One-time"}
                                {product.recurringPeriod ? ` • ${product.recurringPeriod}` : ""}
                                {product.billingType ? ` • ${product.billingType}` : ""}
                              </p>
                              {product.owner?.name && (
                                <p className="text-xs text-muted-foreground">Owner: {product.owner.name}</p>
                              )}
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              {formatMoney(product.amount, product.currency) || "No quote"}
                              {product.dueDate && (
                                <div>Due {new Date(product.dueDate).toLocaleDateString()}</div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Manage products</p>
                        <Button
                          type="button"
                          onClick={() => {
                            resetProductForm();
                            setProductModalOpen(true);
                          }}
                          disabled={!canEdit}
                        >
                          Add product
                        </Button>
                      </div>
                    </div>

                    <Dialog
                      open={productModalOpen}
                      onOpenChange={(open) => {
                        setProductModalOpen(open);
                        if (!open) resetProductForm();
                      }}
                    >
                      <DialogContent className="h-[90vh] overflow-y-auto sm:max-w-[90vw] top-[5%] translate-y-0 content-start">
                        <DialogHeader>
                          <DialogTitle>{editingProductId ? "Edit product" : "Add product"}</DialogTitle>
                          <DialogDescription>
                            {editingProductId ? "Update this product's details." : "Create a new product for this customer."}
                          </DialogDescription>
                        </DialogHeader>

                        <Tabs defaultValue="overview" className="w-full">
                          <TabsList>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="caps">Caps</TabsTrigger>
                            <TabsTrigger value="estimates">Estimates</TabsTrigger>
                            <TabsTrigger value="team">Team</TabsTrigger>
                          </TabsList>
                          <TabsContent value="overview" className="mt-4 space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="grid gap-2 sm:col-span-2">
                                <Label htmlFor="product-type">Type</Label>
                                <Select value={productForm.type} onValueChange={setProductVal("type")} disabled={!canEdit}>
                                  <SelectTrigger id="product-type"><SelectValue placeholder="Select product type" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="SaaS Masters">SaaS Masters</SelectItem>
                                    <SelectItem value="Saas Publishing">Saas Publishing</SelectItem>
                                    <SelectItem value="Saas Mechanicals">Saas Mechanicals</SelectItem>
                                    <SelectItem value="SaaS Distribution">SaaS Distribution</SelectItem>
                                    <SelectItem value="Services">Services</SelectItem>
                                    <SelectItem value="License Activation">License Activation</SelectItem>
                                    <SelectItem value="White Labelling">White Labelling</SelectItem>
                                    <SelectItem value="CWR Delivery">CWR Delivery</SelectItem>
                                    <SelectItem value="Payments">Payments</SelectItem>
                                    <SelectItem value="API">API</SelectItem>
                                    <SelectItem value="Distribution Overages Bundle">Distribution Overages Bundle</SelectItem>
                                    <SelectItem value="Masters Overages Bundle">Masters Overages Bundle</SelectItem>
                                    <SelectItem value="Publishing Overages Bundle">Publishing Overages Bundle</SelectItem>
                                    <SelectItem value="Mechanicals Overages Bundle">Mechanicals Overages Bundle</SelectItem>
                                    <SelectItem value="Sandbox">Sandbox</SelectItem>
                                    <SelectItem value="Onboarding">Onboarding</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>Billing Type</Label>
                                <Select value={productForm.billingType} onValueChange={setProductVal("billingType")} disabled={!canEdit}>
                                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Hourly">Hourly</SelectItem>
                                    <SelectItem value="Fixed">Fixed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>Owner</Label>
                                <Select value={productForm.ownerId || "__none__"} onValueChange={(v) => setProductVal("ownerId")(v === "__none__" ? "" : v)} disabled={!canEdit}>
                                  <SelectTrigger><SelectValue placeholder="Assign owner" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">None</SelectItem>
                                    {people.map((person) => (
                                      <SelectItem key={person.id} value={person.id}>
                                        {person.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>Amount</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={productForm.amount}
                                  onChange={setProduct("amount")}
                                  disabled={!canEdit}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Currency</Label>
                                <Select value={productForm.currency} onValueChange={setProductVal("currency")} disabled={!canEdit}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select currency" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                                    <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                                    <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                                    <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                                    <SelectItem value="SEK">SEK - Swedish Krona</SelectItem>
                                    <SelectItem value="NOK">NOK - Norwegian Krone</SelectItem>
                                    <SelectItem value="DKK">DKK - Danish Krone</SelectItem>
                                    <SelectItem value="NZD">NZD - New Zealand Dollar</SelectItem>
                                    <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                                    <SelectItem value="HKD">HKD - Hong Kong Dollar</SelectItem>
                                    <SelectItem value="MXN">MXN - Mexican Peso</SelectItem>
                                    <SelectItem value="BRL">BRL - Brazilian Real</SelectItem>
                                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                                    <SelectItem value="KRW">KRW - South Korean Won</SelectItem>
                                    <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                                    <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>Converted Amount</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={productForm.convertedAmount}
                                  onChange={setProduct("convertedAmount")}
                                  disabled={!canEdit}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Converted Currency</Label>
                                <Select value={productForm.convertedCurrency} onValueChange={setProductVal("convertedCurrency")} disabled={!canEdit}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select currency" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                                    <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                                    <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                                    <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                                    <SelectItem value="SEK">SEK - Swedish Krona</SelectItem>
                                    <SelectItem value="NOK">NOK - Norwegian Krone</SelectItem>
                                    <SelectItem value="DKK">DKK - Danish Krone</SelectItem>
                                    <SelectItem value="NZD">NZD - New Zealand Dollar</SelectItem>
                                    <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                                    <SelectItem value="HKD">HKD - Hong Kong Dollar</SelectItem>
                                    <SelectItem value="MXN">MXN - Mexican Peso</SelectItem>
                                    <SelectItem value="BRL">BRL - Brazilian Real</SelectItem>
                                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                                    <SelectItem value="KRW">KRW - South Korean Won</SelectItem>
                                    <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                                    <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>Hourly Rate</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={productForm.hourlyRate}
                                  onChange={setProduct("hourlyRate")}
                                  disabled={!canEdit}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Hourly Rate Currency</Label>
                                <Select value={productForm.hourlyRateCurrency} onValueChange={setProductVal("hourlyRateCurrency")} disabled={!canEdit}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select currency" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                                    <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                                    <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                                    <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                                    <SelectItem value="SEK">SEK - Swedish Krona</SelectItem>
                                    <SelectItem value="NOK">NOK - Norwegian Krone</SelectItem>
                                    <SelectItem value="DKK">DKK - Danish Krone</SelectItem>
                                    <SelectItem value="NZD">NZD - New Zealand Dollar</SelectItem>
                                    <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                                    <SelectItem value="HKD">HKD - Hong Kong Dollar</SelectItem>
                                    <SelectItem value="MXN">MXN - Mexican Peso</SelectItem>
                                    <SelectItem value="BRL">BRL - Brazilian Real</SelectItem>
                                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                                    <SelectItem value="KRW">KRW - South Korean Won</SelectItem>
                                    <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                                    <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <SwitchField
                                label="Recurring"
                                checked={productForm.recurring}
                                onCheckedChange={(checked) => setProductForm((prev) => ({ ...prev, recurring: checked }))}
                                disabled={!canEdit}
                              />
                              <SwitchField
                                label="Delivered"
                                checked={productForm.delivered}
                                onCheckedChange={(checked) => setProductForm((prev) => ({ ...prev, delivered: checked }))}
                                disabled={!canEdit}
                              />
                              <div className="grid gap-2">
                                <Label>Recurring Period</Label>
                                <Select
                                  value={productForm.recurringPeriod}
                                  onValueChange={setProductVal("recurringPeriod")}
                                  disabled={!canEdit || !productForm.recurring}
                                >
                                  <SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Monthly">Monthly</SelectItem>
                                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                                    <SelectItem value="Annually">Annually</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>Due Date</Label>
                                <DatePicker value={productForm.dueDate} onChange={setProductVal("dueDate")} disabled={!canEdit} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Close Date</Label>
                                <DatePicker value={productForm.closeDate} onChange={setProductVal("closeDate")} disabled={!canEdit} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Stage</Label>
                                <Select value={productForm.stage} onValueChange={setProductVal("stage")} disabled={!canEdit}>
                                  <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Lead">Lead</SelectItem>
                                    <SelectItem value="Prospect">Prospect</SelectItem>
                                    <SelectItem value="Qualified">Qualified</SelectItem>
                                    <SelectItem value="Proposal">Proposal</SelectItem>
                                    <SelectItem value="Negotiation">Negotiation</SelectItem>
                                    <SelectItem value="Closed Won">Closed Won</SelectItem>
                                    <SelectItem value="Closed Lost">Closed Lost</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="mt-3 grid gap-2">
                              <Label htmlFor="product-notes">Notes</Label>
                              <textarea
                                id="product-notes"
                                value={productForm.notes}
                                onChange={setProduct("notes")}
                                disabled={!canEdit}
                                rows={8}
                                placeholder="Add product notes..."
                                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                              />
                            </div>
                          </TabsContent>
                          <TabsContent value="caps" className="mt-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="grid gap-2">
                                <Label>Products Cap</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={productForm.productsCap}
                                  onChange={setProduct("productsCap")}
                                  disabled={!canEdit}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Contracts Cap</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={productForm.contractsCap}
                                  onChange={setProduct("contractsCap")}
                                  disabled={!canEdit}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Releases Cap</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={productForm.releasesCap}
                                  onChange={setProduct("releasesCap")}
                                  disabled={!canEdit}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Tracks Cap</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={productForm.tracksCap}
                                  onChange={setProduct("tracksCap")}
                                  disabled={!canEdit}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Works Cap</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={productForm.worksCap}
                                  onChange={setProduct("worksCap")}
                                  disabled={!canEdit}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Monthly Period Runs</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={productForm.periodRecalculationsCap}
                                  onChange={setProduct("periodRecalculationsCap")}
                                  disabled={!canEdit}
                                />
                              </div>
                            </div>
                          </TabsContent>
                          <TabsContent value="estimates" className="mt-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="grid gap-2">
                                <Label>Est. Net Annual Revenue</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={productForm.estimatedNetAnnualRevenue}
                                  onChange={setProduct("estimatedNetAnnualRevenue")}
                                  disabled={!canEdit}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Est. Net Annual Revenue Currency</Label>
                                <Select value={productForm.estimatedNetAnnualRevenueCurrency} onValueChange={setProductVal("estimatedNetAnnualRevenueCurrency")} disabled={!canEdit}>
                                  <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                                    <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                                    <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                                    <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                                    <SelectItem value="SEK">SEK - Swedish Krona</SelectItem>
                                    <SelectItem value="NOK">NOK - Norwegian Krone</SelectItem>
                                    <SelectItem value="DKK">DKK - Danish Krone</SelectItem>
                                    <SelectItem value="NZD">NZD - New Zealand Dollar</SelectItem>
                                    <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                                    <SelectItem value="HKD">HKD - Hong Kong Dollar</SelectItem>
                                    <SelectItem value="MXN">MXN - Mexican Peso</SelectItem>
                                    <SelectItem value="BRL">BRL - Brazilian Real</SelectItem>
                                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                                    <SelectItem value="KRW">KRW - South Korean Won</SelectItem>
                                    <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                                    <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>Calc. Annual Net Revenue</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={productForm.calculatedAnnualNetRevenue}
                                  onChange={setProduct("calculatedAnnualNetRevenue")}
                                  disabled={!canEdit}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Calc. Annual Net Revenue Currency</Label>
                                <Select value={productForm.calculatedAnnualNetRevenueCurrency} onValueChange={setProductVal("calculatedAnnualNetRevenueCurrency")} disabled={!canEdit}>
                                  <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                                    <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                                    <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                                    <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                                    <SelectItem value="SEK">SEK - Swedish Krona</SelectItem>
                                    <SelectItem value="NOK">NOK - Norwegian Krone</SelectItem>
                                    <SelectItem value="DKK">DKK - Danish Krone</SelectItem>
                                    <SelectItem value="NZD">NZD - New Zealand Dollar</SelectItem>
                                    <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                                    <SelectItem value="HKD">HKD - Hong Kong Dollar</SelectItem>
                                    <SelectItem value="MXN">MXN - Mexican Peso</SelectItem>
                                    <SelectItem value="BRL">BRL - Brazilian Real</SelectItem>
                                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                                    <SelectItem value="KRW">KRW - South Korean Won</SelectItem>
                                    <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                                    <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>Calc. Annual Net Revenue Converted</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={productForm.calculatedAnnualNetRevenueConveted}
                                  onChange={setProduct("calculatedAnnualNetRevenueConveted")}
                                  disabled={!canEdit}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Calc. Annual Net Revenue Converted Currency</Label>
                                <Select value={productForm.calculatedAnnualNetRevenueConvetedCurrency} onValueChange={setProductVal("calculatedAnnualNetRevenueConvetedCurrency")} disabled={!canEdit}>
                                  <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                                    <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                                    <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                                    <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                                    <SelectItem value="SEK">SEK - Swedish Krona</SelectItem>
                                    <SelectItem value="NOK">NOK - Norwegian Krone</SelectItem>
                                    <SelectItem value="DKK">DKK - Danish Krone</SelectItem>
                                    <SelectItem value="NZD">NZD - New Zealand Dollar</SelectItem>
                                    <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                                    <SelectItem value="HKD">HKD - Hong Kong Dollar</SelectItem>
                                    <SelectItem value="MXN">MXN - Mexican Peso</SelectItem>
                                    <SelectItem value="BRL">BRL - Brazilian Real</SelectItem>
                                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                                    <SelectItem value="KRW">KRW - South Korean Won</SelectItem>
                                    <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                                    <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>Est. Onboarding Fee</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={productForm.estimatedOnboardingFee}
                                  onChange={setProduct("estimatedOnboardingFee")}
                                  disabled={!canEdit}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Est. Onboarding Fee Currency</Label>
                                <Select value={productForm.estimatedOnboardingFeeCurrency} onValueChange={setProductVal("estimatedOnboardingFeeCurrency")} disabled={!canEdit}>
                                  <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                                    <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                                    <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                                    <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                                    <SelectItem value="SEK">SEK - Swedish Krona</SelectItem>
                                    <SelectItem value="NOK">NOK - Norwegian Krone</SelectItem>
                                    <SelectItem value="DKK">DKK - Danish Krone</SelectItem>
                                    <SelectItem value="NZD">NZD - New Zealand Dollar</SelectItem>
                                    <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                                    <SelectItem value="HKD">HKD - Hong Kong Dollar</SelectItem>
                                    <SelectItem value="MXN">MXN - Mexican Peso</SelectItem>
                                    <SelectItem value="BRL">BRL - Brazilian Real</SelectItem>
                                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                                    <SelectItem value="KRW">KRW - South Korean Won</SelectItem>
                                    <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                                    <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>Est. Monthly Services Fee</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={productForm.estimatedMonthlyServicesFee}
                                  onChange={setProduct("estimatedMonthlyServicesFee")}
                                  disabled={!canEdit}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Est. Monthly Services Fee Currency</Label>
                                <Select value={productForm.estimatedMonthlyServicesFeeCurrency} onValueChange={setProductVal("estimatedMonthlyServicesFeeCurrency")} disabled={!canEdit}>
                                  <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                                    <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                                    <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                                    <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                                    <SelectItem value="SEK">SEK - Swedish Krona</SelectItem>
                                    <SelectItem value="NOK">NOK - Norwegian Krone</SelectItem>
                                    <SelectItem value="DKK">DKK - Danish Krone</SelectItem>
                                    <SelectItem value="NZD">NZD - New Zealand Dollar</SelectItem>
                                    <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                                    <SelectItem value="HKD">HKD - Hong Kong Dollar</SelectItem>
                                    <SelectItem value="MXN">MXN - Mexican Peso</SelectItem>
                                    <SelectItem value="BRL">BRL - Brazilian Real</SelectItem>
                                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                                    <SelectItem value="KRW">KRW - South Korean Won</SelectItem>
                                    <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                                    <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </TabsContent>
                          <TabsContent value="team" className="mt-4 space-y-4">
                            {editingProductId ? (
                              <>
                                {involvementsLoading ? (
                                  <p className="text-sm text-muted-foreground">Loading involvement...</p>
                                ) : involvements.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No team involvement yet.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {involvements.map((involvement) => (
                                      <div key={involvement.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                                        <div>
                                          <p className="text-sm font-medium">{involvement.person?.name || "Unknown person"}</p>
                                          {involvement.person?.department && (
                                            <p className="text-xs text-muted-foreground">{involvement.person.department}</p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <p className="text-sm text-muted-foreground">{Number(involvement.totalHours).toLocaleString()} hours</p>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={async () => {
                                              try {
                                                await deleteProductInvolvement.mutateAsync({ id: involvement.id, productId: editingProductId });
                                              } catch (err) {
                                                toast({ title: "Delete failed", description: "Unable to delete involvement.", variant: "destructive" });
                                              }
                                            }}
                                            disabled={!canEdit || deleteProductInvolvement.isPending}
                                          >
                                            Delete
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="rounded-lg border p-4">
                                  <p className="text-sm font-medium">Add involvement</p>
                                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                      <Label>Person</Label>
                                      <Select
                                        value={involvementForm.personId || "__none__"}
                                        onValueChange={(v) => setInvolvementVal("personId")(v === "__none__" ? "" : v)}
                                        disabled={!canEdit}
                                      >
                                        <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="__none__">Select person</SelectItem>
                                          {people.map((person) => (
                                            <SelectItem key={person.id} value={person.id}>
                                              {person.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="grid gap-2">
                                      <Label>Total Hours</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.25"
                                        placeholder="0"
                                        value={involvementForm.totalHours}
                                        onChange={setInvolvement("totalHours")}
                                        disabled={!canEdit}
                                      />
                                    </div>
                                  </div>

                                  {involvementError && (
                                    <Alert variant="destructive" className="mt-3">
                                      <AlertTitle>Error</AlertTitle>
                                      <AlertDescription>{involvementError}</AlertDescription>
                                    </Alert>
                                  )}

                                  <div className="mt-3 flex justify-end">
                                    <Button
                                      type="button"
                                      onClick={async () => {
                                        if (!involvementForm.personId) {
                                          setInvolvementError("Person is required.");
                                          return;
                                        }
                                        if (involvementForm.totalHours === "") {
                                          setInvolvementError("Total hours is required.");
                                          return;
                                        }
                                        setInvolvementError("");
                                        try {
                                          await createProductInvolvement.mutateAsync({
                                            productId: editingProductId,
                                            personId: involvementForm.personId,
                                            totalHours: parseFloat(involvementForm.totalHours)
                                          });
                                          setInvolvementForm({ personId: "", totalHours: "" });
                                          toast({ title: "Involvement added", description: "Team involvement has been recorded." });
                                        } catch (err) {
                                          setInvolvementError(err.message || "Failed to add involvement.");
                                          toast({ title: "Create failed", description: "Unable to add involvement.", variant: "destructive" });
                                        }
                                      }}
                                      disabled={!canEdit || createProductInvolvement.isPending}
                                    >
                                      {createProductInvolvement.isPending ? <><Spinner className="h-3 w-3" />Saving...</> : "Add involvement"}
                                    </Button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground">Save the product first to add team involvement.</p>
                            )}
                          </TabsContent>
                        </Tabs>

                        {productError && (
                          <Alert variant="destructive" className="mt-3">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{productError}</AlertDescription>
                          </Alert>
                        )}

                        <DialogFooter className="mt-3 flex items-center justify-between">
                          <Button type="button" variant="ghost" onClick={() => setProductModalOpen(false)}>
                            Cancel
                          </Button>
                          <div className="flex items-center gap-2">
                            {editingProductId && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button type="button" variant="destructive" disabled={!canEdit || deleteProduct.isPending}>
                                    {deleteProduct.isPending ? <Spinner className="h-3 w-3" /> : null}
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete product?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete this product. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={async () => {
                                        try {
                                          await deleteProduct.mutateAsync({ id: editingProductId, customerId: customer.id });
                                          setProductModalOpen(false);
                                          toast({ title: "Product deleted", description: "Product has been removed." });
                                        } catch (err) {
                                          setProductError(err.message || "Failed to delete product.");
                                          toast({ title: "Delete failed", description: "Unable to delete product.", variant: "destructive" });
                                        }
                                      }}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            <Button
                              type="button"
                              onClick={async () => {
                                if (!productForm.type.trim()) {
                                  setProductError("Product type is required.");
                                  return;
                                }
                                setProductError("");
                                try {
                                  const payload = {
                                    customerId: customer.id,
                                    type: productForm.type.trim(),
                                    billingType: productForm.billingType || null,
                                    recurring: productForm.recurring,
                                    recurringPeriod: productForm.recurring ? (productForm.recurringPeriod || null) : null,
                                    dueDate: productForm.dueDate ? productForm.dueDate.toISOString() : null,
                                    closeDate: productForm.closeDate ? productForm.closeDate.toISOString() : null,
                                    stage: productForm.stage || null,
                                    delivered: productForm.delivered,
                                    ownerId: productForm.ownerId || null,
                                    amount: productForm.amount !== "" ? parseFloat(productForm.amount) : null,
                                    currency: productForm.currency || null,
                                    convertedAmount: productForm.convertedAmount !== "" ? parseFloat(productForm.convertedAmount) : null,
                                    convertedCurrency: productForm.convertedCurrency || null,
                                    hourlyRate: productForm.hourlyRate !== "" ? parseFloat(productForm.hourlyRate) : null,
                                    hourlyRateCurrency: productForm.hourlyRateCurrency || null,
                                    estimatedNetAnnualRevenue: productForm.estimatedNetAnnualRevenue !== "" ? parseFloat(productForm.estimatedNetAnnualRevenue) : null,
                                    estimatedNetAnnualRevenueCurrency: productForm.estimatedNetAnnualRevenueCurrency || null,
                                    calculatedAnnualNetRevenue: productForm.calculatedAnnualNetRevenue !== "" ? parseFloat(productForm.calculatedAnnualNetRevenue) : null,
                                    calculatedAnnualNetRevenueCurrency: productForm.calculatedAnnualNetRevenueCurrency || null,
                                    calculatedAnnualNetRevenueConveted: productForm.calculatedAnnualNetRevenueConveted !== "" ? parseFloat(productForm.calculatedAnnualNetRevenueConveted) : null,
                                    calculatedAnnualNetRevenueConvetedCurrency: productForm.calculatedAnnualNetRevenueConvetedCurrency || null,
                                    estimatedOnboardingFee: productForm.estimatedOnboardingFee !== "" ? parseFloat(productForm.estimatedOnboardingFee) : null,
                                    estimatedOnboardingFeeCurrency: productForm.estimatedOnboardingFeeCurrency || null,
                                    estimatedMonthlyServicesFee: productForm.estimatedMonthlyServicesFee !== "" ? parseFloat(productForm.estimatedMonthlyServicesFee) : null,
                                    estimatedMonthlyServicesFeeCurrency: productForm.estimatedMonthlyServicesFeeCurrency || null,
                                    productsCap: productForm.productsCap !== "" ? parseInt(productForm.productsCap, 10) : null,
                                    contractsCap: productForm.contractsCap !== "" ? parseInt(productForm.contractsCap, 10) : null,
                                    releasesCap: productForm.releasesCap !== "" ? parseInt(productForm.releasesCap, 10) : null,
                                    tracksCap: productForm.tracksCap !== "" ? parseInt(productForm.tracksCap, 10) : null,
                                    worksCap: productForm.worksCap !== "" ? parseInt(productForm.worksCap, 10) : null,
                                    periodRecalculationsCap: productForm.periodRecalculationsCap !== "" ? parseInt(productForm.periodRecalculationsCap, 10) : null,
                                    notes: productForm.notes || null
                                  };
                                  if (editingProductId) {
                                    await updateProduct.mutateAsync({ id: editingProductId, payload });
                                  } else {
                                    await createProduct.mutateAsync(payload);
                                  }
                                  setProductModalOpen(false);
                                  toast({
                                    title: editingProductId ? "Product updated" : "Product added",
                                    description: editingProductId ? "Product has been updated." : "Product has been created."
                                  });
                                } catch (err) {
                                  setProductError(err.message || "Failed to save product.");
                                  toast({ title: "Save failed", description: "Unable to save product.", variant: "destructive" });
                                }
                              }}
                              disabled={!canEdit || createProduct.isPending || updateProduct.isPending}
                            >
                              {(createProduct.isPending || updateProduct.isPending)
                                ? <><Spinner className="h-3 w-3" />Saving...</>
                                : (editingProductId ? "Update product" : "Add product")}
                            </Button>
                          </div>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

              </TabsContent>

              {/* Tab 3: Billing */}
              <TabsContent value="billing" className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Billing Type</Label>
                    <Select value={form.billingType} onValueChange={setVal("billingType")} disabled={!canEdit}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Invoice">Invoice</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Billing Frequency</Label>
                    <Select value={form.billingFrequency} onValueChange={setVal("billingFrequency")} disabled={!canEdit}>
                      <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                        <SelectItem value="Annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Last Invoice Date</Label>
                    <DatePicker value={form.lastInvoiceDate} onChange={setVal("lastInvoiceDate")} disabled={!canEdit} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Next Invoice Date</Label>
                    <DatePicker value={form.nextInvoiceDate} onChange={setVal("nextInvoiceDate")} disabled={!canEdit} />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="billing-line1">Address Line 1</Label>
                    <Input id="billing-line1" value={form.billingAddressLine1} onChange={set("billingAddressLine1")} disabled={!canEdit} />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="billing-line2">Address Line 2</Label>
                    <Input id="billing-line2" value={form.billingAddressLine2} onChange={set("billingAddressLine2")} disabled={!canEdit} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="billing-city">City</Label>
                    <Input id="billing-city" value={form.billingCity} onChange={set("billingCity")} disabled={!canEdit} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="billing-state">State</Label>
                    <Input id="billing-state" value={form.billingState} onChange={set("billingState")} disabled={!canEdit} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="billing-postcode">Postcode</Label>
                    <Input id="billing-postcode" value={form.billingPostcode} onChange={set("billingPostcode")} disabled={!canEdit} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="billing-country">Country</Label>
                    <Input id="billing-country" value={form.billingCountry} onChange={set("billingCountry")} disabled={!canEdit} />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="support" className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">No support requests yet.</p>
              </TabsContent>

              <TabsContent value="invoices" className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">No invoices yet.</p>
              </TabsContent>
            </form>

            {/* Logs tab — outside the form */}
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
