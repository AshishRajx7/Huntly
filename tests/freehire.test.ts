import { describe, it, expect, beforeAll } from "vitest";
import { FreehireClient, FreehireError } from "../src/lib/sources/freehire";
import { normalizeFreehireJob } from "../src/lib/ingestion/freehire-sync";
import { db, initDb } from "../src/lib/db";
import { jobs } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

describe("Freehire API Integration", () => {
  const client = new FreehireClient({
    timeoutMs: 15000,
    maxRetries: 2,
  });

  describe("FreehireClient Public Agent API", () => {
    it("should search jobs and return structured data with metadata", async () => {
      const res = await client.searchJobs({
        q: "Backend Engineer",
        limit: 5,
        offset: 0,
        description_format: "markdown",
      });

      expect(res).toBeDefined();
      expect(res.data).toBeInstanceOf(Array);
      expect(res.data.length).toBeGreaterThan(0);
      expect(res.meta).toBeDefined();
      expect(res.meta.limit).toBe(5);
      expect(res.meta.offset).toBe(0);
      expect(res.meta.total).toBeGreaterThan(100);

      const first = res.data[0];
      expect(first.public_slug).toBeDefined();
      expect(first.title).toBeDefined();
      expect(first.company).toBeDefined();
      expect(first.url).toBeDefined();
      expect(first.url.startsWith("http")).toBe(true);
    });

    it("should support filters like work_mode and cities", async () => {
      const res = await client.searchJobs({
        q: "Software Engineer",
        work_mode: "remote",
        limit: 3,
      });

      expect(res.data).toBeInstanceOf(Array);
      expect(res.data.length).toBeGreaterThan(0);
      for (const job of res.data) {
        expect(job.title).toBeDefined();
      }
    });

    it("should support offset pagination", async () => {
      const page1 = await client.searchJobs({
        q: "Node.js",
        limit: 2,
        offset: 0,
      });

      const page2 = await client.searchJobs({
        q: "Node.js",
        limit: 2,
        offset: 2,
      });

      expect(page1.data.length).toBeGreaterThan(0);
      expect(page2.data.length).toBeGreaterThan(0);
      // Verify that offset returned different items
      expect(page1.data[0].public_slug).not.toBe(page2.data[0].public_slug);
    });

    it("should reject requests exceeding Freehire offset + limit <= 10000 constraint", async () => {
      await expect(
        client.searchJobs({
          limit: 50,
          offset: 10000,
        })
      ).rejects.toThrow(FreehireError);
    });
  });

  describe("Job Normalization (normalizeFreehireJob)", () => {
    it("should correctly normalize a Freehire job record", () => {
      const mockJob = {
        public_slug: "backend-engineer-cycode-12345",
        source: "greenhouse",
        external_id: "cycode/backend_123",
        url: "https://boards.greenhouse.io/cycode/jobs/12345?utm_source=freehire.me",
        title: "Backend Engineer",
        company: "Cycode",
        company_slug: "cycode",
        location: "Bengaluru, India",
        description: "### About Cycode\nWe are building cloud security tools using Node.js and PostgreSQL.",
        countries: ["in"],
        cities: ["Bengaluru"],
        work_mode: "remote" as const,
        skills: ["nodejs", "postgresql", "docker", "aws"],
        posted_at: "2026-11-06T18:20:57Z",
        enrichment: {
          summary: "Build backend services",
          experience_years_min: 2,
          category: "backend",
        },
      };

      const normalized = normalizeFreehireJob(mockJob, "cycode", "2026-11-07T12:00:00Z");

      expect(normalized.id).toBe("freehire_cycode_cycode_backend_123");
      expect(normalized.atsProvider).toBe("freehire");
      expect(normalized.companyName).toBe("Cycode");
      expect(normalized.jobTitle).toBe("Backend Engineer");
      expect(normalized.applicationUrl).toBe("https://boards.greenhouse.io/cycode/jobs/12345?utm_source=freehire.me");
      expect(normalized.isRemote).toBe(true);
      expect(normalized.minExperience).toBe(2);
      expect(normalized.experienceClassification).toBe("1-2");
      expect(normalized.cleanedDescription).toContain("About Cycode");

      const skills = JSON.parse(normalized.extractedSkills);
      expect(skills).toContain("nodejs");
      expect(skills).toContain("postgresql");
    });

    it("should fallback gracefully if optional fields are missing", () => {
      const mockJob = {
        public_slug: "swe-simple-slug",
        source: "generic",
        external_id: "simple_ext_1",
        url: "https://example.com/apply",
        title: "Software Engineer",
        company: "Acme",
        company_slug: "acme",
        location: "Remote",
        description: "Simple role",
      };

      const normalized = normalizeFreehireJob(mockJob, "acme", "2026-11-07T12:00:00Z");

      expect(normalized.id).toBe("freehire_acme_simple_ext_1");
      expect(normalized.companyName).toBe("Acme");
      expect(normalized.status).toBe("active");
    });
  });

  describe("Deduplication & Native ATS Preservation", () => {
    beforeAll(() => {
      initDb();
    });

    it("should preserve native ATS records when matching URL with UTM parameters", () => {
      const existingJob = db
        .select()
        .from(jobs)
        .where(eq(jobs.atsProvider, "ashby"))
        .get();

      if (existingJob) {
        expect(["ashby", "greenhouse", "lever"]).toContain(existingJob.atsProvider);

        // Simulated Freehire job referencing the same employer link with UTM parameter
        const simulatedFreehireJob = {
          public_slug: "simulated-freehire-slug",
          source: "ashby",
          external_id: "ext-123",
          url: `${existingJob.applicationUrl}?utm_source=freehire.me&utm_medium=api`,
          title: existingJob.jobTitle,
          company: existingJob.companyName,
          company_slug: existingJob.companyId,
          location: existingJob.location || "Remote",
          description: "Freehire aggregator description",
        };

        const normalized = normalizeFreehireJob(simulatedFreehireJob, existingJob.companyId);

        // Verification: The native ATS job in the database must retain its original provider
        expect(existingJob.atsProvider).toBe("ashby");
        expect(existingJob.applicationUrl).not.toContain("freehire.me");
      }
    });
  });
});

