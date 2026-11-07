# Huntly Architectural Integration Recommendation

**Phase:** Huntly Phase 2A Synthesis & Strategic Roadmap  
**Date:** November 7, 2026  
**Author:** Huntly Core Research Team

---

## 1. Evaluation of Strategic Integration Options

Before finalizing Huntly's Phase 2 roadmap, we evaluated four distinct architectural strategies based on real-world evidence gathered from reverse engineering **Jobs with Startups**, **Ashby Tracker**, **Freehire**, **JobPin**, and **HuntYourTribe**.

---

### Option A: Direct Ingestion
*Huntly implements additional ATS adapters directly (e.g. Workable, Keka, Rippling, Recruitee) and syncs each company independently.*

- **Pros:**
  - 100% self-contained; zero dependency on external third-party aggregators or APIs that could change or shut down.
  - Full control over request cadence, payload retention, and custom headers.
  - Can reuse battle-tested adapter logic directly from `ats-jobs` (MIT).
- **Cons:**
  - Requires maintaining company tokens/slugs manually or semi-manually.
  - Network and processing load scales linearly with the number of tracked companies (syncing 1,000 companies requires 1,000+ HTTP requests every 12 hours).
  - Limited to companies already present in Huntly's local registry.

---

### Option B: Upstream Ingestion
*Huntly consumes public APIs / MCP endpoints from upstream aggregators (Freehire's `GET /api/v1/agent/jobs/search` and HuntYourTribe's `api.huntyourtribe.com/mcp`).*

- **Pros:**
  - Instant access to millions of jobs without running large crawl batches.
  - Freehire provides pre-computed LLM enrichment (skills, min experience, education, ghost job detection).
  - HuntYourTribe delivers pre-filtered, verified Indian startup jobs with a strict 60-day freshness guarantee.
  - Minimal local compute and network overhead; Huntly remains an extremely light, snappy personal application.
- **Cons:**
  - Vulnerable to upstream schema migrations, rate limiting, or service downtime.
  - Upstream data may occasionally miss very newly posted roles if their sync cadence lags.
  - Huntly cannot independently force a re-crawl of a specific company on demand.

---

### Option C: Hybrid Approach (Recommended)
*Huntly maintains direct ATS ingestion for high-priority curated companies (50-200 target startups), while simultaneously consuming upstream aggregator endpoints (Freehire Agent API + HuntYourTribe MCP) for wide-net ecosystem discovery.*

- **Pros:**
  - **Best of both worlds:** Guaranteed reliability and real-time freshness for the user's top dream companies (direct ATS fetch), plus massive breadth across thousands of startups (Freehire + HYT).
  - Fast execution: Direct adapters are already working in Huntly (Ashby, Greenhouse, Lever); adding Freehire and HYT ingestion workers takes less than 150 lines of code.
  - Immediate coverage of Bangalore, India, and worldwide remote roles matching the candidate profile (0–2 years, Node.js, TypeScript, PostgreSQL, Redis, Python).
- **Cons:**
  - Requires robust cross-source deduplication (e.g., if a role is ingested both directly from Greenhouse and via Freehire).

---

### Option D: Autonomous Discovery
*Huntly adopts Ashby Tracker's Common Crawl CDX discovery pipeline to find new companies automatically, then ingests them directly.*

- **Pros:**
  - Discovers thousands of startup ATS boards completely free, without paid Google/LinkedIn search APIs or CAPTCHAs.
  - Grows Huntly's company catalog automatically over time.
- **Cons:**
  - Common Crawl CDX queries are resource-intensive and prone to 503 load shedding from Common Crawl's public index servers.
  - Validating thousands of crawled slugs requires hundreds of HTTP verification requests, which is overkill for a personal single-user platform.
  - Lever explicitly blocks Common Crawl in `robots.txt`, requiring separate workarounds.

---

## 2. Final Strategic Decisions

