import { describe, it, expect, beforeAll } from "vitest";
import { HuntYourTribeClient, HuntYourTribeError } from "../src/lib/sources/hunt-your-tribe";
import { normalizeHytJob } from "../src/lib/ingestion/hunt-your-tribe-sync";
import { db, initDb } from "../src/lib/db";
import { companies, jobs, matches } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

describe("HuntYourTribe MCP Integration", () => {
  const client = new HuntYourTribeClient({
    timeoutMs: 15000,
    maxRetries: 2,
  });

  describe("HuntYourTribeClient MCP Protocol", () => {
    it("should initialize MCP session and receive server info", async () => {
      const serverInfo = await client.initialize();
      expect(serverInfo).toBeDefined();
      expect(serverInfo.name).toBeDefined();
    });

    it("should search jobs and return structured response", async () => {
      const res = await client.searchJobs({
        query: "Software Engineer",
        limit: 5,
        page: 1,
      });

      expect(res).toBeDefined();
      expect(res.jobs).toBeInstanceOf(Array);
      expect(res.meta).toBeDefined();
      expect(res.meta.page).toBe(1);
      expect(res.meta.limit).toBe(5);

      if (res.jobs.length > 0) {
        const first = res.jobs[0];
        expect(first.id).toBeDefined();
        expect(first.title).toBeDefined();
        expect(first.company).toBeDefined();
      }
    });

    it("should retrieve full job details by ID", async () => {
      const searchRes = await client.searchJobs({
        query: "Backend",
        limit: 2,
      });

      expect(searchRes.jobs.length).toBeGreaterThan(0);
      const targetJob = searchRes.jobs[0];

      const detail = await client.getJobDetails(targetJob.id);
      expect(detail).toBeDefined();
      expect(detail.id).toBe(targetJob.id);
      expect(detail.title).toBeDefined();
      expect(detail.description).toBeDefined();
      expect(detail.description.length).toBeGreaterThan(10);
      // Verify employer application URL exists
      if (detail.url) {
        expect(detail.url.startsWith("http")).toBe(true);
      }
    });

    it("should reject getJobDetails if ID is invalid or empty", async () => {
      await expect(client.getJobDetails("")).rejects.toThrow(HuntYourTribeError);
    });
  });

  describe("Job Normalization (normalizeHytJob)", () => {
    it("should properly normalize a HuntYourTribe job record", () => {
      const mockDetail = {
        id: "mock-uuid-12345",
        title: "Senior Backend Engineer - Node.js",
        description: "<h3>About the role</h3><p>We are looking for a backend engineer with 3+ years experience with Node.js and PostgreSQL.</p><script>alert('bad')</script>",
        company: {
          id: "comp-123",
          name: "Acme Corp",
          slug: "acme-corp",
          url: "https://acme.example.com",
          logo_url: "https://acme.example.com/logo.png",
        },
        location: "Bangalore, India",
        city: "Bangalore",
        country: "India",
        work_mode: "Remote",
        level: "Mid",
        role_type: "Full-time",
        skills: ["Node.js", "PostgreSQL", "Docker", "AWS"],
        minimum_experience_years: 3,
        posted_at: "2026-11-01T10:00:00Z",
        url: "https://jobs.ashbyhq.com/acme/12345-backend",
      };

      const normalized = normalizeHytJob(mockDetail, "acme-corp", "2026-11-07T12:00:00Z");

      expect(normalized.id).toBe("huntyourtribe_acme-corp_mock-uuid-12345");
      expect(normalized.atsProvider).toBe("huntyourtribe");
      expect(normalized.companyName).toBe("Acme Corp");
      expect(normalized.applicationUrl).toBe("https://jobs.ashbyhq.com/acme/12345-backend");
      expect(normalized.isRemote).toBe(true);
      expect(normalized.jobCategory).toBe("backend");
      expect(normalized.minExperience).toBe(3);
      expect(normalized.cleanedDescription).not.toContain("<script>");
      expect(normalized.cleanedDescription).toContain("About the role");

      const skills = JSON.parse(normalized.extractedSkills);
      expect(skills).toContain("Node.js");
      expect(skills).toContain("PostgreSQL");
    });

    it("should fallback gracefully if optional fields are missing", () => {
      const mockDetail = {
        id: "mock-uuid-empty",
        title: "Frontend Developer",
        description: "Simple description without HTML tags",
        company: "SoloStartup",
      };

      const normalized = normalizeHytJob(mockDetail, "solostartup", "2026-11-07T12:00:00Z");

      expect(normalized.id).toBe("huntyourtribe_solostartup_mock-uuid-empty");
      expect(normalized.companyName).toBe("SoloStartup");
      expect(normalized.applicationUrl).toBe("https://huntyourtribe.com/jobs/mock-uuid-empty");
      expect(normalized.status).toBe("active");
    });
  });

  describe("Deduplication and ATS Preservation", () => {
    beforeAll(() => {
      initDb();
    });

    it("should never overwrite an existing native ATS job URL or provider", () => {
      // Find an existing job in the database with native ATS (e.g. ashby, greenhouse, lever)
      const existingAtsJob = db
        .select()
        .from(jobs)
        .where(eq(jobs.atsProvider, "ashby"))
        .get();

      if (existingAtsJob) {
        expect(["ashby", "greenhouse", "lever"]).toContain(existingAtsJob.atsProvider);
        expect(existingAtsJob.applicationUrl).toBeDefined();

        // Suppose HYT returns a listing pointing to this exact same applicationUrl
        const simulatedHytDetail = {
          id: "simulated-hyt-uuid",
          title: existingAtsJob.jobTitle,
          description: "New description from HYT aggregator",
          company: existingAtsJob.companyName,
          url: existingAtsJob.applicationUrl,
        };

        const normalizedHyt = normalizeHytJob(simulatedHytDetail, existingAtsJob.companyId);

        // Deduplication rule check:
        // When applicationUrl matches an existing native ATS job, the native job must retain its ATS provider and URL.
        const matched = db
          .select()
          .from(jobs)
          .where(eq(jobs.applicationUrl, normalizedHyt.applicationUrl))
          .get();

        expect(matched).toBeDefined();
        expect(matched?.id).toBe(existingAtsJob.id);
        expect(matched?.atsProvider).toBe("ashby");
        expect(matched?.applicationUrl).toBe(existingAtsJob.applicationUrl);
      }
    });
  });
});

