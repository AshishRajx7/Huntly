import pLimit from "p-limit";
import { db, sqlite } from "../db";
import { companies, jobs, matches, syncLogs, Company, Job } from "../db/schema";
import { eq, and, sql, notInArray } from "drizzle-orm";
import { fetchAshbyJobs } from "../ats/ashby";
import { fetchGreenhouseJobs } from "../ats/greenhouse";
import { fetchLeverJobs } from "../ats/lever";
import { normalizeJob, NormalizedJob } from "../normalization/normalizer";
import { evaluateJobMatch } from "../matching/engine";
import { AtsFetchResult } from "../ats/types";

export interface SyncCompanyResult {
  companyId: string;
  companyName: string;
  success: boolean;
  jobsFetched: number;
  newJobs: number;
  updatedJobs: number;
  expiredJobs: number;
  error?: string;
}

export interface SyncStats {
  syncType: "manual" | "scheduled";
  companiesCount: number;
  successfulSyncs: number;
  failedSyncs: number;
  jobsFetched: number;
  newJobsCount: number;
  updatedJobsCount: number;
  expiredJobsCount: number;
  durationMs: number;
  errors: Array<{ companyId: string; error: string }>;
}

export async function syncCompany(
  company: Company,
  nowIso = new Date().toISOString()
): Promise<SyncCompanyResult> {
  let fetchResult: AtsFetchResult;

  try {
    if (company.atsProvider === "ashby") {
      fetchResult = await fetchAshbyJobs(company);
    } else if (company.atsProvider === "greenhouse") {
      fetchResult = await fetchGreenhouseJobs(company);
    } else if (company.atsProvider === "lever") {
      fetchResult = await fetchLeverJobs(company);
    } else {
      return {
        companyId: company.id,
        companyName: company.name,
        success: false,
        jobsFetched: 0,
        newJobs: 0,
        updatedJobs: 0,
        expiredJobs: 0,
        error: `Unsupported ATS provider: ${company.atsProvider}`,
      };
    }
  } catch (err: unknown) {
    return {
      companyId: company.id,
      companyName: company.name,
      success: false,
      jobsFetched: 0,
      newJobs: 0,
      updatedJobs: 0,
      expiredJobs: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  if (!fetchResult.success) {
    return {
      companyId: company.id,
      companyName: company.name,
      success: false,
      jobsFetched: 0,
      newJobs: 0,
      updatedJobs: 0,
      expiredJobs: 0,
      error: fetchResult.error || "Failed to fetch jobs from ATS",
    };
  }

  let newJobsCount = 0;
  let updatedJobsCount = 0;
  let expiredJobsCount = 0;
  const currentAtsJobIds = new Set<string>();

  try {
    // Process and upsert each job
    for (const rawJob of fetchResult.jobs) {
      if (!rawJob || !rawJob.atsJobId) continue;
      currentAtsJobIds.add(rawJob.atsJobId);

      try {
        const normalized = normalizeJob(rawJob, nowIso);

        // Check if job exists
        const existing = db.select().from(jobs).where(eq(jobs.id, normalized.id)).get();

        if (existing) {
          // Update existing job
          db.update(jobs)
            .set({
              jobTitle: normalized.jobTitle,
              originalDescription: normalized.originalDescription,
              cleanedDescription: normalized.cleanedDescription,
              location: normalized.location,
              isRemote: normalized.isRemote,
              remoteEligibility: normalized.remoteEligibility,
              employmentType: normalized.employmentType,
              salaryMin: normalized.salaryMin,
              salaryMax: normalized.salaryMax,
              salaryCurrency: normalized.salaryCurrency,
              salaryFrequency: normalized.salaryFrequency,
              salaryFormatted: normalized.salaryFormatted,
              minExperience: normalized.minExperience,
              maxExperience: normalized.maxExperience,
              experienceClassification: normalized.experienceClassification,
              experienceStated: normalized.experienceStated,
              extractedSkills: normalized.extractedSkills,
              jobCategory: normalized.jobCategory,
              applicationUrl: normalized.applicationUrl,
              lastSynchronizedDate: nowIso,
              status: "active",
            })
            .where(eq(jobs.id, normalized.id))
            .run();

          updatedJobsCount++;
        } else {
          // Insert new job
          db.insert(jobs).values(normalized).run();
          newJobsCount++;
        }

        // Evaluate match and upsert into matches table
        const matchEval = evaluateJobMatch(normalized);
        const existingMatch = db.select().from(matches).where(eq(matches.jobId, normalized.id)).get();

        if (existingMatch) {
          db.update(matches)
            .set({
              matchScore: matchEval.matchScore,
              matchExplanation: matchEval.matchExplanation,
              matchReasons: JSON.stringify(matchEval.matchReasons),
              matchedSkills: JSON.stringify(matchEval.matchedSkills),
              missingSkills: JSON.stringify(matchEval.missingSkills),
              isEarlyCareer: matchEval.isEarlyCareer,
              roleRelevanceScore: matchEval.roleRelevanceScore,
              techSkillsScore: matchEval.techSkillsScore,
              experienceScore: matchEval.experienceScore,
              locationScore: matchEval.locationScore,
              salaryScore: matchEval.salaryScore,
              updatedAt: nowIso,
            })
            .where(eq(matches.jobId, normalized.id))
            .run();
        } else {
          db.insert(matches)
            .values({
              jobId: normalized.id,
              matchScore: matchEval.matchScore,
              matchExplanation: matchEval.matchExplanation,
              matchReasons: JSON.stringify(matchEval.matchReasons),
              matchedSkills: JSON.stringify(matchEval.matchedSkills),
              missingSkills: JSON.stringify(matchEval.missingSkills),
              isEarlyCareer: matchEval.isEarlyCareer,
              roleRelevanceScore: matchEval.roleRelevanceScore,
              techSkillsScore: matchEval.techSkillsScore,
              experienceScore: matchEval.experienceScore,
              locationScore: matchEval.locationScore,
              salaryScore: matchEval.salaryScore,
              status: "new",
              createdAt: nowIso,
              updatedAt: nowIso,
            })
            .run();
        }
      } catch (jobErr) {
        console.warn(`[Sync] Skipping malformed job ${rawJob.atsJobId} in ${company.name}:`, jobErr);
      }
    }

    // Detect expired jobs for this company ONLY after a full successful fetch and process.
    // If the ATS fetch was successful, any existing active jobs for this company not in currentAtsJobIds are marked expired.
    const activeCompanyJobs = db
      .select({ id: jobs.id, atsJobId: jobs.atsJobId })
      .from(jobs)
      .where(and(eq(jobs.companyId, company.id), eq(jobs.status, "active")))
      .all();

    for (const cJob of activeCompanyJobs) {
      if (!currentAtsJobIds.has(cJob.atsJobId)) {
        db.update(jobs)
          .set({
            status: "expired",
            lastSynchronizedDate: nowIso,
          })
          .where(eq(jobs.id, cJob.id))
          .run();
        expiredJobsCount++;
      }
    }

    // Update company's lastSyncedAt
    db.update(companies)
      .set({ lastSyncedAt: nowIso })
      .where(eq(companies.id, company.id))
      .run();

    return {
      companyId: company.id,
      companyName: company.name,
      success: true,
      jobsFetched: fetchResult.jobs.length,
      newJobs: newJobsCount,
      updatedJobs: updatedJobsCount,
      expiredJobs: expiredJobsCount,
    };
  } catch (fatalErr) {
    // On any fatal processing error, DO NOT expire existing jobs
    return {
      companyId: company.id,
      companyName: company.name,
      success: false,
      jobsFetched: 0,
      newJobs: 0,
      updatedJobs: 0,
      expiredJobs: 0,
      error: fatalErr instanceof Error ? fatalErr.message : String(fatalErr),
    };
  }
}

export async function syncAllCompanies(
  syncType: "manual" | "scheduled" = "manual",
  concurrency = 5
): Promise<SyncStats> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  const activeCompanies = db
    .select()
    .from(companies)
    .where(eq(companies.isActive, true))
    .all();

  const limit = pLimit(concurrency);
  let successfulSyncs = 0;
  let failedSyncs = 0;
  let jobsFetched = 0;
  let newJobsCount = 0;
  let updatedJobsCount = 0;
  let expiredJobsCount = 0;
  const errors: Array<{ companyId: string; error: string }> = [];

  const tasks = activeCompanies.map((comp) =>
    limit(async () => {
      try {
        const result = await syncCompany(comp, startedAt);
        if (result.success) {
          successfulSyncs++;
          jobsFetched += result.jobsFetched;
          newJobsCount += result.newJobs;
          updatedJobsCount += result.updatedJobs;
          expiredJobsCount += result.expiredJobs;
        } else {
          failedSyncs++;
          errors.push({
            companyId: comp.id,
            error: result.error || "Unknown sync error",
          });
        }
      } catch (err: unknown) {
        failedSyncs++;
        errors.push({
          companyId: comp.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })
  );

  await Promise.all(tasks);

  const completedAt = new Date().toISOString();
  const durationMs = Date.now() - startTime;

  const stats: SyncStats = {
    syncType,
    companiesCount: activeCompanies.length,
    successfulSyncs,
    failedSyncs,
    jobsFetched,
    newJobsCount,
    updatedJobsCount,
    expiredJobsCount,
    durationMs,
    errors,
  };

  // Record audit log
  try {
    db.insert(syncLogs)
      .values({
        syncType,
        companiesCount: activeCompanies.length,
        successfulSyncs,
        failedSyncs,
        jobsFetched,
        newJobsCount,
        updatedJobsCount,
        expiredJobsCount,
        durationMs,
        details: JSON.stringify({
          errors: errors.slice(0, 10),
          summary: `${newJobsCount} new, ${updatedJobsCount} updated, ${expiredJobsCount} expired`,
        }),
        startedAt,
        completedAt,
      })
      .run();
  } catch (logErr) {
    console.error("Failed to write sync log:", logErr);
  }

  return stats;
}

