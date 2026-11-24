const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

const customers = [];

const parseDecimal = (val) => {
  if (val === "" || val == null) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
};

const parseDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const importCustomers = async () => {
  for (const entry of customers) {
    // 1. Create customer
    const customer = await prisma.customer.create({
      data: {
        businessLegalName: entry.salesForceCustomer,
        billingCountry: entry.country,
        curveParentId: entry.curveParentId || null,
      },
    });

    console.log(`Created customer: ${customer.businessLegalName} (${customer.id})`);

    // 2. Link matching clients
    for (const c of entry.clients || []) {
      const existing = await prisma.client.findFirst({
        where: { curveId: c.curveClientId },
      });
      if (existing) {
        await prisma.client.update({
          where: { id: existing.id },
          data: { customerId: customer.id },
        });
        console.log(`  Linked client: ${existing.name}`);
      } else {
        console.log(`  Client not found for curveClientId: ${c.curveClientId}`);
      }
    }

    // 3. Create products
    for (const p of entry.products || []) {
      // Resolve opportunity owner
      let ownerId = null;
      if (p.opportunityOwner) {
        const person = await prisma.people.findFirst({
          where: { name: p.opportunityOwner },
        });
        if (person) {
          ownerId = person.id;
        } else {
          console.log(`  Person not found: ${p.opportunityOwner}`);
        }
      }

      const productData = {
        customerId: customer.id,
        type: p.name,
        contractsCap: p.contracts ? parseInt(p.contracts, 10) : null,
        productsCap: p.products ? parseInt(p.products, 10) : null,
        amount: parseDecimal(p.price),
        currency: p.currency || null,
        convertedAmount: parseDecimal(p.priceConverted),
        convertedCurrency: p.currencyConverted || null,
        recurring: true,
        recurringPeriod: p.billingCycle || null,
        stage: p.stage || null,
        closeDate: parseDate(p.closeDate),
        createdAt: parseDate(p.createdDate),
        ownerId,
        hourlyRate: parseDecimal(p.hourlyFee),
        hourlyRateCurrency: p.hourlyFeeCurrency || null,
        estimatedNetAnnualRevenue: parseDecimal(p.estimatedNetAnnualRevenue),
        estimatedNetAnnualRevenueCurrency: p.estimatedNetAnnualRevenueCurrency || null,
        calculatedAnnualNetRevenue: parseDecimal(p.calculatedAnnualNetRevenue),
        calculatedAnnualNetRevenueCurrency: p.calculatedAnnualNetRevenueCurrency || null,
        calculatedAnnualNetRevenueConveted: parseDecimal(p.calculatedAnnualNetRevenueConveted),
        calculatedAnnualNetRevenueConvetedCurrency: p.calculatedAnnualNetRevenueConvetedCurrency || null,
        estimatedOnboardingFee: parseDecimal(p.estimatedOnboardingFee),
        estimatedOnboardingFeeCurrency: p.estimatedOnboardingFeeCurrency || null,
        estimatedMonthlyServicesFee: parseDecimal(p.estimatedMonthlyServicesFee),
        estimatedMonthlyServicesFeeCurrency: p.estimatedMonthlyServicesFeeCurrency || null,
      };

      await prisma.product.create({ data: productData });
      console.log(`  Created product: ${p.name}`);

      // 4. Create activation fee product if present
      const activationFee = parseDecimal(p.activationFee);
      if (activationFee != null) {
        await prisma.product.create({
          data: {
            customerId: customer.id,
            type: "License Activation",
            amount: activationFee,
            currency: p.activationFeeCurrency || null,
            convertedAmount: parseDecimal(p.activationFeeConverted),
            convertedCurrency: p.activationFeeCurrencyConverted || null,
            createdAt: parseDate(p.createdDate),
            recurring: false,
            stage: p.stage || null,
          },
        });
        console.log(`  Created activation fee product for: ${p.name}`);
      }
    }
  }
};

importCustomers()
  .then(() => console.log("Done"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
