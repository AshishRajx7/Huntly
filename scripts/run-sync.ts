import { initDb, db } from "../src/lib/db";
import { seedCompanies } from "../src/lib/companies/registry";
import { syncAllCompanies } from "../src/lib/ingestion/sync-service";
import { jobs, matches } from "../src/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

async function main() {
  console.log("=== Huntly Ingestion & Sync Engine ===");
  initDb();

  // 1. Seed verified companies
  const seeded = await seedCompanies();
  if (seeded > 0) {
    console.log(`Seeded ${seeded} new companies into database.`);
  }

  // 2. Run sync
  console.log("Starting full synchronization across active ATS boards (concurrency = 5)...");
  const stats = await syncAllCompanies("manual", 5);

  console.log("\n--- Sync Summary ---");
  console.log(`Companies Scanned:  ${stats.companiesCount}`);
  console.log(`Successful Syncs:   ${stats.successfulSyncs}`);
  console.log(`Failed Syncs:       ${stats.failedSyncs}`);
  console.log(`Total Jobs Fetched: ${stats.jobsFetched}`);
  console.log(`New Jobs Ingested:  ${stats.newJobsCount}`);
  console.log(`Updated Jobs:       ${stats.updatedJobsCount}`);
  console.log(`Expired Jobs:       ${stats.expiredJobsCount}`);
  console.log(`Duration:           ${(stats.durationMs / 1000).toFixed(1)} seconds`);

  if (stats.errors.length > 0) {
    console.log("\n--- Errors Grouped by Cause ---");
    const grouped = new Map<string, string[]>();
    for (const e of stats.errors) {
      const cause = e.error.replace(/\s*\(HTTP \d+\)/, "").split(":")[0] || e.error;
      const list = grouped.get(cause) || [];
      list.push(e.companyId);
      grouped.set(cause, list);
    }
    grouped.forEach((companies, cause) => {
      console.log(`- ${cause} (${companies.length} companies): ${companies.join(", ")}`);
    });
  } else {
    console.log("\n--- Errors Grouped by Cause ---");
    console.log("No errors encountered across all companies.");
  }

  // 3. Display top candidate matches
  const topMatches = db
    .select({
      title: jobs.jobTitle,
      company: jobs.companyName,
      score: matches.matchScore,
      exp: jobs.experienceClassification,
      location: jobs.location,
      salary: jobs.salaryFormatted,
      explanation: matches.matchExplanation,
    })
    .from(matches)
    .innerJoin(jobs, eq(matches.jobId, jobs.id))
    .where(eq(jobs.status, "active"))
    .orderBy(desc(matches.matchScore))
    .limit(5)
    .all();

  // 4. Verify database counts
  const totalInDb = db.select({ count: sql<number>`count(*)` }).from(jobs).get();
  const activeInDb = db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.status, "active")).get();
  const expiredInDb = db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.status, "expired")).get();
  const matchesInDb = db.select({ count: sql<number>`count(*)` }).from(matches).get();

  console.log("--- Database Verification ---");
  console.log(`Total jobs stored in SQLite (huntly.db): ${totalInDb?.count || 0}`);
  console.log(`Active jobs in database:                 ${activeInDb?.count || 0}`);
  console.log(`Expired jobs in database:                ${expiredInDb?.count || 0}`);
  console.log(`Candidate matches scored in database:    ${matchesInDb?.count || 0}`);
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});

