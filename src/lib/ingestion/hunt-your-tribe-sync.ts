import pLimit from "p-limit";
import { db } from "../db";
import { companies, jobs, matches, syncLogs } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  HuntYourTribeClient,
  HytSearchOptions,
  HytJobSummary,
  HytJobDetail,
} from "../sources/hunt-your-tribe";
import { RawAtsJob } from "../ats/types";
import { normalizeJob, NormalizedJob } from "../normalization/normalizer";
import { evaluateJobMatch } from "../matching/engine";

export interface HytSyncOptions {
  maxJobs?: number;
  batchSize?: number;
  searchOptions?: HytSearchOptions;
  concurrency?: number;
}

export interface HytSyncStats {
  source: "huntyourtribe";
  totalFetched: number;
  newJobsCount: number;
  updatedJobsCount: number;
  duplicatePreservedCount: number;
  failedCount: number;
  durationMs: number;
  startedAt: string;
  completedAt: string;
  errors: Array<{ jobId?: string; error: string }>;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "company"
  );
}

function normalizeTitleForComparison(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Ensures a company exists in the companies table so foreign key constraints are satisfied.
 */
function ensureCompany(
  rawComp: string | { name: string; slug?: string; url?: string | null; logo_url?: string | null },
  nowIso: string
): string {
  const compName =
    typeof rawComp === "object" ? rawComp.name : String(rawComp || "Unknown Company");
  const compUrl =
    typeof rawComp === "object" ? rawComp.url || null : null;
  const compLogo =
    typeof rawComp === "object" ? rawComp.logo_url || null : null;
  const compSlugCandidate =
    typeof rawComp === "object" && rawComp.slug
      ? rawComp.slug
      : slugify(compName);

  // Check by ID or case-insensitive name
  let existing = db
    .select()
    .from(companies)
    .where(eq(companies.id, compSlugCandidate))
    .get();

  if (!existing) {
    existing = db
      .select()
      .from(companies)
      .where(sql`lower(${companies.name}) = ${compName.toLowerCase()}`)
      .get();
  }

  if (existing) {
    // If existing has missing website/logo and we have it, optionally enrich
    if ((!existing.websiteUrl && compUrl) || (!existing.logoUrl && compLogo)) {
      db.update(companies)
        .set({
          websiteUrl: existing.websiteUrl || compUrl,
          logoUrl: existing.logoUrl || compLogo,
          lastSyncedAt: nowIso,
        })
        .where(eq(companies.id, existing.id))
        .run();
    }
    return existing.id;
  }

  // Create new company
  db.insert(companies)
    .values({
      id: compSlugCandidate,
      name: compName,
      atsProvider: "huntyourtribe",
      atsToken: compSlugCandidate,
      websiteUrl: compUrl,
      careerPageUrl: compUrl,
      logoUrl: compLogo,
      isActive: true,
      lastSyncedAt: nowIso,
      createdAt: nowIso,
    })
    .run();

  return compSlugCandidate;
}

/**
 * Normalizes a HuntYourTribe job into Huntly's NormalizedJob format.
 */
export function normalizeHytJob(
  detail: HytJobDetail,
  companyId: string,
  nowIso = new Date().toISOString()
): NormalizedJob {
  const companyName =
    typeof detail.company === "object"
      ? detail.company.name
      : String(detail.company || "Unknown Company");
  const companyWebsite =
    typeof detail.company === "object" ? detail.company.url || null : detail.company_url || null;
  const companyLogo =
    typeof detail.company === "object" ? detail.company.logo_url || null : null;

  // Build location string
  const locParts = [detail.city, detail.country || detail.location].filter(Boolean);
  const locationString =
    locParts.length > 0
      ? locParts.join(", ")
      : detail.work_mode === "Remote"
      ? "Remote"
      : undefined;

  const isRemote =
    detail.work_mode?.toLowerCase() === "remote" ||
    (detail.location || "").toLowerCase().includes("remote");

  const applicationUrl =
    detail.url?.trim() || `https://huntyourtribe.com/jobs/${detail.id}`;

  const rawJob: RawAtsJob = {
    atsProvider: "huntyourtribe",
    atsJobId: detail.id,
    companyId,
    companyName,
    companyWebsite: companyWebsite || undefined,
    companyLogo: companyLogo || undefined,
    jobTitle: detail.title || "Software Engineer",
    rawDescription: detail.description || "",
    location: locationString,
    isRemote,
    department: detail.department || detail.job_role,
    employmentType: detail.role_type || "Full-time",
    applicationUrl,
    originalPostingDate: detail.posted_at || detail.first_seen_at,
    structuredMinExperience:
      typeof detail.minimum_experience_years === "number" &&
      !isNaN(detail.minimum_experience_years)
        ? detail.minimum_experience_years
        : null,
  };

  const normalized = normalizeJob(rawJob, nowIso);

  // Enrich with explicit pre-tagged skills from HuntYourTribe
  if (Array.isArray(detail.skills) && detail.skills.length > 0) {
    try {
      const extracted: string[] = JSON.parse(normalized.extractedSkills || "[]");
      const combined = Array.from(new Set([...extracted, ...detail.skills]));
      normalized.extractedSkills = JSON.stringify(combined);
    } catch {
      // Fallback
      normalized.extractedSkills = JSON.stringify(detail.skills);
    }
  }

  return normalized;
}

/**
 * Synchronizes jobs from HuntYourTribe MCP server into Huntly.
 */
export async function syncHuntYourTribe(options: HytSyncOptions = {}): Promise<HytSyncStats> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  const maxJobs = options.maxJobs || 150;
  const batchSize = Math.max(1, Math.min(25, options.batchSize || 25));
  const concurrency = options.concurrency || 5;
  const searchOptions = options.searchOptions || {};

  const client = new HuntYourTribeClient();
  const errors: Array<{ jobId?: string; error: string }> = [];

  let newJobsCount = 0;
  let updatedJobsCount = 0;
  let duplicatePreservedCount = 0;
  let failedCount = 0;
  const touchedCompanyIds = new Set<string>();

  // 1. Initialize client
  try {
    await client.initialize();
  } catch (initErr) {
    const errorMsg = initErr instanceof Error ? initErr.message : String(initErr);
    return {
      source: "huntyourtribe",
      totalFetched: 0,
      newJobsCount: 0,
      updatedJobsCount: 0,
      duplicatePreservedCount: 0,
      failedCount: 1,
      durationMs: Date.now() - startTime,
      startedAt,
      completedAt: new Date().toISOString(),
      errors: [{ error: `MCP Client Initialization failed: ${errorMsg}` }],
    };
  }

  // 2. Fetch job summaries across pages up to maxJobs
  const collectedSummaries: HytJobSummary[] = [];
  let currentPage = searchOptions.page || 1;
  let hasNext = true;

  while (collectedSummaries.length < maxJobs && hasNext) {
    const needed = maxJobs - collectedSummaries.length;
    const currentLimit = Math.min(batchSize, needed);

    try {
      const resp = await client.searchJobs({
        ...searchOptions,
        limit: currentLimit,
        page: currentPage,
      });

      if (!resp.jobs || resp.jobs.length === 0) {
        break;
      }

      collectedSummaries.push(...resp.jobs);
      hasNext = resp.meta.has_next && collectedSummaries.length < maxJobs;
      currentPage++;
    } catch (searchErr) {
      const msg = searchErr instanceof Error ? searchErr.message : String(searchErr);
      errors.push({ error: `search_jobs failed on page ${currentPage}: ${msg}` });
      failedCount++;
      break;
    }
  }

  // 3. Concurrently fetch details and ingest jobs
  const limit = pLimit(concurrency);
  const nowIso = new Date().toISOString();

  const processJob = async (summary: HytJobSummary) => {
    try {
      let detail: HytJobDetail;
      try {
        detail = await client.getJobDetails(summary.id);
      } catch (detailErr) {
        // Fallback to summary information if get_job_details fails
        detail = {
          id: summary.id,
          title: summary.title,
          description: summary.title,
          company: summary.company,
          company_url: summary.company_url,
          location: summary.location,
          work_mode: summary.work_mode,
          level: summary.level,
          role_type: summary.role_type,
          department: summary.department,
          skills: summary.skills,
          minimum_experience_years: summary.minimum_experience_years,
          posted_at: summary.posted_at,
          url: summary.url,
        };
      }

      // Ensure foreign key: company must exist in companies table
      const rawComp = detail.company || summary.company;
      const companyId = ensureCompany(rawComp, nowIso);
      touchedCompanyIds.add(companyId);

      const normalized = normalizeHytJob(detail, companyId, nowIso);

      // ==========================================
      // Deduplication & Conflict Resolution
      // ==========================================
      let existingJob = null;

      // Check 1: Exact applicationUrl match
      if (normalized.applicationUrl) {
        existingJob = db
          .select()
          .from(jobs)
          .where(eq(jobs.applicationUrl, normalized.applicationUrl))
          .get();
      }

      // Check 2: Match by atsJobId & companyId
      if (!existingJob) {
        existingJob = db
          .select()
          .from(jobs)
          .where(
            and(
              eq(jobs.atsJobId, normalized.atsJobId),
              eq(jobs.companyId, normalized.companyId)
            )
          )
          .get();
      }

      // Check 3: Match by normalized companyName + jobTitle fallback
      if (!existingJob) {
        const normTitle = normalizeTitleForComparison(normalized.jobTitle);
        const compJobs = db
          .select()
          .from(jobs)
          .where(eq(jobs.companyId, normalized.companyId))
          .all();

        existingJob = compJobs.find(
          (j) => normalizeTitleForComparison(j.jobTitle) === normTitle
        ) || null;
      }

      if (existingJob) {
        // If the existing job was imported from a direct ATS (Ashby, Greenhouse, Lever),
        // we MUST preserve its direct ATS link, ATS provider, and ID.
        if (existingJob.atsProvider !== "huntyourtribe") {
          db.update(jobs)
            .set({
              lastSynchronizedDate: nowIso,
              status: "active",
            })
            .where(eq(jobs.id, existingJob.id))
            .run();
          duplicatePreservedCount++;
        } else {
          // Existing HuntYourTribe job: update details
          const keepExistingExp =
            existingJob.experienceStated &&
            existingJob.minExperience != null &&
            normalized.minExperience == null;

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
              minExperience: keepExistingExp ? existingJob.minExperience : normalized.minExperience,
              maxExperience: keepExistingExp ? existingJob.maxExperience : normalized.maxExperience,
              experienceClassification: keepExistingExp
                ? existingJob.experienceClassification
                : normalized.experienceClassification,
              experienceStated: keepExistingExp
                ? existingJob.experienceStated
                : normalized.experienceStated,
              extractedSkills: normalized.extractedSkills,
              jobCategory: normalized.jobCategory,
              applicationUrl: normalized.applicationUrl,
              lastSynchronizedDate: nowIso,
              status: "active",
            })
            .where(eq(jobs.id, existingJob.id))
            .run();

          // Also update match row if exists
          const matchEval = evaluateJobMatch(normalized);
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
            .where(eq(matches.jobId, existingJob.id))
            .run();

          updatedJobsCount++;
        }
      } else {
        // New job: insert into jobs and matches
        db.insert(jobs).values(normalized).run();

        const matchEval = evaluateJobMatch(normalized);
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

        newJobsCount++;
      }
    } catch (jobErr) {
      const msg = jobErr instanceof Error ? jobErr.message : String(jobErr);
      errors.push({ jobId: summary.id, error: msg });
      failedCount++;
    }
  };

  await Promise.all(collectedSummaries.map((s) => limit(() => processJob(s))));

  const completedAt = new Date().toISOString();
  const durationMs = Date.now() - startTime;

  // 4. Record audit log in syncLogs table
  try {
    db.insert(syncLogs)
      .values({
        syncType: "huntyourtribe",
        companiesCount: touchedCompanyIds.size,
        successfulSyncs: 1,
        failedSyncs: failedCount > 0 ? 1 : 0,
        jobsFetched: collectedSummaries.length,
        newJobsCount,
        updatedJobsCount,
        expiredJobsCount: 0,
        durationMs,
        details: JSON.stringify({
          duplicatePreservedCount,
          searchOptions,
          errorCount: errors.length,
          errors: errors.slice(0, 10),
        }),
        startedAt,
        completedAt,
      })
      .run();
  } catch (logErr) {
    console.error("[HuntYourTribeSync] Failed to write sync log:", logErr);
  }

  return {
    source: "huntyourtribe",
    totalFetched: collectedSummaries.length,
    newJobsCount,
    updatedJobsCount,
    duplicatePreservedCount,
    failedCount,
    durationMs,
    startedAt,
    completedAt,
    errors,
  };
}

