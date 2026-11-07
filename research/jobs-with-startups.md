# Reverse Engineering Report: Jobs with Startups

**Target URL:** https://jobswithstartups.com/  
**Investigation Date:** November 7, 2026  
**Investigator:** Huntly Research (REA Toolkit & Browser Scenario Capture)

---

## 1. Executive Summary

Jobs with Startups (JWS) is a modern tech and startup job aggregator focusing on venture-backed startups (Seed through Series D+ and Y Combinator alumni). As of November 2026, it tracks **4,792 companies** and thousands of active job postings. 

The platform is architected around a headless Next.js frontend on Vercel with a Supabase PostgreSQL backend. A key architectural highlight is its dual-interface model: human users interact via a web interface powered by React Server Components (RSC) and Mantine UI, while AI agents interact via a native Model Context Protocol (MCP) server exposing 4 dedicated tools (`search_jobs`, `get_job`, `search_startups`, `get_startup`).

Data ingestion relies on direct public APIs of major ATS platforms—primarily Greenhouse, Ashby, Lever, and Rippling—supplemented by metadata enrichment (investors, funding stage, YC batches).

---

## 2. Frontend Architecture & Technology Stack

| Layer | Technology | Evidence / Details |
|---|---|---|
| **Framework** | Next.js 14+ (App Router) | React Server Components (`_rsc` query parameters), `rsc` payloads |
| **Bundler** | Turbopack | `/_next/static/immutable/chunks/turbopack-*.js` chunks |
| **Rendering** | SSR + ISR with Client Hydration | Server-side rendered HTML with JSON-LD, streaming RSC for route transitions |
| **UI Components** | Mantine UI | CSS modules (`AppMantineProvider`, `mcp-guide-module__W8HeYG__*`), Mantine grid & theme tokens |
| **Icons** | Lucide React | `lucide lucide-search`, `lucide-briefcase-business`, `lucide-building2`, `lucide-file-search` |
| **Hosting & CDN** | Vercel | `server: Vercel`, `x-vercel-id: bom1::iad1::*` |
| **Analytics & Telemetry** | PostHog | Reverse-proxied PostHog at `/relay/array/phc_mZExuhMQHKvuuDze39FBAAXFc47CrxCmkRmrFKy2FSTE/config.js` & `posthog-recorder.js` |
| **Database & Backend** | Supabase (PostgreSQL) | Explicit footer credit `"Powered by Supabase"`, standard Supabase UUID schema format |

---

## 3. Endpoints & API Topology

### A. Model Context Protocol (MCP) Server
Jobs with Startups provides an open MCP interface:
- **Base Endpoint:** `https://jobswithstartups.com/mcp`
- **Transport:** Streamable HTTP (SSE / JSON-RPC 2.0) and stdio bridge (`npx -y mcp-remote https://jobswithstartups.com/mcp`)
- **Authentication:** None required (public read-only)
- **Available Tools:**
  1. `search_jobs`: Search active roles by keywords, workplace type (remote/hybrid/onsite), employment type, industry, company size, investor, funding stage, or Y Combinator status. Returns job summaries and canonical URLs.
  2. `get_job`: Fetch full details for one role by canonical slug (HTML/markdown description, compensation, direct ATS application URL, and company context).
  3. `search_startups`: Query company directory by name, investor, or funding stage.
  4. `get_startup`: Detailed startup profile with active job count, funding history, investors, leadership, and news.

### B. RSC Ingestion Endpoints (Client Hydration)
- `/startups?_rsc=...`: Returns paginated company catalog JSON containing:
  ```json
  {
    "companies": [...],
    "matchingCount": 4792,
    "hasMore": true
  }
  ```
- `/jobs?_rsc=...`: Returns job search results and taxonomy metadata.
- `/jobs/[slug]?_rsc=...`: Returns complete job detail object, schema.org JSON-LD, and application URL.

### C. Public Crawl / SEO Endpoints
- `/robots.txt`:
  ```
  User-Agent: *
  Allow: /
  Disallow: /auth/
  Disallow: /protected/
  Disallow: /api/
  Host: https://jobswithstartups.com
  Sitemap: https://jobswithstartups.com/sitemap.xml
  ```
- `/sitemap.xml`: Sitemap index referencing:
  - `/startups/sitemap.xml` (1,312 indexed startup profiles)
  - `/jobs/sitemap/0.xml` and `/jobs/sitemap/1.xml` (Job listings)
  - `/investors/sitemap.xml` (Investor directory)
  - `/job-hubs/sitemap.xml` (Location and role landing pages)

---

## 4. Company Catalog & Discovery Mechanism

### A. Discovered Company Schema
Directly extracted from the RSC payload:
```typescript
interface JwsCompany {
  id: string; // UUID, e.g. "be07d5b0-6e80-4c16-b73b-f8bf709f96e9"
  name: string; // e.g. "SpaceX", "OpenAI"
  slug: string; // e.g. "spacex", "openai"
  website: string; // e.g. "https://spacex.com"
  description: string | null;
  logo_url: string | null;
  funding: string | null;
  headcount: string | null;
  industry: string | null;
  location: string | null;
  leaders: Array<{ name: string; title: string }>;
  ats_type: "greenhouse" | "ashby" | "lever" | "rippling";
  ats_url: string; // Direct API URL (e.g. "https://boards-api.greenhouse.io/v1/boards/spacex/jobs")
  careers_url: string; // Human career page (e.g. "https://job-boards.greenhouse.io/spacex")
  is_active: boolean;
  is_yc: boolean;
  yc_batch: string | null;
  created_at: string; // ISO 8601
  updated_at: string;
  enriched_at: string;
}
```

