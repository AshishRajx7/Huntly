import pLimit from "p-limit";
import { db } from "../db";
import { companies, jobs, matches, syncLogs } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  FreehireClient,
  FreehireSearchOptions,
  FreehireJob,
} from "../sources/freehire";
import { RawAtsJob } from "../ats/types";
import { normalizeJob, NormalizedJob } from "../normalization/normalizer";
import { evaluateJobMatch } from "../matching/engine";

export interface FreehireQuerySpec {
  q?: string;
  skills?: string | string[];
  cities?: string | string[];
  countries?: string | string[];
  work_mode?: "remote" | "hybrid" | "onsite" | string;
}

export interface FreehireSyncOptions {
  maxJobs?: number;
  batchSize?: number;
  queries?: FreehireQuerySpec[];
  searchOptions?: FreehireSearchOptions;
  concurrency?: number;
}

export interface FreehireSyncStats {
  source: "freehire";
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

let isSyncInProgress = false;

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

function cleanExternalId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}

/**
 * Strips tracking query parameters (e.g. utm_source, utm_medium) for URL matching.
 */
function stripTrackingParams(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const paramsToDelete: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      if (key.startsWith("utm_") || key === "source" || key === "ref") {
        paramsToDelete.push(key);
      }
    });
    for (const key of paramsToDelete) {
      parsed.searchParams.delete(key);
    }
    return parsed.origin + parsed.pathname.replace(/\/+$/, "") + (parsed.search ? parsed.search : "");
  } catch {
    return rawUrl.trim();
  }
}

/**
 * Ensures a company exists in the companies table so foreign key constraints are satisfied.
 */
function ensureCompany(
  companyName: string,
  companySlugCandidate: string,
  nowIso: string
): string {
  const compSlug = slugify(companySlugCandidate || companyName);

  let existing = db
    .select()
    .from(companies)
    .where(eq(companies.id, compSlug))
    .get();

  if (!existing) {
    existing = db
      .select()
      .from(companies)
      .where(sql`lower(${companies.name}) = ${companyName.toLowerCase()}`)
      .get();
  }

  if (existing) {
    return existing.id;
  }

  // Create new company record
  db.insert(companies)
    .values({
      id: compSlug,
      name: companyName,
      atsProvider: "freehire",
      atsToken: compSlug,
      isActive: true,
      lastSyncedAt: nowIso,
      createdAt: nowIso,
    })
    .run();

  return compSlug;
}

/**
 * Normalizes a Freehire job record into Huntly's NormalizedJob schema.
 */
export function normalizeFreehireJob(
  job: FreehireJob,
  companyId: string,
  nowIso = new Date().toISOString()
): NormalizedJob {
  const companyName = job.company?.trim() || "Unknown Company";
  const externalId = job.external_id || job.public_slug;
  const safeId = cleanExternalId(externalId);

  // Location string construction
  const locParts = [
    job.cities && job.cities.length > 0 ? job.cities.join(", ") : null,
    job.location,
    job.countries && job.countries.length > 0 ? job.countries.join(", ").toUpperCase() : null,
  ].filter(Boolean);

  let locationString = locParts.length > 0 ? locParts[0] as string : undefined;
  if (!locationString && job.work_mode === "remote") {
    locationString = "Remote";
  }

  const isRemote =
    job.work_mode?.toLowerCase() === "remote" ||
    (job.location || "").toLowerCase().includes("remote");

  const applicationUrl = job.url?.trim() || `https://freehire.me/job/${job.public_slug}`;

  const rawJob: RawAtsJob = {
    atsProvider: "freehire",
    atsJobId: safeId,
    companyId,
    companyName,
    jobTitle: job.title || "Software Engineer",
    rawDescription: job.description || "",
    location: locationString,
    isRemote,
    department: job.enrichment?.category || undefined,
    employmentType: "Full-time",
    applicationUrl,
    originalPostingDate: job.posted_at || job.created_at,
    structuredMinExperience:
      typeof job.enrichment?.experience_years_min === "number" &&
      !isNaN(job.enrichment.experience_years_min)
        ? job.enrichment.experience_years_min
        : null,
  };

  const normalized = normalizeJob(rawJob, nowIso);

  // Enrich skills with Freehire's normalized tags
  if (Array.isArray(job.skills) && job.skills.length > 0) {
    try {
      const extracted: string[] = JSON.parse(normalized.extractedSkills || "[]");
      const combined = Array.from(new Set([...extracted, ...job.skills]));
      normalized.extractedSkills = JSON.stringify(combined);
    } catch {
      normalized.extractedSkills = JSON.stringify(job.skills);
    }
  }

  return normalized;
}

export const DEFAULT_FREEHIRE_QUERIES: FreehireQuerySpec[] = [
  { q: "Backend Engineer", cities: "Bengaluru" },
  { q: "Software Engineer", cities: "Bengaluru" },
  { q: "Node.js Engineer", work_mode: "remote" },
  { q: "TypeScript Engineer", work_mode: "remote" },
  { q: "Remote Software Engineer", work_mode: "remote" },
  { q: "Software Developer", countries: "in" },
];

