import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { jobs, matches, applications, syncLogs, companies } from "@/lib/db/schema";
import { eq, and, sql, desc, gte } from "drizzle-orm";

export async function GET() {
  try {
    initDb();

    // 1. Total active jobs
    const activeJobsResult = db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(eq(jobs.status, "active"))
      .get();
    const totalActiveJobs = activeJobsResult?.count || 0;

    // 2. Discovered today (UTC date string check)
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayResult = db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(sql`date(${jobs.firstDiscoveredDate}) = ${todayStr}`)
      .get();
    const discoveredToday = todayResult?.count || 0;

    // 3. Discovered last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const sevenDaysResult = db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(gte(jobs.firstDiscoveredDate, sevenDaysAgo))
      .get();
    const discoveredLast7Days = sevenDaysResult?.count || 0;

    // 4. Matching profile (Score >= 70)
    const matchingResult = db
      .select({ count: sql<number>`count(*)` })
      .from(matches)
      .innerJoin(jobs, eq(matches.jobId, jobs.id))
      .where(and(eq(jobs.status, "active"), gte(matches.matchScore, 70)))
      .get();
    const matchingCount = matchingResult?.count || 0;

    // 5. High affinity matching (Score >= 80)
    const highAffinityResult = db
      .select({ count: sql<number>`count(*)` })
      .from(matches)
      .innerJoin(jobs, eq(matches.jobId, jobs.id))
      .where(and(eq(jobs.status, "active"), gte(matches.matchScore, 80)))
      .get();
    const highAffinityCount = highAffinityResult?.count || 0;

    // 6. Applications count
    const appsResult = db
      .select({ count: sql<number>`count(*)` })
      .from(applications)
      .get();
    const totalApplications = appsResult?.count || 0;

    // Applications breakdown by status
    const appStatuses = db
      .select({
        status: applications.status,
        count: sql<number>`count(*)`,
      })
      .from(applications)
      .groupBy(applications.status)
      .all();

    // 7. Last sync record
    const lastSync = db
      .select()
      .from(syncLogs)
      .orderBy(desc(syncLogs.id))
      .limit(1)
      .get();

    // 8. Active companies count
    const totalCompaniesResult = db
      .select({ count: sql<number>`count(*)` })
      .from(companies)
      .where(eq(companies.isActive, true))
      .get();
    const activeCompanies = totalCompaniesResult?.count || 0;

    // 9. Top 5 newest high affinity matches
    const topMatches = db
      .select({
        id: jobs.id,
        jobTitle: jobs.jobTitle,
        companyName: jobs.companyName,
        companyLogo: jobs.companyLogo,
        location: jobs.location,
        isRemote: jobs.isRemote,
        remoteEligibility: jobs.remoteEligibility,
        salaryFormatted: jobs.salaryFormatted,
        experienceClassification: jobs.experienceClassification,
        applicationUrl: jobs.applicationUrl,
        firstDiscoveredDate: jobs.firstDiscoveredDate,
        matchScore: matches.matchScore,
        matchExplanation: matches.matchExplanation,
        matchedSkills: matches.matchedSkills,
        matchStatus: matches.status,
      })
      .from(matches)
      .innerJoin(jobs, eq(matches.jobId, jobs.id))
      .where(eq(jobs.status, "active"))
      .orderBy(desc(matches.matchScore), desc(jobs.firstDiscoveredDate))
      .limit(6)
      .all();

    return NextResponse.json({
      metrics: {
        totalActiveJobs,
        discoveredToday,
        discoveredLast7Days,
        matchingCount,
        highAffinityCount,
        totalApplications,
        activeCompanies,
        appStatuses,
        lastSync: lastSync || null,
      },
      topMatches,
    });
  } catch (error) {
    console.error("Overview API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

