import { prisma } from "./prisma";

const DEFAULTS: Record<string, string> = {
  app_name: "Digital Learning Library",
  registration_fee_kobo: "100000", // ₦1,000
  currency: "NGN",
  contact_email: "support@example.com",
  footer_text: "© Digital Learning Library. All rights reserved.",
  maintenance_mode: "false",
};

export async function getSetting(key: string): Promise<string> {
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  return row?.value ?? DEFAULTS[key] ?? "";
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await prisma.siteSetting.findMany();
  const map: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) map[row.key] = row.value;
  return map;
}

export async function setSetting(key: string, value: string) {
  await prisma.siteSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
