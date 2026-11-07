# Cross-Platform Comparison: Job Aggregator Reverse Engineering

**Investigation Date:** November 7, 2026  
**Investigator:** Huntly Research (REA Toolkit & Live Evidence Verification)  
**Target Platforms:** Jobs with Startups, Ashby Tracker, Freehire, JobPin, HuntYourTribe

---

## 1. Technical Architecture & Ingestion Capabilities

| Metric / Dimension | Jobs with Startups | Ashby Tracker (WhatRunsIndia) | Freehire | JobPin | HuntYourTribe |
|---|---|---|---|---|---|
| **Target URL** | `jobswithstartups.com` | `jobs.whatrunsindia.com` | `freehire.me` | `jobpin.com` | `huntyourtribe.com` |
| **Frontend Framework** | Next.js 14+ (App Router) + Mantine UI | Next.js 14+ (App Router) + Tailwind CSS | SvelteKit + Tailwind CSS | Astro (SSG + Hybrid SSR) | Next.js 14+ (App Router) + Tailwind CSS |
| **Backend Runtime** | Node.js (Vercel Serverless) | Node.js (Docker container) | Go (Monolith `cmd/server` + run-once CLI workers) | Cloudflare Pages / Workers Edge | Node.js (Next.js serverless) on Cloudflare |
| **Database & Search** | Supabase (PostgreSQL) | PostgreSQL (`pg` pool, `tsvector` FTS) | PostgreSQL (SQLC) + Meilisearch | Edge In-Memory Static JSON Index | PostgreSQL (Supabase / Cloudflare Edge) |
| **Tracked Companies** | 4,792 companies | 4,074+ companies | 25,000+ companies | 807 curated startups | 1,715 tech startups & SMBs |
| **Active Jobs Indexed** | ~15,000+ jobs | 70,000+ jobs | 7,297,778 active jobs | 10,662 active jobs | 28,487 live jobs |
| **Supported ATS Providers** | 4 verified: Greenhouse, Ashby, Lever, Rippling | 10 verified: Ashby, Greenhouse, Lever, Workable, Recruitee, Teamtailor, Pinpoint, SmartRecruiters, Workday, Keka | 160 ATS platforms (Workday, Oracle, SAP, Greenhouse, Lever, Ashby, iCIMS, ADP, SmartRecruiters, etc.) | 7 verified: Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee, Personio | 5 verified: Workday, Greenhouse, Lever, Ashby, Keka |
| **Company Discovery Approach** | YC directory scrape + investor portfolios + `/startups/add` crowdsourcing | **Common Crawl CDX API** automated crawler (`src/discovery/index.js`) + seed registry + `/api/companies` | Declarative `boards` catalog + automated crawler sweep + community links | Manual curation + tech ecosystem research across 7 countries | Curated focus on India startups (<5,000 headcount) + automated ATS board sync |
| **Sync Cadence & Mechanism** | Daily batch sync with `enriched_at` / `updated_at` timestamps | 12-hour cron (`node-cron`) with randomized jitter; 16 concurrent company workers | Run-once cron workers (`cmd/ingest`); single-row `boards` table promotion | Daily automated ATS sync; Cloudflare edge SWR cache (86,400s) | Continuous daily sync with Wednesday & Saturday email alert triggers |

---

## 2. Data Quality, Search, Matching & API Access

