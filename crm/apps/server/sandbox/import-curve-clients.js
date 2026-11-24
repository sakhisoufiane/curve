const { PrismaClient } = require("@prisma/client");
const { z } = require("zod");
require("dotenv").config();

const prisma = new PrismaClient();

const clients = [];

const clientSchema = z.object({
  name: z.string().min(1),
  curveId: z.string().nullable().optional(),
  curveParentId: z.string().nullable().optional(),
  paymentTier: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  type: z.enum(["Label", "Publisher", "Distributor"]).nullable().optional(),
  active: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

const importClients = async () => {
  for (const client of clients) {
    const parsed = clientSchema.safeParse({
      name: client.name,
      curveId: client._id.$oid,
      curveParentId: client.parentId,
      paymentTier: client.paymentTier,
      type: client.clientType,
      active: true,
    });


    if (!parsed.success) console.log("Failed parsing client ", client);

    await prisma.client.create({
      data: parsed.data,
    });
  }
};

importClients().then(() => console.log("Done"));
