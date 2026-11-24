const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { z } = require("zod");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const prisma = new PrismaClient();
const app = express();

const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_requests" }
});

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error("Missing JWT_SECRET in environment.");
  process.exit(1);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum(["Admin", "Editor", "Viewer"]).default("Viewer")
});

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: "7d" });
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing_token" });
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "forbidden" });
    }
    return next();
  };
}

app.post("/api/auth/login", loginLimiter, async (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return res.status(401).json({ error: "invalid_credentials" });
  }
  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "invalid_credentials" });
  }
  await prisma.userActivityLog.create({
    data: {
      userId: user.id,
      action: "login",
      meta: { ip: req.ip || null }
    }
  });
  const token = signToken(user);
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user) return res.status(404).json({ error: "not_found" });
  res.json({ id: user.id, email: user.email, role: user.role });
});

app.use("/api", authMiddleware);

app.get("/api/users", requireRole("Admin"), async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, role: true, createdAt: true, updatedAt: true }
  });
  res.json(users);
});

app.get("/api/users/:id", requireRole("Admin"), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, email: true, role: true, createdAt: true, updatedAt: true }
  });
  if (!user) return res.status(404).json({ error: "not_found" });
  res.json(user);
});

app.post("/api/users", requireRole("Admin"), async (req, res) => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (!parsed.data.password) {
    return res.status(400).json({ error: "password_required" });
  }
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return res.status(409).json({ error: "email_in_use" });
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: { email: parsed.data.email, passwordHash, role: parsed.data.role }
  });
  res.status(201).json({ id: user.id, email: user.email, role: user.role });
});

app.put("/api/users/:id", requireRole("Admin"), async (req, res) => {
  const parsed = userSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const data = { ...parsed.data };
  if (data.password) {
    data.passwordHash = await bcrypt.hash(data.password, 10);
    delete data.password;
  } else {
    delete data.password;
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data
  });
  res.json({ id: updated.id, email: updated.email, role: updated.role });
});

app.delete("/api/users/:id", requireRole("Admin"), async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

const clientSchema = z.object({
  name: z.string().min(1),
  curveId: z.string().nullable().optional(),
  curveParentId: z.string().nullable().optional(),
  paymentTier: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  type: z.enum(["Label", "Publisher", "Distributor"]).nullable().optional(),
  active: z.boolean().optional(),
  notes: z.string().nullable().optional()
});

const clientInclude = {
  customer: { select: { id: true, businessLegalName: true } }
};

app.get("/api/clients", authMiddleware, async (_req, res) => {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: clientInclude
  });
  res.json(clients);
});

app.get("/api/clients/:id", authMiddleware, async (req, res) => {
  const client = await prisma.client.findUnique({
    where: { id: req.params.id },
    include: clientInclude
  });
  if (!client) return res.status(404).json({ error: "not_found" });
  res.json(client);
});

app.post("/api/clients", requireRole("Admin", "Editor"), async (req, res) => {
  const parsed = clientSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const created = await prisma.client.create({
    data: parsed.data,
    include: clientInclude
  });
  await prisma.clientLog.create({
    data: { clientId: created.id, userId: req.user.sub, action: "create", changes: { after: created } }
  });
  res.status(201).json(created);
});

app.put("/api/clients/:id", requireRole("Admin", "Editor"), async (req, res) => {
  const parsed = clientSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  const updated = await prisma.client.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: clientInclude
  });
  await prisma.clientLog.create({
    data: { clientId: updated.id, userId: req.user.sub, action: "update", changes: { before: existing, after: updated } }
  });
  res.json(updated);
});

app.delete("/api/clients/:id", requireRole("Admin", "Editor"), async (req, res) => {
  const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  await prisma.clientLog.create({
    data: {
      clientId: existing.id,
      userId: req.user.sub,
      action: "delete",
      changes: { before: existing }
    }
  });
  await prisma.client.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

app.get("/api/clients/:id/logs", authMiddleware, async (req, res) => {
  const logs = await prisma.clientLog.findMany({
    where: { clientId: req.params.id },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { email: true } } }
  });
  res.json(logs);
});

