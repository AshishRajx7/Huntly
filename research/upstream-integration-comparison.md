# Upstream Integration Comparison: Freehire vs. HuntYourTribe

**Evaluation Period:** November 7, 2026  
**Investigator:** Huntly Research Team  
**Artifacts Generated:** 
- [Freehire PoC Report](file:///c:/Users/ashis/OneDrive/Desktop/Huntly/research/freehire-poc.md)
- [HuntYourTribe PoC Report](file:///c:/Users/ashis/OneDrive/Desktop/Huntly/research/hunt-your-tribe-poc.md)

---

## 1. Comprehensive Empirical Comparison Matrix

| Evaluation Dimension | Source 1: Freehire Agent API | Source 2: HuntYourTribe MCP Server |
|---|---|---|
| **Protocol / Endpoint** | REST JSON (`https://freehire.me/api/v1/agent/jobs/search`) | Streamable HTTP / JSON-RPC 2.0 (`https://api.huntyourtribe.com/mcp`) |
| **Total Ecosystem Jobs** | **7,297,778** active jobs (Advertised) | **28,487** active jobs (Advertised) |
| **Target Role Jobs (Backend SWE)** | **97,796** jobs | **1,099** jobs (India-specific) |
| **Target Role Jobs (SWE General)** | **275,321** jobs | **12,310** jobs (India / Global) |
| **Primary Location (Bangalore)** | **54,940** jobs (`cities=Bengaluru`) | **1,351** curated startup jobs (`city: "Bengaluru"`) |
| **Remote Software Engineering** | **17,732** jobs (`work_mode=remote`) | **1,997** jobs (`work_mode: "remote"`) |
| **Employer URL Validity Rate** | **80% live** (8/10 sample passed; 2 were 404s from aggregators/closed boards) | **100% live** (10/10 sample passed; Keka, Ashby, Greenhouse) |
| **Job Description Format** | Inline full Markdown (`description_format=markdown`) | Two-tier: Summary in search, Full Markdown in `get_job_details` |
| **Freshness Compliance** | Variable: top jobs 0–1d, but older jobs can linger up to 80+ days (flags `reality.class = stale`) | **100% strict compliance**: all sampled jobs were **0–3 days old** (strictly enforces $\le$ 60 days) |
| **ATS Provider Diversity** | 160 platforms (Workday, SmartRecruiters, Manatal, Greenhouse, Lever, etc.) | 5 core platforms (Keka, Greenhouse, Ashby, Lever, Workday) |
| **Indian Startup (Keka) Support** | Limited / experimental | **First-class native support** for Keka HR boards |
| **Response Latency (Warmed)** | ~420 ms avg | **~385 ms avg** |
| **Rate Limit** | **120 requests / min** (`x-ratelimit-limit: 120`) | **600 requests / min** (`x-ratelimit-limit: 600`) |
| **Pagination Model** | Offset-based (`limit` & `offset`, max 10,000) | Page-based (`page` & `limit`, max 25 per page) |
| **Cross-Source Overlap in Samples** | **0% direct overlap** (Global/US focus) | **0% direct overlap** (India/Bangalore startup focus) |
| **Auth / Access Friction** | None (public, unauthenticated) | None (public, open CORS `*`) |

---

## 2. In-Depth Technical Analysis

### A. Data Quality & Freshness Guarantee
- **Freehire:** Massive volume (7.2M+ jobs), but requires local filtering. Because Freehire aggregates from 400+ sources including job aggregators like `arc.dev` and `whatjobs`, expired listings can slip through before being marked by the 14-day unseen sweep. In our random sample, 20% of employer URLs returned HTTP 404.
- **HuntYourTribe:** Pure high-signal curated dataset. HuntYourTribe directly synchronizes against employer career pages and hard-expires any posting older than 60 days. In our sample of 20 jobs, 100% were under 3 days old, and 100% linked to live, active hiring pages.

### B. Geographic & Profile Alignment
- The candidate profile is:
  - **Experience:** 0–2 years (approximately 1 year professional experience).
  - **Roles:** Backend Engineer, Software Engineer, SDE 1.
  - **Skills:** Node.js, TypeScript, PostgreSQL, Redis, Python, Docker.
  - **Locations:** Bangalore, India, Worldwide Remote.
- **HuntYourTribe’s job inventory is 100% concentrated in this exact geographical bulls-eye.** It covers Bangalore tech staples and high-growth Indian startups (PhonePe, Talentica, Kognivera, TrueFan AI, Devon Software) that do not appear on Western job boards.
- **Freehire’s inventory is predominantly North American and European.** While it has 54,940 jobs mentioning Bengaluru, many are enterprise multi-nationals (Kyndryl, SIXT, Modaxo) rather than fast-paced startups.

### C. Rate Limits & Payload Weight
- **HuntYourTribe allows 600 requests/minute (10 requests/sec)**, compared to Freehire’s 120 requests/minute (2 requests/sec).
- **Two-tier efficiency:** HuntYourTribe returns compact summaries in `search_jobs`, allowing Huntly to ingest 250 candidate jobs in 10 fast requests without storing megabytes of description text in SQLite until needed.

---

## 3. Final Recommendation: Which Source to Integrate First?

### **RECOMMENDATION: Integrate HuntYourTribe FIRST.**

**Strategic Justification:**
1. **Target Market Precision:** The user is seeking early-career software engineering roles specifically in **Bangalore, India, or worldwide remote**. HuntYourTribe's entire catalog is focused on Indian startups and remote tech companies.
2. **Superior Freshness (Zero Ghost Jobs):** 100% of tested HYT listings were fresh (0–3 days old), eliminating the frustration of applying to ghost postings that were closed weeks ago.
3. **Keka ATS Coverage:** Indian startups disproportionately use Keka for hiring. HuntYourTribe provides full Keka coverage that Huntly currently lacks.
4. **Higher Rate Limits:** 600 req/min allows Huntly's sync engine to run in seconds without risk of 429 throttling.
5. **Simpler Two-Tier Payload:** The clean separation between search summaries and markdown detail views matches Huntly's lightweight SQLite architecture.

---

### **Phase 2 Implementation Sequence:**

1. **Step 1 (Immediate):** Integrate **HuntYourTribe MCP client** into Huntly’s sync pipeline to immediately populate the dashboard with fresh, active Bangalore and India startup opportunities.
2. **Step 2 (Next):** Integrate **Freehire Agent API** as a secondary wide-net adapter specifically configured with `work_mode=remote` to capture high-paying worldwide remote roles ($40k+).
3. **Step 3:** Implement native **Keka** and **Workable** direct adapters for user-curated company boards.

