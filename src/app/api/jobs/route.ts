import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { jobs, matches } from "@/lib/db/schema";
import { eq, and, sql, desc, asc, like, or, gte, type SQL } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    initDb();
    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q")?.trim() || "";
    const company = searchParams.get("company")?.trim() || "";
    const remote = searchParams.get("remote")?.trim() || "";
    const experience = searchParams.get("experience")?.trim() || "";
    const ats = searchParams.get("ats")?.trim() || "";
    const minSalary = searchParams.get("minSalary") ? Number(searchParams.get("minSalary")) : null;
    const status = searchParams.get("status") || "active";
    const sort = searchParams.get("sort") || "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const conditions: (SQL | undefined)[] = [];

    // Filter by active/expired
    if (status !== "all") {
      conditions.push(eq(jobs.status, status));
    }

    // Keyword search
    if (q) {
      const pattern = `%${q}%`;
      conditions.push(
        or(
          like(jobs.jobTitle, pattern),
          like(jobs.companyName, pattern),
          like(jobs.location, pattern),
          like(jobs.extractedSkills, pattern)
        )
      );
    }

    // Company filter
    if (company) {
      conditions.push(eq(jobs.companyId, company));
    }

    // Remote eligibility filter
    if (remote) {
      if (remote === "any_remote") {
        conditions.push(eq(jobs.isRemote, true));
      } else {
        conditions.push(eq(jobs.remoteEligibility, remote));
      }
    }

    // Experience filter
    if (experience) {
      if (experience === "early_career") {
        conditions.push(
          or(
            eq(jobs.experienceClassification, "0-1"),
            eq(jobs.experienceClassification, "1-2"),
            eq(jobs.experienceClassification, "entry"),
            eq(jobs.experienceClassification, "junior"),
            eq(jobs.experienceClassification, "unspecified")
          )
        );
      } else {
        conditions.push(eq(jobs.experienceClassification, experience));
      }
    }

    // ATS filter
    if (ats) {
      conditions.push(eq(jobs.atsProvider, ats));
    }

    // Min salary filter
    if (minSalary && !isNaN(minSalary)) {
      conditions.push(gte(jobs.salaryMin, minSalary));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sorting
    let orderByClause;
    switch (sort) {
      case "oldest":
        orderByClause = asc(jobs.firstDiscoveredDate);
        break;
      case "highest_salary":
        orderByClause = desc(jobs.salaryMin);
        break;
      case "match_score":
        orderByClause = desc(matches.matchScore);
        break;
      case "newest":
      default:
        orderByClause = desc(jobs.firstDiscoveredDate);
        break;
    }

    // Count total matching items
    const countResult = db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .leftJoin(matches, eq(jobs.id, matches.jobId))
      .where(whereClause)
      .get();

    const total = countResult?.count || 0;

    // Fetch paginated jobs
    const items = db
      .select({
        id: jobs.id,
        atsProvider: jobs.atsProvider,
        atsJobId: jobs.atsJobId,
        companyId: jobs.companyId,
        companyName: jobs.companyName,
        companyWebsite: jobs.companyWebsite,
        companyLogo: jobs.companyLogo,
        jobTitle: jobs.jobTitle,
        cleanedDescription: jobs.cleanedDescription,
        location: jobs.location,
        isRemote: jobs.isRemote,
        remoteEligibility: jobs.remoteEligibility,
        employmentType: jobs.employmentType,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
        salaryCurrency: jobs.salaryCurrency,
        salaryFormatted: jobs.salaryFormatted,
        minExperience: jobs.minExperience,
        maxExperience: jobs.maxExperience,
        experienceClassification: jobs.experienceClassification,
        experienceStated: jobs.experienceStated,
        extractedSkills: jobs.extractedSkills,
        jobCategory: jobs.jobCategory,
        applicationUrl: jobs.applicationUrl,
        firstDiscoveredDate: jobs.firstDiscoveredDate,
        lastSynchronizedDate: jobs.lastSynchronizedDate,
        status: jobs.status,
        matchScore: matches.matchScore,
        matchExplanation: matches.matchExplanation,
        matchReasons: matches.matchReasons,
        matchedSkills: matches.matchedSkills,
        matchStatus: matches.status,
      })
      .from(jobs)
      .leftJoin(matches, eq(jobs.id, matches.jobId))
      .where(whereClause)
      .orderBy(orderByClause)
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
    console.error("Jobs API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