app.get("/api/users/:id/logs", requireRole("Admin"), async (req, res) => {
  const clientLogs = await prisma.clientLog.findMany({
    where: { userId: req.params.id },
    orderBy: { createdAt: "desc" },
    include: { client: { select: { id: true, name: true } } }
  });
  const activityLogs = await prisma.userActivityLog.findMany({
    where: { userId: req.params.id },
    orderBy: { createdAt: "desc" }
  });
  const combined = [
    ...clientLogs.map((log) => ({ type: "client", ...log })),
    ...activityLogs.map((log) => ({ type: "activity", ...log }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(combined);
});

const customerSchema = z.object({
  active: z.boolean().optional(),
  estimatedMonthlyServices: z.number().min(0).nullable().optional(),
  estimatedMonthlyServicesCurrency: z.string().nullable().optional(),
  activationFee: z.number().min(0).nullable().optional(),
  activationFeeCurrency: z.string().nullable().optional(),
  estimatedAnnualNetRevenue: z.number().min(0).nullable().optional(),
  estimatedAnnualNetRevenueCurrency: z.string().nullable().optional(),
  estimatedOnboardingFee: z.number().min(0).nullable().optional(),
  estimatedOnboardingFeeCurrency: z.string().nullable().optional(),
  stage: z.string().nullable().optional(),
  closeDate: z.string().datetime().nullable().optional(),
  opportunityOwnerId: z.string().nullable().optional(),
  hasContract: z.boolean().optional(),
  curveTerms: z.boolean().optional(),
  amendedTerms: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  primaryEmail: z.string().email().nullable().optional(),
  secondaryEmail: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  businessLegalName: z.string().nullable().optional(),
  businessType: z.string().nullable().optional(),
  taxCode: z.string().nullable().optional(),
  billingAddressLine1: z.string().nullable().optional(),
  billingAddressLine2: z.string().nullable().optional(),
  billingCity: z.string().nullable().optional(),
  billingState: z.string().nullable().optional(),
  billingPostcode: z.string().nullable().optional(),
  billingCountry: z.string().nullable().optional(),
  billingType: z.string().nullable().optional(),
  billingFrequency: z.string().nullable().optional(),
  lastInvoiceDate: z.string().datetime().nullable().optional(),
  nextInvoiceDate: z.string().datetime().nullable().optional(),
  curveParentId: z.string().nullable().optional(),
  referrer: z.string().nullable().optional()
});

app.get("/api/customers", authMiddleware, async (_req, res) => {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: { opportunityOwner: { select: { id: true, name: true } } }
  });
  res.json(customers);
});

app.get("/api/customers/:id", authMiddleware, async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: { opportunityOwner: { select: { id: true, name: true } } }
  });
  if (!customer) return res.status(404).json({ error: "not_found" });
  res.json(customer);
});

app.post("/api/customers", requireRole("Admin", "Editor"), async (req, res) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = {
    ...parsed.data,
    closeDate: parsed.data.closeDate ? new Date(parsed.data.closeDate) : null,
    lastInvoiceDate: parsed.data.lastInvoiceDate ? new Date(parsed.data.lastInvoiceDate) : null,
    nextInvoiceDate: parsed.data.nextInvoiceDate ? new Date(parsed.data.nextInvoiceDate) : null
  };
  const created = await prisma.customer.create({ data });
  await prisma.customerLog.create({
    data: {
      customerId: created.id,
      userId: req.user.sub,
      action: "create",
      changes: { after: created }
    }
  });
  res.status(201).json(created);
});

app.put("/api/customers/:id", requireRole("Admin", "Editor"), async (req, res) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  const data = {
    ...parsed.data,
    closeDate: parsed.data.closeDate ? new Date(parsed.data.closeDate) : null,
    lastInvoiceDate: parsed.data.lastInvoiceDate ? new Date(parsed.data.lastInvoiceDate) : null,
    nextInvoiceDate: parsed.data.nextInvoiceDate ? new Date(parsed.data.nextInvoiceDate) : null
  };
  const updated = await prisma.customer.update({ where: { id: req.params.id }, data });
  await prisma.customerLog.create({
    data: {
      customerId: updated.id,
      userId: req.user.sub,
      action: "update",
      changes: { before: existing, after: updated }
    }
  });
  res.json(updated);
});

