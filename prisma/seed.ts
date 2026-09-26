import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ── Categories ──────────────────────────────────────────
  const categoryNames = [
    "Artificial Intelligence",
    "Online Business",
    "Making Money Online",
    "Technology",
    "Education",
    "Personal Development",
    "Entrepreneurship",
  ];
  const categories: Record<string, string> = {};
  for (const name of categoryNames) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, slug },
    });
    categories[name] = cat.id;
  }

  // ── Site settings ───────────────────────────────────────
  await prisma.siteSetting.upsert({
    where: { key: "app_name" },
    update: {},
    create: { key: "app_name", value: "Digital Learning Library" },
  });
  await prisma.siteSetting.upsert({
    where: { key: "registration_fee_kobo" },
    update: {},
    create: { key: "registration_fee_kobo", value: "100000" }, // ₦1,000
  });
  await prisma.siteSetting.upsert({
    where: { key: "currency" },
    update: {},
    create: { key: "currency", value: "NGN" },
  });

  // ── E-book #1: the actual uploaded PDF ──────────────────
  // File must already be copied to <PRIVATE_STORAGE_DIR>/ebooks/how-to-make-money-with-artificial-intelligence-ai.pdf
  await prisma.ebook.upsert({
    where: { slug: "how-to-make-money-with-artificial-intelligence-ai" },
    update: {},
    create: {
      title: "How to Make Money with Artificial Intelligence (AI)",
      slug: "how-to-make-money-with-artificial-intelligence-ai",
      author: "Bracken Talks",
      description:
        "A practical guide to understanding AI and turning it into income: identifying profitable AI opportunities, developing AI skills, monetizing AI solutions, leveraging existing AI platforms and tools, building AI startups, navigating ethical and legal considerations, and real-world case studies of people and companies making money with AI.",
      categoryId: categories["Artificial Intelligence"],
      fileStorageKey: "ebooks/how-to-make-money-with-artificial-intelligence-ai.pdf",
      pageCount: 36,
      isPremium: true,
      downloadEnabled: false,
      published: true,
      sortOrder: 1,
    },
  });

  // ── E-book #2: the second uploaded PDF ──────────────────
  // File must already be copied to <PRIVATE_STORAGE_DIR>/ebooks/50-ways-to-make-money-online.pdf
  await prisma.ebook.upsert({
    where: { slug: "50-ways-to-make-money-online" },
    update: {},
    create: {
      title: "Work From Home: 50 Ways to Make Money Online Analyzed",
      slug: "50-ways-to-make-money-online",
      author: "Unknown / Uploaded Source",
      description:
        "An analysis of 50 ways to earn income online, covering passive income, affiliate marketing, blogging, Airbnb, freelancing, dropshipping, eBay, YouTube, Shopify, photography, and more.",
      categoryId: categories["Making Money Online"],
      fileStorageKey: "ebooks/50-ways-to-make-money-online.pdf",
      pageCount: 345,
      isPremium: true,
      downloadEnabled: false,
      published: true,
      sortOrder: 2,
    },
  });

  // ── First admin account ──────────────────────────────────
  // We deliberately do NOT hardcode a real admin password here.
  // If ADMIN_EMAIL and ADMIN_PASSWORD are set in the environment when you
  // run `npm run seed`, we create that one account as ADMIN. Otherwise this
  // step is skipped — create your admin manually afterwards (see README:
  // "Creating the first admin").
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { email: adminEmail.toLowerCase() },
      update: { role: "ADMIN" },
      create: {
        fullName: "Admin",
        email: adminEmail.toLowerCase(),
        passwordHash,
        role: "ADMIN",
        hasPaidAccess: true,
      },
    });
    console.log(`Admin account ready: ${adminEmail}`);
  } else {
    console.log(
      "No ADMIN_EMAIL/ADMIN_PASSWORD set — skipped admin creation. See README: 'Creating the first admin'."
    );
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
