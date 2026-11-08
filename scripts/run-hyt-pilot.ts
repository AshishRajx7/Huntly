import { initDb, db } from "../src/lib/db";
import { syncHuntYourTribe } from "../src/lib/ingestion/hunt-your-tribe-sync";
import { jobs, companies, syncLogs } from "../src/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

async function main() {
  console.log("==========================================");
  console.log("Huntly Phase 2C: HuntYourTribe Live Pilot");
  console.log("==========================================");

  initDb();

  const initialJobCount = db.select().from(jobs).all().length;
  const initialCompanyCount = db.select().from(companies).all().length;

  console.log(`Initial Database State:`);
  console.log(`- Total Jobs: ${initialJobCount}`);
  console.log(`- Total Companies: ${initialCompanyCount}`);
  console.log("\nStarting synchronization (target: ~150 jobs)...");

  const startTime = Date.now();
  const stats = await syncHuntYourTribe({
    maxJobs: 150,
    batchSize: 25,
    concurrency: 5,
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\nSynchronization Completed:");
  console.log(`- Total Fetched: ${stats.totalFetched}`);
  console.log(`- New Jobs Inserted: ${stats.newJobsCount}`);
  console.log(`- Existing Jobs Updated: ${stats.updatedJobsCount}`);
  console.log(`- Native ATS Duplicates Preserved: ${stats.duplicatePreservedCount}`);
  console.log(`- Failed: ${stats.failedCount}`);
  console.log(`- Duration: ${durationSec}s`);
  if (stats.errors.length > 0) {
    console.log(`- Error samples:`, stats.errors.slice(0, 3));
  }

  // Database verification
  const finalJobCount = db.select().from(jobs).all().length;
  const finalCompanyCount = db.select().from(companies).all().length;

  const hytJobs = db
    .select()
    .from(jobs)
    .where(eq(jobs.atsProvider, "huntyourtribe"))
    .all();

  const hytJobsWithDirectUrls = hytJobs.filter(
    (j) => j.applicationUrl && !j.applicationUrl.includes("huntyourtribe.com/jobs")
  );

  const hytJobsWithDates = hytJobs.filter((j) => j.originalPostingDate != null);

  const sampleJobs = db
    .select({
      id: jobs.id,
      title: jobs.jobTitle,
      company: jobs.companyName,
      location: jobs.location,
      url: jobs.applicationUrl,
      experience: jobs.experienceClassification,
      skills: jobs.extractedSkills,
      postingDate: jobs.originalPostingDate,
    })
    .from(jobs)
    .where(eq(jobs.atsProvider, "huntyourtribe"))
    .orderBy(desc(jobs.firstDiscoveredDate))
    .limit(5)
    .all();

  // Audit log check
  const latestLog = db
    .select()
    .from(syncLogs)
    .where(eq(syncLogs.syncType, "huntyourtribe"))
    .orderBy(desc(syncLogs.id))
    .limit(1)
    .get();

  console.log("\nVerification Results:");
  console.log(`- Database Total Jobs: ${finalJobCount} (+${finalJobCount - initialJobCount})`);
  console.log(`- Database Total Companies: ${finalCompanyCount} (+${finalCompanyCount - initialCompanyCount})`);
  console.log(`- Total HuntYourTribe Jobs in DB: ${hytJobs.length}`);
  console.log(`- HYT Jobs with Direct Employer URLs: ${hytJobsWithDirectUrls.length} (${((hytJobsWithDirectUrls.length / (hytJobs.length || 1)) * 100).toFixed(1)}%)`);
  console.log(`- HYT Jobs with Posting Dates: ${hytJobsWithDates.length}`);
  console.log(`- Sync Audit Log Recorded: ${latestLog ? "YES (ID: " + latestLog.id + ")" : "NO"}`);

  console.log("\nSample Imported Jobs:");
  sampleJobs.forEach((job, idx) => {
    let parsedSkills = [];
    try {
      parsedSkills = JSON.parse(job.skills);
    } catch {}
    console.log(`  [${idx + 1}] ${job.title} at ${job.company}`);
    console.log(`      Location: ${job.location || "Remote"}`);
    console.log(`      Experience: ${job.experience}`);
    console.log(`      Application URL: ${job.url}`);
    console.log(`      Posting Date: ${job.postingDate || "N/A"}`);
    console.log(`      Skills: ${parsedSkills.slice(0, 5).join(", ")}`);
  });

  console.log("\n==========================================");
  console.log("HuntYourTribe Pilot Finished Successfully");
  console.log("==========================================");
}

main().catch((err) => {
  console.error("Pilot execution failed:", err);
  process.exit(1);
});