app.delete("/api/customers/:id", requireRole("Admin", "Editor"), async (req, res) => {
  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  await prisma.customerLog.create({
    data: {
      customerId: existing.id,
      userId: req.user.sub,
      action: "delete",
      changes: { before: existing }
    }
  });
  await prisma.customer.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

app.get("/api/customers/:id/logs", authMiddleware, async (req, res) => {
  const logs = await prisma.customerLog.findMany({
    where: { customerId: req.params.id },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { email: true } } }
  });
  res.json(logs);
});

const productSchema = z.object({
  customerId: z.string().min(1),
  clientId: z.string().nullable().optional(),
  type: z.string().min(1),
  recurring: z.boolean().optional(),
  recurringPeriod: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  closeDate: z.string().datetime().nullable().optional(),
  stage: z.string().nullable().optional(),
  delivered: z.boolean().optional(),
  ownerId: z.string().nullable().optional(),
  billingType: z.string().nullable().optional(),
  amount: z.number().min(0).nullable().optional(),
  actualAmount: z.number().min(0).nullable().optional(),
  currency: z.string().nullable().optional(),
  convertedAmount: z.number().min(0).nullable().optional(),
  convertedCurrency: z.string().nullable().optional(),
  hourlyRate: z.number().min(0).nullable().optional(),
  hourlyRateCurrency: z.string().nullable().optional(),
  estimatedNetAnnualRevenue: z.number().min(0).nullable().optional(),
  estimatedNetAnnualRevenueCurrency: z.string().nullable().optional(),
  calculatedAnnualNetRevenue: z.number().min(0).nullable().optional(),
  calculatedAnnualNetRevenueCurrency: z.string().nullable().optional(),
  calculatedAnnualNetRevenueConveted: z.number().min(0).nullable().optional(),
  calculatedAnnualNetRevenueConvetedCurrency: z.string().nullable().optional(),
  estimatedOnboardingFee: z.number().min(0).nullable().optional(),
  estimatedOnboardingFeeCurrency: z.string().nullable().optional(),
  estimatedMonthlyServicesFee: z.number().min(0).nullable().optional(),
  estimatedMonthlyServicesFeeCurrency: z.string().nullable().optional(),
  productsCap: z.number().int().min(0).nullable().optional(),
  contractsCap: z.number().int().min(0).nullable().optional(),
  releasesCap: z.number().int().min(0).nullable().optional(),
  tracksCap: z.number().int().min(0).nullable().optional(),
  worksCap: z.number().int().min(0).nullable().optional(),
  periodRecalculationsCap: z.number().int().min(0).nullable().optional(),
  notes: z.string().nullable().optional()
});

app.get("/api/products", authMiddleware, async (req, res) => {
  const customerId = typeof req.query.customerId === "string" ? req.query.customerId : null;
  const clientId = typeof req.query.clientId === "string" ? req.query.clientId : null;
  const products = await prisma.product.findMany({
    where: clientId ? { clientId } : (customerId ? { customerId } : undefined),
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      customer: { select: { id: true, businessLegalName: true } }
    }
  });
  res.json(products);
});

app.post("/api/products", requireRole("Admin", "Editor"), async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = {
    ...parsed.data,
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    closeDate: parsed.data.closeDate ? new Date(parsed.data.closeDate) : null
  };
  const created = await prisma.product.create({
    data,
    include: {
      owner: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      customer: { select: { id: true, businessLegalName: true } }
    }
  });
  await prisma.customerLog.create({
    data: {
      customerId: created.customerId,
      userId: req.user.sub,
      action: "product_create",
      changes: { after: created }
    }
  });
  if (created.clientId) {
    await prisma.clientLog.create({
      data: {
        clientId: created.clientId,
        userId: req.user.sub,
        action: "product_create",
        changes: { after: created }
      }
    });
  }
  res.status(201).json(created);
});

