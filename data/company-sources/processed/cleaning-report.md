# Huntly Master Company & Board Directory Cleaning Report

Generated: 2026-11-08T06:45:45.175Z  
Target Path: `data\company-sources\processed\huntly-master-company-directory.csv`

---

## 1. Executive Summary

Three company/ATS datasets (**Open ATS Feed**, **LastRound AI**, and **Moonie**) were merged, deduplicated, and normalized into a single canonical directory of applicant tracking system (ATS) job boards.

- **Total Raw Input Rows:** 29,903
- **Unique Canonical Boards Produced:** **20,832**
- **Duplicate Records Reconciled / Removed:** 9,071
- **Supported ATS Providers Covered:** 7 (Greenhouse, Ashby, Lever, Recruitee, Teamtailor, Breezy, Rippling)

---

## 2. Input Datasets & Record Counts

| Dataset Source | Raw File Path | Raw Records | Licensing / Attribution |
| :--- | :--- | :--- | :--- |
| **Open ATS Feed** | `data/company-sources/raw/open-ats-feed/docs/data/all.csv` | **18,164** | MIT License (open-ats-feed contributors) |
| **LastRound AI** | `data/company-sources/raw/lastroundai/ats-directory/lastroundai-ats-company-directory-2026-08.csv` | **9,935** | CC BY 4.0 (LastRound AI) |
| **Moonie** | `data/company-sources/raw/moonie0201/companies.jsonl` | **1,804** | CC0 1.0 (Public Domain Dedication) |
| **Total Raw Records** | *Three input datasets combined* | **29,903** | *Multi-source attribution preserved* |

---

## 3. Deduplication Results

- **Primary Deduplication Key:** `normalized_ats_provider + ":" + normalized_board_slug`
- **Unique Records After Deduplication:** **20,832**
- **Duplicate Records Removed:** **9,071** (Overlap rate: 30.3%)
- **Comparison to Initial 20,832 Estimate:**
  - The actual merged count is **20,832**, matching the exact 20,832 unique board calculation from the Phase 2 inspection with **zero discrepancy** (Delta: 0).

---

## 4. Breakdown by ATS Provider

| ATS Provider | Unique Boards | Share of Total | Primary API Endpoint Pattern |
| :--- | :--- | :--- | :--- |
| **greenhouse** | **7,141** | 34.3% | `https://boards-api.greenhouse.io/v1/boards/{slug}/jobs` |
| **ashby** | **3,933** | 18.9% | `https://api.ashbyhq.com/posting-api/job-board/{slug}` |
| **recruitee** | **2,698** | 13.0% | `https://{slug}.recruitee.com/api/offers/` |
| **lever** | **2,445** | 11.7% | `https://api.lever.co/v0/postings/{slug}?mode=json` |
| **teamtailor** | **2,334** | 11.2% | `https://{slug}.teamtailor.com/jobs.json` |
| **breezy** | **2,077** | 10.0% | `https://{slug}.breezy.hr/json` |
| **rippling** | **204** | 1.0% | `https://api.rippling.com/platform/api/ats/v1/board/{slug}/jobs` |
| **Total** | **20,832** | **100.0%** | |

---

## 5. Health Status Distribution

Health statuses from Moonie live probes were preserved. Records without an explicit live health audit remain marked as `unknown` to ensure no unverified claims of liveness are made:

| Board Status | Record Count | Description |
| :--- | :--- | :--- |
| **unknown** | **19,028** | Ingested from Open ATS Feed or LastRound AI without a live probe status |
| **ok** | **1,444** | Verified active and reachable via live public API probe |
| **dead** | **329** | Verified retired or 404 upstream (retained for negative blocklisting) |
| **unconfirmed** | **31** | Host responded but did not validate a complete job feed |

---

## 6. Multi-Board Companies

Companies that legitimately operate on more than one ATS platform (or run multiple department boards) were strictly preserved without loss:

- **Total Companies Operating on Multiple ATS Platforms:** **212**
- **Representative Examples:**
  - **pulse**: greenhouse, ashby
  - **tripactions**: greenhouse, ashby
  - **vast**: greenhouse, ashby
  - **reddit**: greenhouse, ashby
  - **doctolib**: greenhouse, ashby
  - **fin**: greenhouse, ashby
  - **proof**: greenhouse, lever
  - **planet**: greenhouse, ashby

---

## 7. Data Quality & Metadata Statistics

Offline validation checks revealed clean, standardized records:

- **Missing Company Names:** 10,649 (51.1%)
  - *Context:* Open ATS Feed publishes token slugs without company display names. In contrast, LastRound AI provided clean display names for all 9,935 of its records, enriching 7,861 shared boards with canonical human-readable company names.
- **Missing ATS Providers:** **0** (0.0% — 100% complete)
- **Missing Slugs:** **0** (0.0% — 100% complete)
- **Invalid Board URLs:** **0** (0.0% — 100% valid HTTP/HTTPS URLs)
- **Invalid API URLs:** **0** (0.0% — 100% valid HTTP/HTTPS URLs)
- **Missing API URLs:** **0** (0.0% — 100% documented API endpoints populated)
- **Open Postings Metric:** 18,164 boards retain verified open posting counts from Open ATS Feed snapshot measurements.

---

## 8. Source Attribution & Licensing Summary

Every output record tracks its lineage in `sources` and `source_license`:

1. **LastRound AI:**
   - License: Creative Commons Attribution 4.0 International (CC BY 4.0).
   - Attribution statement: "Data from LastRound AI ATS Company Directory (https://lastroundai.com/blog/salary-transparency-study-2026)".
2. **Open ATS Feed:**
   - License: MIT License.
   - Attribution statement: "Copyright (c) 2026 open-ats-feed contributors".
3. **Moonie:**
   - License: CC0 1.0 Universal (Public Domain Dedication).
   - Statement: "Dedicated to the public domain under CC0 1.0".