### Decision 1: What is the single best approach for Huntly?
**The Hybrid Approach (Option C)** is the undisputed superior path.
- Huntly is a personal job discovery tool, not a public commercial SaaS. The goal is discovering high-signal software engineering opportunities (0–2 years experience, Bangalore / Remote) as quickly and efficiently as possible without burning local resources.
- Direct ATS sync provides guaranteed immediate updates for core dream startups.
- Upstream ingestion from Freehire's `/agent/jobs/search` and HuntYourTribe's `/mcp` provides access to 7+ million jobs and thousands of India startups with zero infrastructure footprint.

---

### Decision 2: Which ATS platforms should Huntly support in Phase 2?
Huntly already has verified, working native adapters for **Ashby**, **Greenhouse**, and **Lever**. In Phase 2, Huntly should expand direct support to:
1. **Keka (`keka_api`)**: Essential for Indian startups and SMBs (dominant in Bangalore, Hyderabad, Pune).
2. **Workable (`workable`)**: Widely used by early-stage seed and Series A startups; returns full job descriptions in a single JSON call (`https://apply.workable.com/api/v1/widget/accounts/{slug}?details=true`).
3. **Rippling (`rippling`)**: Modern Silicon Valley startups frequently use Rippling (`https://api.rippling.com/platform/api/ats/v1/board/{slug}/jobs`).

*Note on Workday:* Huntly should **NOT** build a native Workday scraper. Workday requires complex compound slugs (`tenant/host/site`), returns list metadata only without descriptions, and requires N+1 requests per job. Huntly can ingest Workday jobs effortlessly via Freehire's pre-scraped API.

---

### Decision 3: How should Huntly discover new companies automatically?
Huntly should use a **two-pronged discovery mechanism**:
1. **Upstream Discovery Harvest:** When Huntly queries Freehire and HuntYourTribe for Bangalore and remote backend engineering roles, any newly encountered company with a detected ATS URL is automatically upserted into Huntly’s local `companies` table.
2. **Common Crawl Seed Enrichment (Batch Script):** Huntly should include an offline script (`scripts/discover-companies.ts`) implementing Ashby Tracker's CDX index query against `jobs.ashbyhq.com/*` and `job-boards.greenhouse.io/*`. This can be run on-demand once a month to harvest 500+ new verified startup slugs into the local SQLite database.

---

### Decision 4: Should Huntly consume Freehire's or HYT's public APIs?
**Yes, absolutely.** Both platforms provide completely public, unauthenticated, high-throughput endpoints specifically intended for automated agents:
1. **Freehire Agent API (`GET https://freehire.me/api/v1/agent/jobs/search`)**:
   - Query: `?q=backend+engineer&work_mode=remote&is_tech=tech&limit=50`
   - Unauthenticated rate limit: 120 req/min.
   - Provides pre-parsed skills, experience level, and ghost job reality metrics.
2. **HuntYourTribe MCP (`POST https://api.huntyourtribe.com/mcp`)**:
   - Method: `tools/call` with `search_jobs` (`city: "Bengaluru"`, `job_role: "software-engineer"`, `min_experience_years: 2`).
   - Rate limit: 600 req/min with open CORS.
   - Enforces a strict 60-day freshness guarantee and covers India tech companies.

Consuming these APIs replaces weeks of custom scraper development with two lightweight HTTP clients.

---

### Decision 5: How should Huntly handle deduplication and expired listings?
1. **Cross-Source Deduplication:**
   - Every job calculates a deterministic `dedup_key` based on `normalize(company_name) + ":" + normalize(job_title) + ":" + normalize(primary_location)`.
   - If an incoming job from Freehire or HYT matches an existing active job from a direct ATS sync, the record is merged (favoring the direct ATS application URL).
2. **Content Hashing:**
   - Calculate `content_hash = sha256(title + location + description + apply_url)` to avoid touching `updated_at` timestamps on unchanged listings.
3. **Expiration & Soft Deletion:**
   - **Direct ATS Sync:** If a `job_id` previously active for a company is missing during an ATS sync, mark `status = 'expired'` and `is_active = FALSE`. Never hard-delete.
   - **60-Day Freshness Filter:** Automatically filter out any job where `posted_at < date('now', '-60 days')` from the "AI Matches" and "Discover Jobs" dashboard views.