### B. Discovery Sources
1. **Y Combinator Directory Ingestion:** Explicit tracking of `is_yc` and `yc_batch` indicates direct automated ingestion from YC’s public directory.
2. **Top Tier Venture Capital Portfolios:** The `/investors` route indexes portfolios of firms like Sequoia, a16z, Founders Fund, Benchmark, and Accel.
3. **Crowdsourced Submissions:** `/startups/add` provides a public intake form where founders or jobseekers submit companies.
4. **Automated ATS Probing:** The `ats_url` pattern confirms that once a company token is found, standard ATS endpoint conventions are populated.

---

## 5. ATS Identification & Integration

JWS stores the target API endpoint directly on each company record:

| ATS Provider | Detected API URL Pattern | Example Captured Endpoint |
|---|---|---|
| **Greenhouse** | `https://boards-api.greenhouse.io/v1/boards/{token}/jobs` | `https://boards-api.greenhouse.io/v1/boards/spacex/jobs` |
| **Ashby** | `https://api.ashbyhq.com/posting-api/job-board/{token}` | `https://api.ashbyhq.com/posting-api/job-board/openai` |
| **Lever** | `https://api.lever.co/v0/postings/{token}` | `https://api.lever.co/v0/postings/gopuff` |
| **Rippling** | `https://api.rippling.com/platform/api/ats/v1/board/{token}/jobs` | `https://api.rippling.com/platform/api/ats/v1/board/rippling/jobs` |

*Note:* Analysis of the 4,792 companies revealed that Greenhouse represents ~80% of indexed companies, Ashby represents ~10%, Lever ~7%, and Rippling ~3%.

---

## 6. Job Listing Normalization

JWS normalizes each job posting into standard Schema.org `JobPosting` and internal JSON representations:

```json
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "SF Standard Job Posting",
  "description": "<p>Cleaned HTML description...</p>",
  "identifier": {
    "@type": "PropertyValue",
    "name": "Harvey",
    "value": "ac406ea9-bd7f-4a50-9341-8370ceca3949"
  },
  "datePosted": "2026-10-31T00:00:00.000Z",
  "employmentType": "FULL_TIME",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "Harvey",
    "sameAs": "https://harvey.ai"
  },
  "jobLocation": {
    "@type": "Place",
    "address": {
      "addressLocality": "San Francisco",
      "addressRegion": "CA",
      "addressCountry": "US"
    }
  }
}
```

Key normalization features:
- **Canonical Routing:** Jobs are slugified into `/jobs/{role-slug}-at-{company-slug}`.
- **Direct Application Redirect:** Preserves direct ATS application URLs (e.g. `https://jobs.ashbyhq.com/harvey/{jobId}/application`) rather than trapping applicants behind an internal form.
- **Cleaned Descriptions:** HTML tags from ATS descriptions are sanitized, preserving paragraphs, lists, and bold headings while stripping styling and tracking scripts.

---

## 7. Search, Filtering & Categorization

Instead of requiring heavy elasticsearch or runtime vector search for all queries, JWS utilizes pre-indexed programmatic landing pages:

1. **Insight Hubs:**
   - `/jobs/insights/early-stage`: Filter by funding round (Seed, Series A).
   - `/jobs/insights/yc-startups`: Filter by YC batch membership.
   - `/jobs/insights/recently-funded`: Filter by funding events within the last 365 days.
   - `/jobs/insights/salary-transparent`: Filter by non-null compensation fields.
   - `/jobs/insights/remote-us`: Filter by location/remote eligibility.
2. **Matrix Taxonomy:**
   - Role x Location: `/jobs/roles/{role}/locations/{location}` (e.g., `/jobs/roles/software-engineer/locations/bangalore`).
   - Industry: `/jobs/industries/{industry}` (e.g., B2B, AI, Fintech).

---

## 8. Candidate Matching & AI Architecture

JWS does **not** perform user-profile matching on its server side. It does not have user candidate profiles or resume upload functionality.

Instead, JWS outsources matching to the user's AI client via the **Model Context Protocol (MCP)**:
- Users connect Claude, Cursor, ChatGPT, or Antigravity to `https://jobswithstartups.com/mcp`.
- The user provides their personal resume or criteria in their prompt.
- The AI client calls `search_jobs` with filters, retrieves summaries, and uses `get_job` to inspect matches.
- This entirely eliminates the need for JWS to store user PII, manage candidate auth, or run costly backend embedding comparisons.

---

## 9. Key Lessons & Recommended Features for Huntly

1. **Rippling ATS Adapter:**
   - JWS uses `https://api.rippling.com/platform/api/ats/v1/board/{token}/jobs`. Huntly should implement a Rippling adapter alongside Ashby, Greenhouse, and Lever.
2. **Company Schema Expansion:**
   - Huntly's `Company` table should store `funding_stage`, `is_yc`, and `yc_batch`. This enables quick filtering for high-growth, early-career friendly startups.
3. **Direct Application Deep Links:**
   - Like JWS, Huntly's UI should direct users directly to the native ATS application link (`https://jobs.ashbyhq.com/.../application`), bypassing intermediary landing pages.
4. **Exposing an MCP Interface:**
   - Exposing a local MCP server in Huntly would allow personal AI workflows (Claude Code, Antigravity, Cursor) to search and match jobs from Huntly’s local SQLite database seamlessly.

