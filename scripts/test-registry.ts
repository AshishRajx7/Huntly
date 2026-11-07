import { seedCompanies, getAllCompanies, detectAtsFromUrl } from "../src/lib/companies/registry";

async function main() {
  console.log("Seeding companies...");
  const inserted = await seedCompanies();
  const all = await getAllCompanies();
  console.log(`Seeded: ${inserted}, Total Companies in DB: ${all.length}`);

  console.log("Testing ATS detection:");
  console.log(" - Ashby:", detectAtsFromUrl("https://jobs.ashbyhq.com/posthog"));
  console.log(" - Greenhouse:", detectAtsFromUrl("https://boards.greenhouse.io/stripe"));
  console.log(" - Lever:", detectAtsFromUrl("https://jobs.lever.co/kinsta"));

  process.exit(0);
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

