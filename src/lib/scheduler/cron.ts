import cron, { ScheduledTask } from "node-cron";
import { syncAllCompanies } from "../ingestion/sync-service";
import { sendJobDigestEmail, DigestJob } from "../email/digest";
import { db } from "../db";
import { jobs, matches } from "../db/schema";
import { and, eq, gte, desc } from "drizzle-orm";

let cronTask: ScheduledTask | null = null;
let isSyncInProgress = false;

export function startCronScheduler(scheduleExpr = process.env.CRON_SCHEDULE || "0 */6 * * *"): {
  started: boolean;
  schedule: string;
} {
  if (cronTask) {
    return { started: true, schedule: scheduleExpr };
  }

  cronTask = cron.schedule(scheduleExpr, async () => {
    if (isSyncInProgress) {
      console.log("[Scheduler] Previous sync still active. Skipping run.");
      return;
    }

    isSyncInProgress = true;
    console.log(`[Scheduler] Starting scheduled sync at ${new Date().toISOString()}`);

    try {
      const stats = await syncAllCompanies("scheduled", 5);
      console.log(
        `[Scheduler] Sync finished: ${stats.jobsFetched} jobs fetched, ${stats.newJobsCount} new, ${stats.expiredJobsCount} expired.`
      );

      // If new jobs were discovered, check for high affinity matches to email
      if (stats.newJobsCount > 0) {
        const highMatches = db
          .select({
            jobTitle: jobs.jobTitle,
            companyName: jobs.companyName,
            location: jobs.location,
            salaryFormatted: jobs.salaryFormatted,
            matchScore: matches.matchScore,
            matchExplanation: matches.matchExplanation,
            applicationUrl: jobs.applicationUrl,
          })
          .from(matches)
          .innerJoin(jobs, eq(matches.jobId, jobs.id))
          .where(and(eq(jobs.status, "active"), gte(matches.matchScore, 75)))
          .orderBy(desc(matches.matchScore))
          .limit(10)
          .all();

        if (highMatches.length > 0) {
          const emailRes = await sendJobDigestEmail({
            jobs: highMatches,
            totalScanned: stats.companiesCount,
            newJobsCount: stats.newJobsCount,
          });
          console.log(`[Scheduler] Email digest: ${emailRes.message}`);
        }
      }
    } catch (err) {
      console.error("[Scheduler] Scheduled job error:", err);
    } finally {
      isSyncInProgress = false;
    }
  });

  console.log(`[Scheduler] Started node-cron with schedule: ${scheduleExpr}`);
  return { started: true, schedule: scheduleExpr };
}

export function stopCronScheduler(): boolean {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    return true;
  }
  return false;
}

