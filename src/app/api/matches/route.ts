import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { jobs, matches } from "@/lib/db/schema";
import { eq, and, sql, desc, gte, or, like, ne, type SQL } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    initDb();
    const { searchParams } = new URL(request.url);

    const tab = searchParams.get("tab") || "all";
    const status = searchParams.get("status") || "active_matches"; // active_matches = not dismissed
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const conditions: (SQL | undefined)[] = [eq(jobs.status, "active")];

    // Status filter
    if (status === "active_matches") {
      conditions.push(ne(matches.status, "dismissed"));
    } else if (status !== "all") {
      conditions.push(eq(matches.status, status));
    }

    // Tab filter
    if (tab === "high") {
      conditions.push(gte(matches.matchScore, 80));
    } else if (tab === "early_career") {
      conditions.push(eq(matches.isEarlyCareer, true));
      conditions.push(gte(matches.matchScore, 50));
    } else if (tab === "india_remote") {
      conditions.push(
        or(
          eq(jobs.remoteEligibility, "worldwide"),
          eq(jobs.remoteEligibility, "india"),
          like(jobs.location, "%bangalore%"),
          like(jobs.location, "%bengaluru%"),
          like(jobs.location, "%india%")
        )
      );
      conditions.push(gte(matches.matchScore, 50));
    } else {
      // Default 'all' tab shows reasonable matches (>= 40)
      conditions.push(gte(matches.matchScore, 40));
    }

    const whereClause = and(...conditions);

    // Count
    const countResult = db
      .select({ count: sql<number>`count(*)` })
      .from(matches)
      .innerJoin(jobs, eq(matches.jobId, jobs.id))
      .where(whereClause)
      .get();

    const total = countResult?.count || 0;

    // Fetch items ordered by match score
    const items = db
      .select({
        matchId: matches.id,
        jobId: matches.jobId,
        matchScore: matches.matchScore,
        matchExplanation: matches.matchExplanation,
        matchReasons: matches.matchReasons,
        matchedSkills: matches.matchedSkills,
        missingSkills: matches.missingSkills,
        isEarlyCareer: matches.isEarlyCareer,
        roleRelevanceScore: matches.roleRelevanceScore,
        techSkillsScore: matches.techSkillsScore,
        experienceScore: matches.experienceScore,
        locationScore: matches.locationScore,
        salaryScore: matches.salaryScore,
        matchStatus: matches.status,
        jobTitle: jobs.jobTitle,
        companyName: jobs.companyName,
        companyLogo: jobs.companyLogo,
        location: jobs.location,
        isRemote: jobs.isRemote,
        remoteEligibility: jobs.remoteEligibility,
        employmentType: jobs.employmentType,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
        salaryCurrency: jobs.salaryCurrency,
        salaryFormatted: jobs.salaryFormatted,
        experienceClassification: jobs.experienceClassification,
        applicationUrl: jobs.applicationUrl,
        firstDiscoveredDate: jobs.firstDiscoveredDate,
        extractedSkills: jobs.extractedSkills,
      })
      .from(matches)
      .innerJoin(jobs, eq(matches.jobId, jobs.id))
      .where(whereClause)
      .orderBy(desc(matches.matchScore), desc(jobs.firstDiscoveredDate))
      .limit(limit)
      .offset(offset)
      .all();

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Matches API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
