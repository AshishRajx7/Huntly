import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

// 1. Companies Table
export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(), // slug like 'runpod', 'sezzle', 'kinsta'
  name: text("name").notNull(),
  atsProvider: text("ats_provider").notNull(), // 'ashby' | 'greenhouse' | 'lever'
  atsToken: text("ats_token").notNull(),
  websiteUrl: text("website_url"),
  careerPageUrl: text("career_page_url"),
  logoUrl: text("logo_url"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastSyncedAt: text("last_synced_at"),
  createdAt: text("created_at").notNull(),
});

// 2. Jobs Table
export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey(), // ${ats_provider}_${company_id}_${external_id}
    atsProvider: text("ats_provider").notNull(),
    atsJobId: text("ats_job_id").notNull(),
    companyId: text("company_id").notNull().references(() => companies.id),
    companyName: text("company_name").notNull(),
    companyWebsite: text("company_website"),
    companyLogo: text("company_logo"),
    jobTitle: text("job_title").notNull(),
    originalDescription: text("original_description").notNull(),
    cleanedDescription: text("cleaned_description").notNull(),
    location: text("location"),
    isRemote: integer("is_remote", { mode: "boolean" }).notNull().default(false),
    remoteEligibility: text("remote_eligibility").notNull().default("unknown"), // 'worldwide' | 'india' | 'apac' | 'us_only' | 'eu_only' | 'restricted' | 'hybrid' | 'onsite' | 'unknown'
    employmentType: text("employment_type").default("Full-time"),
    salaryMin: real("salary_min"),
    salaryMax: real("salary_max"),
    salaryCurrency: text("salary_currency"),
    salaryFrequency: text("salary_frequency").default("annual"),
    salaryFormatted: text("salary_formatted"),
    minExperience: real("min_experience"),
    maxExperience: real("max_experience"),
    experienceClassification: text("experience_classification").default("unspecified"), // '0-1' | '1-2' | '2-3' | '3-5' | '5+' | 'entry' | 'junior' | 'unspecified'
    experienceStated: integer("experience_stated", { mode: "boolean" }).notNull().default(false),
    extractedSkills: text("extracted_skills").notNull().default("[]"), // JSON string array
    jobCategory: text("job_category").default("software_engineering"),
    applicationUrl: text("application_url").notNull(),
    originalPostingDate: text("original_posting_date"),
    firstDiscoveredDate: text("first_discovered_date").notNull(),
    lastSynchronizedDate: text("last_synchronized_date").notNull(),
    status: text("status").notNull().default("active"), // 'active' | 'expired'
  },
  (table) => [
    index("job_posting_date_idx").on(table.originalPostingDate),
    index("job_status_idx").on(table.status),
    index("job_company_idx").on(table.companyId),
    index("job_ats_idx").on(table.atsProvider),
    index("job_salary_idx").on(table.salaryMin),
    index("job_experience_idx").on(table.experienceClassification),
  ]
);

// 3. Candidate Matches Table
export const matches = sqliteTable(
  "matches",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    jobId: text("job_id").notNull().unique().references(() => jobs.id),
    matchScore: integer("match_score").notNull(), // 0 to 100
    matchExplanation: text("match_explanation").notNull(),
    matchReasons: text("match_reasons").notNull(), // JSON string array
    matchedSkills: text("matched_skills").notNull(), // JSON string array
    missingSkills: text("missing_skills").notNull(), // JSON string array
    isEarlyCareer: integer("is_early_career", { mode: "boolean" }).notNull().default(false),
    roleRelevanceScore: integer("role_relevance_score").notNull(),
    techSkillsScore: integer("tech_skills_score").notNull(),
    experienceScore: integer("experience_score").notNull(),
    locationScore: integer("location_score").notNull(),
    salaryScore: integer("salary_score").notNull(),
    status: text("status").notNull().default("new"), // 'new' | 'saved' | 'dismissed' | 'applied'
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("match_score_idx").on(table.matchScore),
    index("match_status_idx").on(table.status),
  ]
);

// 4. Job Applications Tracker
export const applications = sqliteTable(
  "applications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    jobId: text("job_id").notNull().references(() => jobs.id),
    companyName: text("company_name").notNull(),
    jobTitle: text("job_title").notNull(),
    applicationUrl: text("application_url").notNull(),
    status: text("status").notNull().default("saved"), // 'saved' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected'
    appliedDate: text("applied_date"),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("application_status_idx").on(table.status),
    index("application_job_idx").on(table.jobId),
  ]
);

// 5. Synchronization Audit Logs
export const syncLogs = sqliteTable("sync_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  syncType: text("sync_type").notNull(), // 'manual' | 'scheduled'
  companiesCount: integer("companies_count").notNull(),
  successfulSyncs: integer("successful_syncs").notNull(),
  failedSyncs: integer("failed_syncs").notNull(),
  jobsFetched: integer("jobs_fetched").notNull(),
  newJobsCount: integer("new_jobs_count").notNull(),
  updatedJobsCount: integer("updated_jobs_count").notNull(),
  expiredJobsCount: integer("expired_jobs_count").notNull(),
  durationMs: integer("duration_ms").notNull(),
  details: text("details"), // JSON string summary
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at").notNull(),
});

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type SyncLog = typeof syncLogs.$inferSelect;