| Metric / Dimension | Jobs with Startups | Ashby Tracker (WhatRunsIndia) | Freehire | JobPin | HuntYourTribe |
|---|---|---|---|---|---|
| **Normalization Completeness** | High (Schema.org `JobPosting`, JSON-LD, slugified routes) | Very High (Content hash, clean HTML, team, dept, employment type) | Exceptional (Deep normalization, countries, metros, work_mode, public slug) | High (Schema.org `JobPosting`, direct ATS ID in URL) | Very High (Standardized schema, direct ATS apply URL, clean markdown) |
| **Compensation Extraction** | Disclosed annual salary ranges parsed from ATS fields | Parsed compensation tiers from Ashby/Lever summaries | Structured salary fields (min, max, currency, interval) | Parsed annual salary ranges from Greenhouse/Personio | Extracted when available in ATS description |
| **Skills & Requirement Parsing** | Basic role/industry taxonomy tagging | Compound word keyword indexing; location normalizer | Deep LLM enrichment: explicit skill arrays, min experience years, required vs preferred | Role categories (Engineering, Sales, Ops, Marketing, Design) | Structured skill array (`['nodejs', 'typescript']`) + integer `min_experience_years` |
| **Freshness & Expiration Policy** | `updated_at` audit; "New this week" filters | Deterministic content hashing; diff engine marks `is_active = FALSE` when removed | 14-day unseen window (`search.UnseenWindow`); detects "fake freshness" & ghost reposts | Daily ATS diffing; stale listings pruned automatically | **Strict 60-day hard cutoff**: zero listings older than 60 days allowed |
| **Search Capabilities** | Taxonomy matrix (Role x Location x Stage x YC) | PostgreSQL `tsvector` with canonical location normalizer | Meilisearch instant search + facet snapshots + intent parsing | Embedded 50 KB JSON autocomplete (0ms latency) + static SEO hubs | Multi-attribute search (role, city, skills, work mode, min experience) |
| **Candidate Matching** | Delegated to user AI client via MCP prompts | None (Pure search aggregator with AI daily digest) | Advanced: CV Builder + `/jobs/{slug}/match` LLM comparison | None (Static directory) | Automated matching for email alerts + MCP agent integration |
| **Public API / MCP Availability** | Public MCP Server (`/mcp`) with 4 tools (Streamable HTTP & stdio) | None public (Direct web UI; open-source library `ats-jobs` on npm) | **Massive Public REST API** (`api/v1`) with 141 endpoints including `GET /agent/jobs/search` | None (Public API disallowed in `robots.txt`) | **Production MCP Server** (`api.huntyourtribe.com/mcp`) with 4 tools (Streamable HTTP) |
| **Rate Limits & Anti-Bot** | Open read-only; service-load shedding | Self-hosted instance; no public rate limit | 120 req/min unauthenticated (`x-ratelimit-limit: 120`); Cloudflare protected | Cloudflare Turnstile / Bot Management; `/api/` blocked | 600 req/min (`x-ratelimit-limit: 600`); open CORS `*` |
| **Open Source / Code License** | Proprietary web app (Public MCP endpoint) | **100% Open Source (MIT)** (`ashby-job-scraper` & `ats-jobs`) | **100% Open Source (GPL/MIT)** (`strelov1/freehire`) | Proprietary web app | Proprietary web app (Public MCP endpoint) |

---

## 3. Core Architectural Takeaways for Huntly

1. **Discovery Architecture Winner: Ashby Tracker's Common Crawl CDX Engine**
   - Querying Common Crawl's CDX Server API (`index.commoncrawl.org`) is the undisputed best mechanism for discovering thousands of live company ATS boards without scraping Google, paying for proxies, or running fragile browser scripts.
2. **Multi-ATS Integration Winner: Rishi Lahoti's `ats-jobs` Library**
   - The MIT-licensed `ats-jobs` library handles 10 major ATS platforms (Ashby, Greenhouse, Lever, Workable, Recruitee, Teamtailor, Pinpoint, SmartRecruiters, Workday, Keka) with clean normalized outputs in pure Node.js.
3. **External Real-Time Aggregator Winner: Freehire's Agent API**
   - Freehire's `GET https://freehire.me/api/v1/agent/jobs/search` allows Huntly to fetch pre-enriched jobs (with min experience years, parsed skills, and ghost-job reality checks) from 7.29 million listings at 120 req/min with zero authentication or keys.
4. **Target Market & Freshness Winner: HuntYourTribe's 60-Day Policy & MCP**
   - For an early-career engineer targeting Bangalore and India startups, HuntYourTribe's strict 60-day freshness rule and Keka ATS integration provide the highest signal-to-noise ratio in the ecosystem. Its MCP endpoint (`api.huntyourtribe.com/mcp`) can be queried directly via SSE at 600 req/min.

