import { db, initDb } from "../src/lib/db";
import { companies, jobs, matches, syncLogs } from "../src/lib/db/schema";
import { syncCompany } from "../src/lib/ingestion/sync-service";
import { eq, desc } from "drizzle-orm";

async function main() {
  console.log("Testing sync for selected companies...");
  initDb();

  // Test PostHog (Ashby)
  const posthog = db.select().from(companies).where(eq(companies.id, "posthog")).get();
  if (posthog) {
    console.log("\n--- Syncing PostHog (Ashby) ---");
    const res = await syncCompany(posthog);
    console.log("Result:", res);
  }

  // Test Sezzle (Greenhouse)
  const sezzle = db.select().from(companies).where(eq(companies.id, "sezzle")).get();
  if (sezzle) {
    console.log("\n--- Syncing Sezzle (Greenhouse) ---");
    const res = await syncCompany(sezzle);
    console.log("Result:", res);
  }

  // Test Kinsta (Lever)
  const kinsta = db.select().from(companies).where(eq(companies.id, "kinsta")).get();
  if (kinsta) {
    console.log("\n--- Syncing Kinsta (Lever) ---");
    const res = await syncCompany(kinsta);
    console.log("Result:", res);
  }

  // Inspect jobs count
  const allJobs = db.select().from(jobs).all();
  console.log(`\nTotal jobs in database: ${allJobs.length}`);

  // Inspect top matches
  const topMatches = db
    .select({
      title: jobs.jobTitle,
      company: jobs.companyName,
      score: matches.matchScore,
      exp: jobs.experienceClassification,
      loc: jobs.location,
      salary: jobs.salaryFormatted,
      explanation: matches.matchExplanation,
    })
    .from(matches)
    .innerJoin(jobs, eq(matches.jobId, jobs.id))
    .orderBy(desc(matches.matchScore))
    .limit(5)
    .all();

  console.log("\nTop 5 Matched Jobs:");
  console.log(JSON.stringify(topMatches, null, 2));
}

main().catch(console.error);

