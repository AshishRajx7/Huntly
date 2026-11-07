# Huntly — Personal AI Job Discovery Platform

Huntly is an automated, single-user job discovery and application tracking platform designed to discover software engineering opportunities directly from startup career pages and Applicant Tracking Systems (Ashby, Greenhouse, and Lever)—surfacing roles that often never appear on LinkedIn or traditional boards.

---

## Key Features

1. **Direct Public ATS Ingestion**:
   - Native HTTP ingestion for **Ashby**, **Greenhouse**, and **Lever** public APIs.
   - Built-in registry with **59 verified startups** (e.g., Stripe, GitLab, PostHog, Sezzle, Kinsta, Linear, Vercel, Supabase, Figma).
   - Polite concurrency control (`p-limit` max 5 concurrent requests) ensuring zero IP rate-limiting and low CPU/RAM usage.

2. **Accurate Normalization & Deduplication**:
   - Deterministic deterministic job IDs (`${atsProvider}_${companyId}_${atsJobId}`).
   - Comprehensive salary parsing supporting INR (Lakhs, LPA, ₹) and USD/EUR/GBP, with annual normalization and explicit "Not disclosed" protection.
   - Granular remote eligibility classifier (`worldwide`, `india`, `apac`, `us_only`, `eu_only`, `restricted`, `hybrid`, `onsite`, `unknown`). US-only remote is never misclassified as worldwide.
   - Experience classifier: distinguishes entry level, 0–1 yr, 1–2 yr, 2–3 yr, 3–5 yr, and 5+ yr senior roles.
   - Active & expired listing tracking.

3. **Candidate Matching Engine**:
   - Calibrated specifically to your profile:
     - **Experience**: ~1 year professional experience (prioritizes 0–2 years, does not reject unspecified).
     - **Roles**: SDE 1, Backend Engineer, Software Engineer, Platform Engineer. Excludes Senior/Staff/Principal/EM, Frontend-only, and DevOps-only positions.
     - **Skills**: Node.js, TypeScript, JavaScript, NestJS, PostgreSQL, Redis, Python, Docker, React, SQL, Git, AWS.
     - **Locations**: Bangalore, India, and Worldwide Remote.
     - **Compensation**: India ₹10–15+ LPA / International $40k+ annually.
   - Weighted scoring: Role (25%), Skills (25%), Experience (25%), Location (15%), Salary (10%).

4. **Linear / Raycast Dark-Themed Dashboard**:
   - **Overview (`/`)**: Real-time KPI metrics, active jobs count, high affinity matches carousel, and a live "Sync Now" button.
   - **Discover Jobs (`/discover`)**: Database-backed search and multi-facet filtering (Remote, Experience, ATS, Salary, Sorting).
   - **AI Matches (`/matches`)**: Ranked candidate matches with match score badges, detailed reasoning, skills breakdown, and quick actions.
   - **Applications Pipeline (`/applications`)**: Kanban board tracker (`Saved` ➔ `Applied` ➔ `Screening` ➔ `Interview` ➔ `Offer` ➔ `Archived`) with editable notes and direct links.
   - **Company Registry (`/companies`)**: View verified companies, active job counts, toggle sync status, and add new company career boards.

5. **Automation & Email Digest**:
   - Scheduled cron background runner (`node-cron`) running every 6 hours (`0 */6 * * *`) with concurrency lock.
   - Automated HTML email digest sent via `nodemailer` when new high-scoring matches are detected.

---

## Quick Start

### 1. Start the Web Dashboard
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Run Job Ingestion Manually
To fetch and evaluate the latest listings across all 59 seed companies:
```bash
npm run sync
```

### 3. Run Test Suite
```bash
npm test
```
Runs all 26 automated unit and integration tests across adapters, normalization, and candidate matching.

---

## Environment Variables (Optional)

Configure in a `.env.local` file:
```env
# Optional Custom Database Path (defaults to ./huntly.db)
DATABASE_PATH=./huntly.db

# Optional Email Digest Settings (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
DIGEST_RECIPIENT=your-email@gmail.com

# Optional Custom Sync Schedule (defaults to every 6 hours)
CRON_SCHEDULE="0 */6 * * *"
```

---

## Architecture

- **Framework**: Next.js 15 (App Router, React 19, TypeScript)
- **Database**: SQLite with `better-sqlite3` and `drizzle-orm` in WAL mode
- **Styling**: Tailwind CSS with dark theme
- **Concurrency**: `p-limit`
- **Testing**: Vitest