app.put("/api/products/:id", requireRole("Admin", "Editor"), async (req, res) => {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  const data = { ...parsed.data };
  if (Object.prototype.hasOwnProperty.call(parsed.data, "dueDate")) {
    data.dueDate = parsed.data?.dueDate ? new Date(parsed.data.dueDate) : null;
  }
  if (Object.prototype.hasOwnProperty.call(parsed.data, "closeDate")) {
    data.closeDate = parsed.data?.closeDate ? new Date(parsed.data.closeDate) : null;
  }
  const updated = await prisma.product.update({
    where: { id: req.params.id },
    data,
    include: {
      owner: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      customer: { select: { id: true, businessLegalName: true } }
    }
  });
  await prisma.customerLog.create({
    data: {
      customerId: updated.customerId,
      userId: req.user.sub,
      action: "product_update",
      changes: { before: existing, after: updated }
    }
  });
  if (updated.clientId) {
    await prisma.clientLog.create({
      data: {
        clientId: updated.clientId,
        userId: req.user.sub,
        action: "product_update",
        changes: { before: existing, after: updated }
      }
    });
  }
  res.json(updated);
});

app.delete("/api/products/:id", requireRole("Admin", "Editor"), async (req, res) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  await prisma.customerLog.create({
    data: {
      customerId: existing.customerId,
      userId: req.user.sub,
      action: "product_delete",
      changes: { before: existing }
    }
  });
  if (existing.clientId) {
    await prisma.clientLog.create({
      data: {
        clientId: existing.clientId,
        userId: req.user.sub,
        action: "product_delete",
        changes: { before: existing }
      }
    });
  }
  await prisma.product.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

const peopleSchema = z.object({
  name: z.string().min(1),
  department: z.string().min(1),
  hourlyRate: z.number().min(0)
});

const productInvolvementSchema = z.object({
  productId: z.string().min(1),
  personId: z.string().min(1),
  totalHours: z.number().min(0)
});

app.get("/api/product-involvements", authMiddleware, async (req, res) => {
  const productId = typeof req.query.productId === "string" ? req.query.productId : null;
  const personId = typeof req.query.personId === "string" ? req.query.personId : null;
  if (!productId && !personId) return res.status(400).json({ error: "product_or_person_id_required" });
  const involvements = await prisma.productInvolvement.findMany({
    where: productId ? { productId } : { personId },
    orderBy: { createdAt: "desc" },
    include: {
      person: { select: { id: true, name: true, department: true } },
      product: {
        select: {
          id: true,
          type: true,
          customerId: true,
          clientId: true,
          customer: { select: { id: true, businessLegalName: true } },
          client: { select: { id: true, name: true } }
        }
      }
    }
  });
  res.json(involvements);
});

app.post("/api/product-involvements", requireRole("Admin", "Editor"), async (req, res) => {
  const parsed = productInvolvementSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const created = await prisma.productInvolvement.create({
    data: parsed.data,
    include: {
      person: { select: { id: true, name: true, department: true } },
      product: { select: { id: true, customerId: true, clientId: true } }
    }
  });
  await prisma.customerLog.create({
    data: {
      customerId: created.product.customerId,
      userId: req.user.sub,
      action: "product_involvement_create",
      changes: { after: created }
    }
  });
  if (created.product.clientId) {
    await prisma.clientLog.create({
      data: {
        clientId: created.product.clientId,
        userId: req.user.sub,
        action: "product_involvement_create",
        changes: { after: created }
      }
    });
  }
  res.status(201).json(created);
});

app.delete("/api/product-involvements/:id", requireRole("Admin", "Editor"), async (req, res) => {
  const existing = await prisma.productInvolvement.findUnique({
    where: { id: req.params.id },
    include: { product: { select: { id: true, customerId: true, clientId: true } } }
  });
  if (!existing) return res.status(404).json({ error: "not_found" });
  await prisma.customerLog.create({
    data: {
      customerId: existing.product.customerId,
      userId: req.user.sub,
      action: "product_involvement_delete",
      changes: { before: existing }
    }
  });
  if (existing.product.clientId) {
    await prisma.clientLog.create({
      data: {
        clientId: existing.product.clientId,
        userId: req.user.sub,
        action: "product_involvement_delete",
        changes: { before: existing }
      }
    });
  }
  await prisma.productInvolvement.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

app.put("/api/product-involvements/:id", requireRole("Admin", "Editor"), async (req, res) => {
  const parsed = productInvolvementSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const existing = await prisma.productInvolvement.findUnique({
    where: { id: req.params.id },
    include: { product: { select: { id: true, customerId: true, clientId: true } } }
  });
  if (!existing) return res.status(404).json({ error: "not_found" });
  const updated = await prisma.productInvolvement.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: {
      person: { select: { id: true, name: true, department: true } },
      product: { select: { id: true, customerId: true, clientId: true } }
    }
  });
  await prisma.customerLog.create({
    data: {
      customerId: updated.product.customerId,
      userId: req.user.sub,
      action: "product_involvement_update",
      changes: { before: existing, after: updated }
    }
  });
  await prisma.peopleLog.create({
    data: {
      personId: updated.personId,
      userId: req.user.sub,
      action: "product_involvement_update",
      changes: { before: existing, after: updated }
    }
  });
  if (updated.product.clientId) {
    await prisma.clientLog.create({
      data: {
        clientId: updated.product.clientId,
        userId: req.user.sub,
        action: "product_involvement_update",
        changes: { before: existing, after: updated }
      }
    });
  }
  res.json(updated);
});

app.get("/api/people", authMiddleware, async (_req, res) => {
  const people = await prisma.people.findMany({
    orderBy: { createdAt: "desc" }
  });
  res.json(people);
});

app.get("/api/people/:id", authMiddleware, async (req, res) => {
  const person = await prisma.people.findUnique({ where: { id: req.params.id } });
  if (!person) return res.status(404).json({ error: "not_found" });
  res.json(person);
});

app.post("/api/people", requireRole("Admin", "Editor"), async (req, res) => {
  const parsed = peopleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const created = await prisma.people.create({ data: parsed.data });
  await prisma.peopleLog.create({
    data: {
      personId: created.id,
      userId: req.user.sub,
      action: "create",
      changes: { after: created }
    }
  });
  res.status(201).json(created);
});

app.put("/api/people/:id", requireRole("Admin", "Editor"), async (req, res) => {
  const parsed = peopleSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const existing = await prisma.people.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  const updated = await prisma.people.update({
    where: { id: req.params.id },
    data: parsed.data
  });
  await prisma.peopleLog.create({
    data: {
      personId: updated.id,
      userId: req.user.sub,
      action: "update",
      changes: { before: existing, after: updated }
    }
  });
  res.json(updated);
});

app.delete("/api/people/:id", requireRole("Admin", "Editor"), async (req, res) => {
  const existing = await prisma.people.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  await prisma.peopleLog.create({
    data: {
      personId: existing.id,
      userId: req.user.sub,
      action: "delete",
      changes: { before: existing }
    }
  });
  await prisma.people.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

app.get("/api/people/:id/logs", authMiddleware, async (req, res) => {
  const logs = await prisma.peopleLog.findMany({
    where: { personId: req.params.id },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { email: true } } }
  });
  res.json(logs);
});

app.post("/api/activity", authMiddleware, async (req, res) => {
  const parsed = z
    .object({
      action: z.enum(["page_view", "logout"]),
      meta: z.object({ path: z.string().optional() }).optional()
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const created = await prisma.userActivityLog.create({
    data: {
      userId: req.user.sub,
      action: parsed.data.action,
      meta: parsed.data.meta || null
    }
  });
  res.status(201).json(created);
});

const port = process.env.PORT || 4000;
prisma
  .$connect()
  .then(() => {
    app.listen(port, () => {
      console.log(`CRM API running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
