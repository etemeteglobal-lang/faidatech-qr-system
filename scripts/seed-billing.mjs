import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const plans = [
  { code: "starter_free_monthly_etb", name: "Starter / Free", billingInterval: "MONTHLY", currency: "ETB", priceMinor: 0, dynamicQrLimit: 5, scanLimit: 1000, teamSeatLimit: 1, customDomainLimit: 0, storageBytesLimit: 50n * 1024n * 1024n, featureFlags: { analytics: true, multilingual: true } },
  { code: "business_pro_monthly_etb", name: "Business / Pro", billingInterval: "MONTHLY", currency: "ETB", priceMinor: 49900, dynamicQrLimit: 100, scanLimit: 50000, teamSeatLimit: 5, customDomainLimit: 1, storageBytesLimit: 2n * 1024n * 1024n * 1024n, featureFlags: { analytics: true, multilingual: true, campaigns: true } },
  { code: "business_pro_yearly_etb", name: "Business / Pro", billingInterval: "YEARLY", currency: "ETB", priceMinor: 499000, dynamicQrLimit: 100, scanLimit: 600000, teamSeatLimit: 5, customDomainLimit: 1, storageBytesLimit: 2n * 1024n * 1024n * 1024n, featureFlags: { analytics: true, multilingual: true, campaigns: true } },
  { code: "business_pro_yearly_usd", name: "Business / Pro", billingInterval: "YEARLY", currency: "USD", priceMinor: 3900, dynamicQrLimit: 100, scanLimit: 600000, teamSeatLimit: 5, customDomainLimit: 1, storageBytesLimit: 2n * 1024n * 1024n * 1024n, featureFlags: { analytics: true, multilingual: true, campaigns: true } },
  { code: "enterprise_monthly_etb", name: "Enterprise", billingInterval: "MONTHLY", currency: "ETB", priceMinor: 0, dynamicQrLimit: 10000, scanLimit: 5000000, teamSeatLimit: 50, customDomainLimit: 5, storageBytesLimit: 50n * 1024n * 1024n * 1024n, featureFlags: { analytics: true, multilingual: true, campaigns: true, api: true, customDomains: true } },
  { code: "tourism_yearly_etb", name: "Tourism", billingInterval: "YEARLY", currency: "ETB", priceMinor: 0, dynamicQrLimit: 10000, scanLimit: 5000000, teamSeatLimit: 25, customDomainLimit: 3, storageBytesLimit: 50n * 1024n * 1024n * 1024n, featureFlags: { analytics: true, multilingual: true, audioGuides: true, api: true } },
];

try {
  for (const plan of plans) {
    await prisma.plan.upsert({ where: { code: plan.code }, create: plan, update: { ...plan, updatedAt: new Date() } });
  }
  console.log(`Billing plans ready: ${plans.length}`);
} finally {
  await prisma.$disconnect();
}
