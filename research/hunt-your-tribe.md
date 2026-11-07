# Reverse Engineering Report: HuntYourTribe

**Target URL:** https://huntyourtribe.com/  
**MCP Endpoint:** https://api.huntyourtribe.com/mcp  
**Investigation Date:** November 7, 2026  
**Investigator:** Huntly Research (REA Toolkit & Live MCP Network Analysis)

---

## 1. Executive Summary

HuntYourTribe (HYT) is an AI-first startup job platform focused specifically on startups and SMBs (<5,000 employees) hiring in India (Bengaluru, Pune, Hyderabad, Gurgaon, Mumbai) and worldwide remote. 

As of November 2026, the platform indexes **28,487 live jobs from 1,715 companies**, strictly enforcing a **60-day freshness window** ("none older than 60 days") to eliminate ghost jobs and stale postings.

HuntYourTribe’s standout architectural feature is a fully functional, public **Model Context Protocol (MCP)** server (`https://api.huntyourtribe.com/mcp`) supporting Streamable HTTP (SSE) and JSON-RPC 2.0 with a generous rate limit of 600 requests per minute. It is designed to be plugged directly into AI coding and chat agents (Claude, Cursor, Codex, and Antigravity).

---

## 2. Frontend & Edge Architecture

| Component | Implementation | Evidence / Observation |
|---|---|---|
| **Framework** | Next.js 14+ (App Router) | React Server Components (`_rsc` parameters), `app/(site)/(main)/page-*.js` |
| **Edge Hosting** | Cloudflare | `server: cloudflare`, `cf-cache-status: DYNAMIC`, global edge delivery |
| **Asset CDN** | `cdn.huntyourtribe.com` | Media, company logos, profile images |
| **Design System** | Tailwind CSS + Radix UI | Radix accordions, clean minimalist dark/light theme, SVG vector iconography |
| **Candidate Portal** | Prosona360 | Interactive candidate portfolio builder ("portfolio made of chapters") |

---

## 3. The Model Context Protocol (MCP) Interface

HuntYourTribe exposes a live, production-grade MCP server at:
- **Server URL:** `https://api.huntyourtribe.com/mcp`
- **Transport:** Streamable HTTP (Server-Sent Events + HTTP POST JSON-RPC 2.0)
- **Protocol Version:** `2024-11-05`
- **Rate Limit:** 600 requests/minute per client (`x-ratelimit-limit: 600`)
- **CORS:** `access-control-allow-origin: *`

### Discovered MCP Tools:
1. **`search_jobs`**:
   - Free-text query + structured filters:
     - `query`: Free-text query across title, company, description
     - `job_role`: Taxonomy slug (e.g. `software-engineer`)
     - `city`: City name (e.g. `Bengaluru`, `Pune`, `Hyderabad`)
     - `country`: Country (e.g. `India`)
     - `work_mode`: `remote` | `hybrid` | `onsite`
     - `level`: Seniority level (`entry` | `junior` | `mid` | `senior`)
     - `role_type`: `full-time` | `contract` | `internship`
     - `skills`: Array of required skill slugs (e.g. `["nodejs", "typescript"]`)
     - `min_experience_years`: Integer minimum experience filter
     - `company`: Company name or slug
     - `limit` (1-25) & `page` (1-N)
   - Returns paginated list of job summaries with UUIDs.
2. **`get_job_details`**:
   - Input: `{ "id": "<uuid>" }`
   - Returns full markdown job description, company URL, and exact application link.
3. **`save_job`**:
   - Saves job to user watchlist (requires user auth).
4. **`get_watchlist_jobs`**:
   - Returns active listings from user-followed companies.

---

## 4. ATS Ingestion & The 60-Day Freshness Guarantee

### A. Supported ATS Integrations
Inspection of live job objects reveals explicit provenance tagging across 5 primary ATS providers:
1. `workday_api`: Workday CXS API (e.g. CrowdStrike Pune, PayU)
2. `greenhouse_api`: Greenhouse Boards API (e.g. Earnin, Axiado)
3. `lever_api`: Lever Postings API (e.g. Aera Technology)
4. `ashby_api`: Ashby Public Job Board API (e.g. BusPatrol)
5. `keka_api`: Keka HR API (e.g. Kognivera Bengaluru) — *Keka is the predominant ATS for Indian tech startups*.

### B. The 60-Day Freshness Window
HuntYourTribe strictly guarantees that **every job is under 60 days old**:
- Any job posting whose native `posted_at` date exceeds 60 days is automatically filtered out from search results and MCP outputs.
- Stale jobs that disappear from the company's native ATS board during daily synchronization are purged immediately.
- This provides an exceptionally high signal-to-noise ratio for early-career developers who frequently waste time applying to obsolete listings.

---

## 5. Job Data Normalization Schema

Directly extracted from the live MCP tool response:

```json
{
  "id": "56ae69f2-9bf6-4255-bd3c-31682b2abc44",
  "title": "KIBO OMS Developer",
  "company": "Kognivera",
  "company_url": "https://kognivera.com",
  "location": "Bengaluru, India",
  "work_mode": "On-site",
  "level": "Senior",
  "role_type": "Full-time",
  "department": "Software Development",
  "skills": [
    "nodejs",
    "typescript",
    "javascript",
    "java",
    "microservices",
    "rest-ap-is",
    "ci-cd",
    "devops",
    "aws"
  ],
  "minimum_experience_years": 4,
  "posted_at": "2026-11-07T13:54:34.608Z",
  "url": "https://kognivera.keka.com/careers/jobdetails/163798"
}
```

Key features:
- **Integer Experience Parsing:** Extracts `minimum_experience_years: 4` into a dedicated column, allowing exact numerical queries (e.g. `WHERE minimum_experience_years <= 2`).
- **Normalized Skill Array:** Parses technologies into lowercase hyphenated tokens (`nodejs`, `typescript`, `microservices`).
- **Direct ATS Application Link:** Directs candidates directly to `https://*.keka.com/careers/jobdetails/...` or `https://job-boards.greenhouse.io/...`.

---

## 6. Strategic Recommendations for Huntly

1. **Immediate Ingestion via HYT MCP Server:**
   HuntYourTribe’s MCP server (`https://api.huntyourtribe.com/mcp`) is completely open, CORS-enabled, has a 600 req/min limit, and allows filtering by `city: "Bengaluru"`, `work_mode: "remote"`, `skills: ["nodejs", "typescript"]`, and `min_experience_years: 1`. Huntly can connect to this endpoint as an external source to instantly surface top-tier Bangalore startup jobs!
2. **Implement Keka ATS Adapter:**
   Since the user’s target location is Bangalore and India, adding Keka support (`{slug}.keka.com/careers/`) unlocks access to hundreds of Indian tech startups that use Keka instead of US-centric platforms like Greenhouse or Lever.
3. **Adopt 60-Day Expiration Threshold:**
   Huntly should enforce an automatic 60-day cutoff (`WHERE posted_at >= date('now', '-60 days')`) to ensure the user never sees ghost jobs.

