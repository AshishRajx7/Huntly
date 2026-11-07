# Reverse Engineering Report: Freehire

**Target URLs:** 
- Web: https://freehire.me/
- Public API Docs: https://freehire.me/docs/api
- GitHub Repository: https://github.com/strelov1/freehire
**Investigation Date:** November 7, 2026  
**Investigator:** Huntly Research (REA Toolkit & Public GitHub Code Inspection)

---

## 1. Executive Summary

Freehire (`freehire.me`) is an open-source, large-scale job search engine indexing over **7.29 million active positions** from **421 sources** (including 160 multi-tenant ATS platforms, third-party aggregators, and direct company careers portals).

The system is authored in Go by Valentin Strelov and structured as a clean monolithic backend (`cmd/server`) backed by PostgreSQL (with SQLC) and Meilisearch, paired with independent run-once-and-exit CLI workers for crawling, enrichment, and index draining. 

Freehire exposes a comprehensive public REST API (`https://freehire.me/api/v1`) with 141 endpoints, including an unauthenticated, CORS-enabled **`GET /agent/jobs/search`** endpoint explicitly built for AI agents. This endpoint provides deep structured LLM enrichment (skills, min experience years, requirements, education, and "ghost job" / fake freshness detection) with a generous 120 req/min rate limit.

---

## 2. System Architecture & Topology

```
+---------------------------------------------------------------------------------------------------+
|                                         FREEHIRE BACKEND                                          |
|                                                                                                   |
|  +--------------------+         +--------------------------------------------------------------+  |
|  | Run-Once Workers   |         |                      PostgreSQL Database                     |  |
|  | (cron triggered)   | ------> |                                                              |  |
|  | - cmd/ingest       |         | - boards (single-row catalog: status = pending/active/retired|  |
|  | - cmd/search-drain |         | - jobs (canonical postings & external_id mappings)           |  |
|  | - cmd/reindex      |         | - search_outbox (incremental change queue for search index)  |  |
|  | - cmd/liveness     |         +------------------------------+-------------------------------+  |
|  +--------------------+                                        |                                  |
|                                                                | (search_drain worker)            |
|                                                                v                                  |
|  +--------------------+         +--------------------------------------------------------------+  |
|  | API Server         | <-----> |                      Meilisearch Engine                      |  |
|  | (cmd/server, Go)   |         | (Instant typo-tolerant search, facet snapshots, intent parse)|  |
|  +---------+----------+         +--------------------------------------------------------------+  |
|            |                                                                                      |
+------------+--------------------------------------------------------------------------------------+
             |
             +----------------------------+----------------------------+
             |                            |                            |
             v                            v                            v
   +--------------------+       +--------------------+       +--------------------+
   | SvelteKit Web UI   |       |   AI Agents API    |       | Human Candidate CV |
   | (freehire.me)      |       | (/agent/jobs/search|       | Match Analysis API |
   +--------------------+       +--------------------+       +--------------------+
```

### Architectural Distinctions:
1. **Zero Long-Running Daemon Queues:** Freehire intentionally avoids background queue daemons (no Redis, Celery, BullMQ, or Kafka). Crawlers and index rebuilders are standalone CLI executables triggered by system cron that execute their task and immediately terminate.
2. **Postgres-Backed Outbox Pattern:** All changes that must reach the search engine are written transactionally to a `search_outbox` table in Postgres. A separate drain worker consumes the outbox and batches updates into Meilisearch.

---

## 3. The Board Catalog & "Single-Row Addition"

Freehire’s previous architecture stored company configurations across static YAML files (`sources/*.yml`). This was completely deprecated in favor of a declarative database table: `boards`.

### Key Catalog Principles (`internal/ingest/boardcatalog/AGENTS.md`):
- **Catalog as Schedule:** `cmd/ingest <provider>` reads `status IN ('pending', 'active')` for that provider. No cron configuration files or code changes are needed to add a company.
- **The "Single-Row Addition":** To add any company career board to the entire ingestion engine, a single row is inserted into `boards`:
  ```sql
  INSERT INTO boards (provider, board, region, status)
  VALUES ('greenhouse', 'stripe', 'us', 'pending');
  ```
- **Self-Promoting Lifecycle (`pending -> active`):**
  - A newly added company begins in `status = 'pending'`.
  - The crawler automatically crawls it on its next run.
  - If the crawl completes with HTTP 200 and valid jobs, `pipeline.Runner` atomically flips `pending -> active`.
  - If the board 404s or fails, it remains `pending` and provides immediate health audit telemetry.
- **Non-Destructive Retirement:** Deletion is forbidden. When a company shuts down or changes ATS, its board is marked `status = 'retired'`. The system immediately cascades a soft close on all active postings (`closed_reason = 'board_retired'`).
- **Composite Unique Index:**
  ```sql
  UNIQUE (provider, lower(board), region) WHERE status IN ('pending', 'active')
  ```

---

## 4. ATS Adapter Coverage (160 ATS Platforms)

Freehire implements 421 adapters in Go (`internal/ingest/sources`), with 160 multi-tenant ATS platforms representing over 3.82 million active postings:

