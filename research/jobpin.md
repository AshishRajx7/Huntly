# Reverse Engineering Report: JobPin

**Target URL:** https://jobpin.com/  
**Investigation Date:** November 7, 2026  
**Investigator:** Huntly Research (REA Toolkit & Public Asset/HTML Inspection)

---

## 1. Executive Summary

JobPin (`jobpin.com`) is a curated startup and technology job directory indexing **10,662 active openings from 807 companies across 7 countries and 818 cities** (United States, Germany, United Kingdom, France, India, Canada, and Singapore).

Unlike heavy React/Next.js single-page applications or complex SaaS backends, JobPin is built on **Astro**, delivering hyper-optimized, static-first HTML hosted on Cloudflare with edge caching. 

Its architecture is optimized for speed, reliability, and search visibility (SEO and LLM search agents). It ingests daily from 7 ATS platforms—Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee, and notably **Personio**—and links applicants directly to the employer's original ATS application page.

---

## 2. Frontend Architecture & Technology Stack

| Layer | Technology | Details / Evidence |
|---|---|---|
| **Framework** | Astro | `_astro/tokens.*.css`, `_astro/index.*.css`, `data-astro-cid-*` scoped attributes |
| **Rendering Strategy** | Static Site Generation (SSG) / Hybrid SSR | Pre-rendered static pages at build time with edge hydration on Cloudflare |
| **Hosting & Edge CDN** | Cloudflare Pages / Workers | `server: cloudflare`, `cf-cache-status: HIT`, `server-timing: cfCacheStatus;desc="HIT"` |
| **Caching Policy** | Edge Cache with SWR | `cache-control: public, max-age=14400`, `cdn-cache-control: stale-while-revalidate=86400` |
| **Analytics & Telemetry** | Plausible + Cloudflare Insights + GA4 | Privacy-friendly Plausible (`plausible.io`), Cloudflare Web Analytics, and GA4 consent wrapper |
| **Client Search** | In-Memory Pre-baked JSON Index | `#home-search-index` (50 KB JSON payload embedded directly in HTML) |

---

## 3. Endpoints & API Policy

### A. API Availability
JobPin does **not** expose an open public REST or GraphQL API for external consumption. Its `robots.txt` explicitly disallows `/api/` and `/admin/`:
```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /job/ssr-shell/
```

### B. AI Search Agent Permissions (`robots.txt`)
JobPin implements an explicit **two-tiered crawler policy**:
1. **Allowed (Search & User-Directed AI Agents):**
   - `OAI-SearchBot`, `ChatGPT-User`
   - `Claude-User`, `Claude-SearchBot`
   - `PerplexityBot`, `Perplexity-User`
   - `GoogleOther`, `Bingbot`
2. **Blocked (Bulk Training Corpus Harvesters):**
   - `GPTBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended`, `CCBot`, `Meta-ExternalAgent`, `Bytespider`

---

## 4. Company Directory & ATS Ecosystem

JobPin monitors **807 verified companies**. Direct inspection of its schema markup reveals daily synchronization from **7 ATS platforms**:

1. **Greenhouse:** e.g., `https://job-boards.greenhouse.io/{company}/jobs/{jobId}`
2. **Ashby:** `https://jobs.ashbyhq.com/{company}`
3. **Lever:** `https://jobs.lever.co/{company}`
4. **Workable:** `https://apply.workable.com/{company}`
5. **SmartRecruiters:** `https://jobs.smartrecruiters.com/{company}`
6. **Recruitee:** `https://{company}.recruitee.com/`
7. **Personio:** `https://{company}.jobs.personio.de/` (Key European HR/ATS platform rarely supported by US aggregators).

### Routing Convention:
JobPin maps job postings deterministically to their native ATS identifiers:
- Company URL: `/companies/{company_slug}/` (e.g. `/companies/anthropic/`)
- Job URL: `/job/{company_slug}/{ats_job_id}/` (e.g. `/job/anthropic/5438044008/`)

---

## 5. Job Normalization & Semantic Markup

Every job detail page contains comprehensive Schema.org `JobPosting` structured data:

```json
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "@id": "https://jobpin.com/job/anthropic/5438044008/",
  "identifier": {
    "@type": "PropertyValue",
    "name": "Anthropic",
    "value": "5438044008"
  },
  "title": "Research Engineer / Research Scientist, RL Frontiers",
  "description": "Cleaned full job description with requirements...",
  "url": "https://jobpin.com/job/anthropic/5438044008/",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "Anthropic",
    "url": "https://anthropic.com"
  },
  "datePosted": "2026-09-29T19:03:37.000Z",
  "jobLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "San Francisco",
      "addressCountry": "US",
      "addressRegion": "California"
    }
  }
}
```

Key normalization features:
- **Direct Application Redirect:** Clear CTA button pointing to `https://job-boards.greenhouse.io/anthropic/jobs/5438044008` (never traps applicants).
- **Salary Disclosures:** Disclosed annual ranges (e.g. `$500,000 — $850,000 USD`) parsed into searchable compensation tokens.
- **Geographic Hierarchy:** Grouped into Country $\to$ City $\to$ Remote Status.

---

## 6. Search & Navigation Architecture

JobPin avoids the server load and cold-start latency of server-side search by combining two strategies:

1. **Static Taxonomy Matrix:**
   Pre-computed static landing pages for:
   - Country hubs: `/us/`, `/de/`, `/uk/`, `/fr/`, `/in/`, `/ca/`, `/sg/`.
   - Metro/City hubs: `/jobs/san-francisco/`, `/jobs/bengaluru/`, `/jobs/berlin/`, `/jobs/london/`.
   - Role hubs: `/jobs/by-role/engineering/`, `/jobs/by-role/sales/`, `/jobs/by-role/design/`.
2. **Client-Side In-Memory Search Index (`#home-search-index`):**
   A tiny 50 KB JSON payload embedded into the homepage HTML contains all 807 company names, top cities, and popular queries with their open job counts. When users type in the search bar, autocomplete matches client-side with 0ms network latency.

---

## 7. Lessons & Features for Huntly

1. **Personio Integration:**
   Supporting Personio allows Huntly to discover European tech startups that do not use Ashby or Greenhouse. Personio provides a public XML feed for companies at `https://{slug}.jobs.personio.de/xml`.
2. **Deterministic Route Mapping:**
   Huntly should adopt `/jobs/{company}/{ats_job_id}` as its canonical job route, ensuring instant correlation with ATS records.
3. **Embedded Client Autocomplete:**
   Embedding a lightweight company/skill index in Huntly's dashboard enables instantaneous filter responses without round-tripping to SQLite for every keystroke.