---

### Decision 6: What database schema changes are required?
Huntly's existing SQLite schema in `src/lib/db/schema.ts` is solid but requires minor column additions to support multi-source ingestion and deep matching:

```sql
-- Enhancements to companies table
ALTER TABLE companies ADD COLUMN ats_url TEXT;
ALTER TABLE companies ADD COLUMN careers_url TEXT;
ALTER TABLE companies ADD COLUMN is_yc BOOLEAN DEFAULT 0;
ALTER TABLE companies ADD COLUMN funding_stage TEXT;
ALTER TABLE companies ADD COLUMN status TEXT DEFAULT 'active'; -- 'active', 'pending', 'retired'

-- Enhancements to jobs table
ALTER TABLE jobs ADD COLUMN dedup_key TEXT;
ALTER TABLE jobs ADD COLUMN content_hash TEXT;
ALTER TABLE jobs ADD COLUMN min_experience_years INTEGER;
ALTER TABLE jobs ADD COLUMN work_mode TEXT; -- 'remote', 'hybrid', 'onsite'
ALTER TABLE jobs ADD COLUMN source_provider TEXT; -- 'direct_ats', 'freehire', 'huntyourtribe'
ALTER TABLE jobs ADD COLUMN is_ghost_job BOOLEAN DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_jobs_dedup_key ON jobs(dedup_key);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs(posted_at);
CREATE INDEX IF NOT EXISTS idx_jobs_min_exp ON jobs(min_experience_years);
```

---

### Decision 7: How does this impact the candidate matching engine?
The candidate profile is configured as:
- **Experience:** 0–2 years (target 1 year).
- **Target Roles:** Software Engineer, SDE 1, Backend Engineer, Platform Engineer.
- **Skills:** Node.js, TypeScript, NestJS, PostgreSQL, Redis, Python, Docker.
- **Locations:** Bangalore, India, Worldwide Remote.
- **Salary:** ₹15 LPA+ or $40k+ annually.

With structured attributes available from Freehire and HYT, the matching score can be computed with extreme accuracy:
1. **Hard Filter:** Exclude jobs where `min_experience_years > 2` or titles contain `Senior`, `Staff`, `Principal`, `Lead`, `Manager`.
2. **Location Filter:** `location` matches "Bangalore", "Bengaluru", "India", or `work_mode == 'remote'`.
3. **Skill Overlap Score:** High boost (+20 pts each) for `typescript`, `nodejs`, `nestjs`, `postgresql`, `redis`, `python`, `docker`.
4. **Freshness Multiplier:** Boost postings under 14 days old (+15 pts); decay postings between 30–60 days; drop postings >60 days.

---

### Decision 8: What are the concrete next steps for implementation?

1. **Step 1: Database Migration**
   - Apply the non-destructive schema additions (`min_experience_years`, `work_mode`, `dedup_key`, `content_hash`, `source_provider`) to `src/lib/db/schema.ts`.
2. **Step 2: Add Upstream Ingestion Clients**
   - Implement `src/lib/ingestion/upstream/freehire-client.ts` consuming `https://freehire.me/api/v1/agent/jobs/search`.
   - Implement `src/lib/ingestion/upstream/huntyourtribe-client.ts` consuming `https://api.huntyourtribe.com/mcp` via Streamable HTTP.
3. **Step 3: Expand Direct ATS Adapters**
   - Port the Keka and Workable adapter logic from `ats-jobs` into `src/lib/ats/keka.ts` and `src/lib/ats/workable.ts`.
4. **Step 4: Update Normalizer & Deduplication**
   - Integrate `dedup_key` generation and 60-day freshness window into `src/lib/normalization/normalizer.ts`.
5. **Step 5: Automated Sync Cron & Dashboard Integration**
   - Wire the hybrid sync (direct ATS + upstream queries) into `src/lib/sync/sync-service.ts`.
   - Update Dashboard queries to display company funding stage, YC badges, and verified direct ATS apply links.