/**
 * Synchronizes jobs from Freehire's public Agent API into Huntly.
 */
export async function syncFreehire(options: FreehireSyncOptions = {}): Promise<FreehireSyncStats> {
  if (isSyncInProgress) {
    throw new Error("Freehire sync is already running in another process/task.");
  }

  isSyncInProgress = true;
  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  const maxJobs = options.maxJobs || 200;
  const batchSize = Math.max(10, Math.min(50, options.batchSize || 25));
  const concurrency = Math.min(5, options.concurrency || 5);
  const client = new FreehireClient();

  const queries = options.queries || (options.searchOptions ? [options.searchOptions] : DEFAULT_FREEHIRE_QUERIES);
  const errors: Array<{ jobId?: string; error: string }> = [];

  let newJobsCount = 0;
  let updatedJobsCount = 0;
  let duplicatePreservedCount = 0;
  let failedCount = 0;
  let totalFetched = 0;
  const touchedCompanyIds = new Set<string>();
  const seenJobSlugs = new Set<string>();

  try {
    const limit = pLimit(concurrency);
    const nowIso = new Date().toISOString();

    for (const querySpec of queries) {
      if (seenJobSlugs.size >= maxJobs) break;

      let offset = 0;
      let hasMore = true;

      while (hasMore && seenJobSlugs.size < maxJobs) {
        const remainingToFetch = maxJobs - seenJobSlugs.size;
        const currentLimit = Math.min(batchSize, remainingToFetch);

        let response;
        try {
          response = await client.searchJobs({
            ...querySpec,
            limit: currentLimit,
            offset,
            description_format: "markdown",
          });
        } catch (searchErr) {
          const msg = searchErr instanceof Error ? searchErr.message : String(searchErr);
          errors.push({ error: `Search failed for query "${querySpec.q || "all"}": ${msg}` });
          failedCount++;
          break;
        }

        if (!response.data || response.data.length === 0) {
          break;
        }

        totalFetched += response.data.length;

        // Process jobs concurrently up to concurrency limit
        const processJob = async (job: FreehireJob) => {
          if (!job.public_slug || seenJobSlugs.has(job.public_slug)) {
            return;
          }
          seenJobSlugs.add(job.public_slug);

          try {
            const compName = job.company?.trim() || "Unknown Company";
            const compSlug = job.company_slug || slugify(compName);
            const companyId = ensureCompany(compName, compSlug, nowIso);
            touchedCompanyIds.add(companyId);

            const normalized = normalizeFreehireJob(job, companyId, nowIso);

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

              // If no exact match, check stripped URL (removing utm params)
              if (!existingJob) {
                const stripped = stripTrackingParams(normalized.applicationUrl);
                const candidates = db
                  .select()
                  .from(jobs)
                  .where(eq(jobs.companyId, companyId))
                  .all();

                existingJob =
                  candidates.find(
                    (c) => stripTrackingParams(c.applicationUrl) === stripped
                  ) || null;
              }
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

              existingJob =
                compJobs.find(
                  (j) => normalizeTitleForComparison(j.jobTitle) === normTitle
                ) || null;
            }

            if (existingJob) {
              // PRESERVATION RULE: If existing job is from native ATS or HuntYourTribe,
              // DO NOT overwrite atsProvider, id, or direct applicationUrl!
              if (existingJob.atsProvider !== "freehire") {
                db.update(jobs)
                  .set({
                    lastSynchronizedDate: nowIso,
                    status: "active",
                  })
                  .where(eq(jobs.id, existingJob.id))
                  .run();
                duplicatePreservedCount++;
              } else {
                // Existing Freehire job: update details
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
              // Brand new job
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
            errors.push({ jobId: job.public_slug, error: msg });
            failedCount++;
          }
        };

        await Promise.all(response.data.map((job) => limit(() => processJob(job))));

        offset += response.data.length;
        hasMore = offset < response.meta.total && offset < 10000;
      }
    }
  } finally {
    isSyncInProgress = false;
  }

  const completedAt = new Date().toISOString();
  const durationMs = Date.now() - startTime;

  // Audit log in syncLogs table
  try {
    db.insert(syncLogs)
      .values({
        syncType: "freehire",
        companiesCount: touchedCompanyIds.size,
        successfulSyncs: 1,
        failedSyncs: failedCount > 0 ? 1 : 0,
        jobsFetched: totalFetched,
        newJobsCount,
        updatedJobsCount,
        expiredJobsCount: 0,
        durationMs,
        details: JSON.stringify({
          duplicatePreservedCount,
          errorCount: errors.length,
          errors: errors.slice(0, 10),
        }),
        startedAt,
        completedAt,
      })
      .run();
  } catch (logErr) {
    console.error("[FreehireSync] Failed to record sync log:", logErr);
  }

  return {
    source: "freehire",
    totalFetched,
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

