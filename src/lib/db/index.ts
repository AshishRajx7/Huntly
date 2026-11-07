import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), "huntly.db");

// Ensure directory exists
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const sqlite = new Database(dbPath);
// Enable WAL mode for high performance concurrent reads and writes
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Auto-initialize tables if they don't exist
export function initDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ats_provider TEXT NOT NULL,
      ats_token TEXT NOT NULL,
      website_url TEXT,
      career_page_url TEXT,
      logo_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_synced_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      ats_provider TEXT NOT NULL,
      ats_job_id TEXT NOT NULL,
      company_id TEXT NOT NULL REFERENCES companies(id),
      company_name TEXT NOT NULL,
      company_website TEXT,
      company_logo TEXT,
      job_title TEXT NOT NULL,
      original_description TEXT NOT NULL,
      cleaned_description TEXT NOT NULL,
      location TEXT,
      is_remote INTEGER NOT NULL DEFAULT 0,
      remote_eligibility TEXT NOT NULL DEFAULT 'unknown',
      employment_type TEXT DEFAULT 'Full-time',
      salary_min REAL,
      salary_max REAL,
      salary_currency TEXT,
      salary_frequency TEXT DEFAULT 'annual',
      salary_formatted TEXT,
      min_experience REAL,
      max_experience REAL,
      experience_classification TEXT DEFAULT 'unspecified',
      experience_stated INTEGER NOT NULL DEFAULT 0,
      extracted_skills TEXT NOT NULL DEFAULT '[]',
      job_category TEXT DEFAULT 'software_engineering',
      application_url TEXT NOT NULL,
      original_posting_date TEXT,
      first_discovered_date TEXT NOT NULL,
      last_synchronized_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE INDEX IF NOT EXISTS job_posting_date_idx ON jobs(original_posting_date);
    CREATE INDEX IF NOT EXISTS job_status_idx ON jobs(status);
    CREATE INDEX IF NOT EXISTS job_company_idx ON jobs(company_id);
    CREATE INDEX IF NOT EXISTS job_ats_idx ON jobs(ats_provider);
    CREATE INDEX IF NOT EXISTS job_salary_idx ON jobs(salary_min);
    CREATE INDEX IF NOT EXISTS job_experience_idx ON jobs(experience_classification);

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id),
      match_score INTEGER NOT NULL,
      match_explanation TEXT NOT NULL,
      match_reasons TEXT NOT NULL,
      matched_skills TEXT NOT NULL,
      missing_skills TEXT NOT NULL,
      is_early_career INTEGER NOT NULL DEFAULT 0,
      role_relevance_score INTEGER NOT NULL,
      tech_skills_score INTEGER NOT NULL,
      experience_score INTEGER NOT NULL,
      location_score INTEGER NOT NULL,
      salary_score INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS match_score_idx ON matches(match_score);
    CREATE INDEX IF NOT EXISTS match_status_idx ON matches(status);

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL REFERENCES jobs(id),
      company_name TEXT NOT NULL,
      job_title TEXT NOT NULL,
      application_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'saved',
      applied_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS application_status_idx ON applications(status);
    CREATE INDEX IF NOT EXISTS application_job_idx ON applications(job_id);

    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_type TEXT NOT NULL,
      companies_count INTEGER NOT NULL,
      successful_syncs INTEGER NOT NULL,
      failed_syncs INTEGER NOT NULL,
      jobs_fetched INTEGER NOT NULL,
      new_jobs_count INTEGER NOT NULL,
      updated_jobs_count INTEGER NOT NULL,
      expired_jobs_count INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      details TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT NOT NULL
    );
  `);
}

// Run table initialization
initDb();

