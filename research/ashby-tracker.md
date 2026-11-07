# Reverse Engineering Report: Ashby Tracker (WhatRunsIndia / ats-jobs)

**Target URLs:** 
- Web: https://jobs.whatrunsindia.com/
- Core Repository: https://github.com/rishilahoti/ashby-job-scraper
- Extracted Library: https://github.com/rishilahoti/ats-jobs
**Investigation Date:** November 7, 2026  
**Investigator:** Huntly Research (REA Toolkit & Public GitHub Code Inspection)

---

## 1. Executive Summary

Ashby Tracker (hosted at `jobs.whatrunsindia.com`) is an open-source job aggregator indexing over 70,000 active positions across 4,000+ companies. 

Unlike closed commercial aggregators, the platform’s creator (Rishi Lahoti) open-sourced the entire platform under the MIT license across two complementary repositories:
1. **`ashby-job-scraper`**: The production full-stack application (Next.js 14 App Router frontend, PostgreSQL storage layer, diffing engine, and background scheduler).
2. **`ats-jobs`**: A zero-config, MIT-licensed standalone Node.js library (`npm install ats-jobs`) implementing direct HTTP ingestion and normalization for 10 major Applicant Tracking Systems.

The single most valuable architectural insight discovered is its automated company discovery engine: rather than scraping Google or using paid APIs, it leverages **Common Crawl’s CDX index API** to discover thousands of ATS subdomains and slugs automatically for free.

---

## 2. Architecture & Ecosystem Overview

```
                                 +-----------------------------+
                                 |   Common Crawl CDX API      |
                                 |  (index.commoncrawl.org)    |
                                 +--------------+--------------+
                                                |
                                    Discovers new ATS slugs
                                                |
                                                v
+-----------------------+        +-----------------------------+        +--------------------------+
|  Human User / +Add   | -----> |      Discovery Engine       | -----> |   PostgreSQL Database    |
|   Community Slugs     |        |    (src/discovery/index.js) |        |    (companies table)     |
+-----------------------+        +-----------------------------+        +------------+-------------+
                                                |                                    |
                                          Verifies board                             | Active companies
                                                |                                    v
                                                |                       +--------------------------+
                                                +---------------------> |   Cron Scrape Pipeline   |
                                                                        | (concurrency = 16, 12hr) |
                                                                        +------------+-------------+
                                                                                     |
                                                                        Uses ats-jobs adapters
                                                                                     |
                                                                                     v
                                                                        +--------------------------+
                                                                        |   10 Public ATS APIs     |
                                                                        | (Ashby, Greenhouse, ...) |
                                                                        +------------+-------------+
                                                                                     |
                                                                        Hashes content & diffs
                                                                                     |
                                                                                     v
                                                                        +--------------------------+
                                                                        |  PostgreSQL Jobs & FTS   |
                                                                        | (jobs, job_snapshots)    |
                                                                        +------------+-------------+
                                                                                     |
                                                                                     v
                                                                        +--------------------------+
                                                                        |  Next.js 14 App Router   |
                                                                        | (jobs.whatrunsindia.com) |
                                                                        +--------------------------+
```

---

## 3. The 10 ATS Adapters: Genuine Support vs. Tradeoffs

Ashby Tracker claims support for 10 ATS providers. Code inspection of `ats-jobs/lib/adapters/` and `ats-jobs/lib/fetch.js` confirms **genuine, production-tested implementations** for all 10, with critical architectural tradeoffs documented below:

| ATS Provider | Public Endpoint URL Pattern | Payload Structure | Description Ingestion |
|---|---|---|---|
| **Ashby** | `https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true` | JSON `{ jobs: [...] }` | Full plain & HTML descriptions + compensation breakdown |
| **Greenhouse** | `https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true` | JSON `{ jobs: [...] }` | Full HTML description, department, location |
| **Lever** | `https://api.lever.co/v0/postings/{slug}?mode=json` | JSON `[...]` | Full description, salary range object, commitments |
| **Workable** | `https://apply.workable.com/api/v1/widget/accounts/{slug}?details=true` | JSON `{ jobs: [...] }` | Full description, benefits, requirements |
| **Recruitee** | `https://{slug}.recruitee.com/api/offers/` | JSON `{ offers: [...] }` | Full description, requirements, tags |
| **Teamtailor** | `https://{slug}.teamtailor.com/jobs.json` | JSON `{ items: [...] }` | Full description, locations, tags (NA uses `{slug}.na.teamtailor.com`) |
| **Pinpoint** | `https://{slug}.pinpointhq.com/postings.json` | JSON `{ data: [...] }` | Full description, salary, department |
| **Keka** | `https://{slug}.keka.com/careers/` (HTML) $\to$ `/ats/documents/{orgId}/jobs` | HTML extraction $\to$ JSON | Two-stage: regex extracts orgId UUID, then fetches JSON |
| **SmartRecruiters** | `https://api.smartrecruiters.com/v1/companies/{slug}/postings?limit=100` | JSON `{ content: [...] }` | **Metadata only (no description)**. List endpoint omits description; requires N+1 detail fetches. |
| **Workday** | `https://{tenant}.{wdHost}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` | POST JSON `{ limit: 20, offset: N }` | **Metadata only (no description)**. List endpoint omits description; requires N+1 detail fetches. |