| Provider | Open Postings Indexed | Architecture / Method |
|---|---|---|
| **Workday** | 570,441 | JSON POST to `/wday/cxs/{tenant}/{site}/jobs` |
| **Oracle Cloud** | 290,445 | Oracle CX candidate experience REST APIs |
| **SuccessFactors** | 212,320 | SAP SuccessFactors career portal JSON feeds |
| **SmartRecruiters** | 171,609 | REST API `/v1/companies/{slug}/postings` |
| **Greenhouse** | 132,998 | Boards API `boards-api.greenhouse.io/v1/boards/{slug}/jobs` |
| **UKG (Ultimate)** | 107,763 | UKG Pro candidate portal feeds |
| **Manatal** | 103,856 | Manatal public board APIs |
| **Paycom** | 101,088 | Paycom candidate portal feeds |
| **Paylocity** | 83,429 | Paylocity recruiting endpoints |
| **ADP** | 79,370 | ADP Workforce Now / myjobs APIs |
| **iCIMS** | 69,386 | iCIMS job portal REST feeds |
| **Teamtailor** | 68,078 | JSON feed `{slug}.teamtailor.com/jobs.json` |
| **Workable** | 59,556 | Widget API `/api/v1/widget/accounts/{slug}` |
| **Ashby** | 49,671 | Posting API `api.ashbyhq.com/posting-api/job-board/{slug}` |
| **BambooHR** | 48,168 | `{slug}.bamboohr.com/careers/list` |
| **Recruitee** | 44,927 | `{slug}.recruitee.com/api/offers/` |
| **Lever** | 38,228 | `api.lever.co/v0/postings/{slug}?mode=json` |

---

## 5. Job Normalization & AI Enrichment

Freehire normalizes jobs into a rich schema featuring offline LLM-generated semantic attributes:

```typescript
interface FreehireJob {
  public_slug: string; // e.g. "backend-engineer-cycode-754bcs75"
  source: string; // ATS identifier (e.g. "comeet", "greenhouse", "ashby")
  external_id: string; // Board ID + Native Job ID
  url: string; // Direct application URL (with UTM tracking)
  title: string;
  company: string;
  company_slug: string;
  location: string;
  description: string; // Sanitized HTML
  countries: string[]; // ISO codes (e.g. ["us", "in"])
  regions: string[]; // e.g. ["north_america", "asia"]
  work_mode: "remote" | "hybrid" | "onsite";
  skills: string[]; // Normalized tags: ["docker", "kubernetes", "postgresql", "python"]
  is_tech: "tech" | "non_tech";
  posted_at: string;
  created_at: string;
  updated_at: string;
  last_seen_at: string;
  closed_at: string | null;
  enrichment: {
    summary: string;
    relocation: "supported" | "not_supported";
    experience_years_min: number; // e.g. 1, 2, 4
    education_level: "bachelor" | "master" | "phd" | "none";
    category: "backend" | "frontend" | "fullstack" | "devops" | "data";
    domains: string[]; // e.g. ["cybersecurity", "ai", "fintech"]
    requirements: Array<{ text: string; priority: "required" | "preferred" }>;
  };
  reality: {
    class: "fresh" | "stale" | "ghost";
    age_days: number;
    repost_count: number;
    mass_posting_count: number;
    fake_freshness: boolean;
  };
}
```

### The "Reality" Metric (Ghost Job Detection)
Freehire tracks whether a job posting is a "ghost job" or fake freshness repost:
- `fake_freshness`: Detects when an ATS updates `updated_at` without changing job content.
- `repost_count`: Tracks how many times the exact same job was deleted and reposted.
- `age_days`: The true age since initial discovery, ignoring artificial bump dates.

---

## 6. Public REST API & Agent Integration

Freehire provides one of the cleanest public APIs in the entire aggregation ecosystem:

- **Base URL:** `https://freehire.me/api/v1`
- **Rate Limit:** 120 requests/minute per IP (header: `x-ratelimit-limit: 120`).
- **Authentication:** None required for reading jobs, search, and companies.

### Key Endpoints:
1. **`GET /agent/jobs/search?q={query}&limit={n}`**:
   Specifically crafted for AI agents. Returns complete LLM enrichment, categorized requirements, min experience years, normalized skill arrays, and ghost job reality metrics.
2. **`GET /jobs?limit={n}&offset={m}&source={ats}&work_mode={mode}`**:
   Standard paginated listings with filter support.
3. **`GET /jobs/facets`**:
   Precomputed distributions for country, skill, category, and work mode.
4. **`GET /jobs/{slug}/match`**:
   Calculates semantic alignment against a candidate resume.

---

## 7. Strategic Recommendations for Huntly

1. **Leverage Freehire as a Live Enrichment Data Source:**
   Rather than building and maintaining 160 scrapers in Huntly, Huntly can query `https://freehire.me/api/v1/agent/jobs/search` directly for candidate matching. It is free, unauthenticated, has no CAPTCHA, and provides pre-parsed skills and experience levels.
2. **Adopt the Single-Row `boards` Table Model:**
   Huntly should structure its SQLite `companies` table identically: `(name, ats_type, ats_token, status)`. Adding new target startups is a single row write without code redeployment.
3. **Implement Ghost Job / Stale Detection:**
   Incorporating Freehire's `reality` flags (`age_days` and `fake_freshness`) will prevent Huntly from recommending zombie job postings that have been open for months without real hiring intent.