### The Workday & SmartRecruiters Tradeoff
As documented in the author’s source comments:
> *"The public `/wday/cxs/{tenant}/{site}/jobs` list endpoint has no description or employment-type field (only title/location/postedOn/remoteType) — full text only lives on a per-posting detail endpoint, one extra HTTP request per job. Shipping list-only data now, same tradeoff already accepted for SmartRecruiters."*

This is an important design choice for aggregators: making 100 extra HTTP requests per company to fetch descriptions for Workday causes aggressive rate-limiting. Storing list metadata only is often the correct engineering compromise.

---

## 4. Company Catalog & Discovery via Common Crawl

The platform tracks over **4,074 companies**, but `src/sources/registry.json` contains only **146 static seeds**. The remaining ~3,900+ companies were discovered automatically via Common Crawl.

### How Common Crawl CDX Discovery Works (`src/discovery/index.js`):
1. **Get Latest Crawl Index:**
   Queries `https://index.commoncrawl.org/collinfo.json` to get the latest index ID (e.g. `CC-MAIN-2026-42`).
2. **Query Hosted ATS Domains:**
   For path-based ATS platforms (Ashby, Greenhouse, Workable, SmartRecruiters), it queries:
   `https://index.commoncrawl.org/{indexId}-index?url=jobs.ashbyhq.com/*&output=json&fl=url`
   `https://index.commoncrawl.org/{indexId}-index?url=job-boards.greenhouse.io/*&output=json&fl=url`
   `https://index.commoncrawl.org/{indexId}-index?url=apply.workable.com/*&output=json&fl=url`
3. **Query Subdomain ATS Platforms:**
   For subdomain ATS platforms (Recruitee, Teamtailor, Pinpoint, Workday, Keka), it queries:
   `https://index.commoncrawl.org/{indexId}-index?url=*.recruitee.com&output=json&fl=url`
   `https://index.commoncrawl.org/{indexId}-index?url=*.myworkdayjobs.com&output=json&fl=url`
4. **Slug Extraction & Blacklist Filter:**
   Strips reserved prefixes (`www`, `api`, `auth`, `blog`, `meeting`, `status`).
5. **Active Verification:**
   Batches candidates in groups of 5 (`VERIFY_CONCURRENCY = 5`, `delay = 300ms`) and attempts a live HTTP fetch using `fetchJobBoard`.
6. **Database Persistence:**
   If the company job board returns HTTP 200 with valid listings, it is permanently added to PostgreSQL `companies`.

*Note on Lever:* Lever explicitly disallows `CCBot` in `robots.txt`, so Common Crawl does not index Lever job boards. Lever slugs are discovered via search engine queries or community submission.

---

## 5. Job Normalization & Diffing Engine

### A. Normalized Schema (`lib/normalize.js`)
```typescript
interface NormalizedJob {
  jobId: string;
  company: string;
  source: "ashby" | "greenhouse" | "lever" | "workable" | "recruitee" | "teamtailor" | "pinpoint" | "smartrecruiters" | "workday" | "keka";
  title: string;
  location: string | null;
  team: string | null;
  department: string | null;
  employmentType: string | null;
  remote: boolean;
  description: string | null; // Sanitized HTML
  applyUrl: string | null;
  jobUrl: string | null;
  publishedAt: string | null; // ISO 8601
  scrapedAt: string; // ISO 8601
  compensationSummary: string | null;
  contentHash: string; // SHA-256 / MD5 of title + location + description + applyUrl
}
```

### B. Content Hashing & Change Detection (`src/diff/index.js`)
Every job computes a deterministic `contentHash`. During synchronization:
- If a `jobId` does not exist in DB $\to$ `JOB_NEW`.
- If `jobId` exists but `contentHash` differs $\to$ `JOB_UPDATED`.
- If a previously active `jobId` is missing from the ATS response $\to$ `JOB_REMOVED` (marked `is_active = FALSE`).

This ensures expired jobs are detected instantly without making extra HTTP calls.

---

## 6. Automation & Scheduling Architecture

- **Execution Model:** Long-running container process managed by Docker Compose.
- **Scheduler:** `node-cron` running at a 12-hour cadence (`0 */12 * * *`).
- **Jitter Protection:** Implements randomized jitter (`Math.random() * jitterMaxMinutes * 60 * 1000`) before running the pipeline to avoid burst spikes against ATS endpoints.
- **Concurrency Management:** Scrapes up to 16 companies concurrently using promise pools with graceful error recovery (a failure in one company never affects others).
- **Audit Logging:** Every run logs to `scrape_runs` table (`jobs_fetched`, `jobs_inserted`, `jobs_updated`, `jobs_removed`, `status`, `error_message`).

---

## 7. Reusable Components for Huntly

1. **Direct Adoption of `ats-jobs` Package / Adapters:**
   The `ats-jobs` npm package is completely open-source (MIT). We can directly reuse its adapter logic for Workable, Recruitee, Teamtailor, Pinpoint, SmartRecruiters, and Workday without rewriting HTTP clients from scratch.
2. **Common Crawl CDX Discovery Engine:**
   Huntly can incorporate `src/discovery/index.js` as an offline discovery worker. In one run, Huntly can expand from 59 companies to 2,000+ verified startup career pages for free.
3. **Deterministic Content Hashing:**
   Adopting `contentHash` on `Job` records will allow Huntly to distinguish between real job modifications and redundant sync writes.

