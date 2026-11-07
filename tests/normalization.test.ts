import { describe, it, expect } from "vitest";
import { cleanHtml } from "../src/lib/normalization/html-cleaner";
import { parseSalary, parseSalaryFromText } from "../src/lib/normalization/salary-parser";
import { parseExperience } from "../src/lib/normalization/experience-parser";
import { parseRemote } from "../src/lib/normalization/remote-parser";
import { extractSkills } from "../src/lib/normalization/skill-extractor";
import { normalizeJob } from "../src/lib/normalization/normalizer";
import { RawAtsJob } from "../src/lib/ats/types";

describe("Normalization Components", () => {
  describe("HTML Cleaner", () => {
    it("strips scripts, styles and produces readable text", () => {
      const html = `<div>
        <h2>About the role</h2>
        <script>alert('bad');</script>
        <style>body { color: red; }</style>
        <p>We are looking for a <strong>Backend Engineer</strong> with Node.js & TypeScript.</p>
        <ul>
          <li>Experience with PostgreSQL</li>
          <li>Experience with Docker</li>
        </ul>
      </div>`;
      const cleaned = cleanHtml(html);
      expect(cleaned).toContain("About the role");
      expect(cleaned).toContain("We are looking for a Backend Engineer with Node.js & TypeScript.");
      expect(cleaned).toContain("• Experience with PostgreSQL");
      expect(cleaned).not.toContain("<script>");
      expect(cleaned).not.toContain("alert");
      expect(cleaned).not.toContain("color: red");
    });

    it("handles empty, null, and non-string inputs safely", () => {
      expect(cleanHtml("")).toBe("");
      expect(cleanHtml(null as any)).toBe("");
      expect(cleanHtml(undefined as any)).toBe("");
      expect(cleanHtml("   ")).toBe("");
    });

    it("handles malformed HTML safely without throwing", () => {
      const malformed = "<div<p>Unclosed tags and <<weird>> brackets <script>bad()</p>";
      const cleaned = cleanHtml(malformed);
      expect(typeof cleaned).toBe("string");
      expect(cleaned).not.toContain("bad()");
    });
  });

  describe("Salary Parser", () => {
    it("parses Indian Rupee LPA format", () => {
      const res = parseSalaryFromText("Salary: 15-25 LPA depending on experience");
      expect(res.salaryCurrency).toBe("INR");
      expect(res.salaryMin).toBe(1500000);
      expect(res.salaryMax).toBe(2500000);
      expect(res.salaryFormatted).toContain("15 - ₹25 LPA");
    });

    it("parses USD k-range format", () => {
      const res = parseSalaryFromText("Base pay: $120k - $150k annually");
      expect(res.salaryCurrency).toBe("USD");
      expect(res.salaryMin).toBe(120000);
      expect(res.salaryMax).toBe(150000);
      expect(res.salaryFormatted).toBe("$120k - $150k / yr");
    });

    it("parses structured compensation accurately", () => {
      const res = parseSalary({
        min: 130000,
        max: 160000,
        currency: "USD",
        interval: "year",
      });
      expect(res.salaryCurrency).toBe("USD");
      expect(res.salaryMin).toBe(130000);
      expect(res.salaryMax).toBe(160000);
      expect(res.salaryFormatted).toContain("$130k - $160k / yr");
    });

    it("returns 'Not disclosed' when no compensation is mentioned", () => {
      const res = parseSalary(undefined, "Join our fast growing team in Bangalore!");
      expect(res.salaryMin).toBeNull();
      expect(res.salaryFormatted).toBe("Not disclosed");
    });
  });

  describe("Experience Parser", () => {
    it("detects junior / SDE 1 in title", () => {
      const res = parseExperience("Software Development Engineer 1 (SDE 1)", "Work on core systems");
      expect(res.classification).toBe("junior");
      expect(res.minExperience).toBe(0);
      expect(res.experienceStated).toBe(true);
    });

    it("detects 1-2 years explicit requirement", () => {
      const res = parseExperience("Backend Engineer", "Candidates should have 1-2 years of experience in Node.js");
      expect(res.classification).toBe("1-2");
      expect(res.minExperience).toBe(1);
      expect(res.maxExperience).toBe(2);
      expect(res.experienceStated).toBe(true);
    });

    it("detects Senior 5+ in title or requirement", () => {
      const res = parseExperience("Senior Software Engineer", "Build distributed platforms");
      expect(res.classification).toBe("5+");
      expect(res.minExperience).toBe(5);
      expect(res.experienceStated).toBe(true);
    });

    it("returns unspecified when no experience is mentioned", () => {
      const res = parseExperience("Software Engineer", "Come build with us!");
      expect(res.classification).toBe("unspecified");
      expect(res.minExperience).toBeNull();
      expect(res.experienceStated).toBe(false);
    });
  });

  describe("Remote Parser", () => {
    it("classifies worldwide remote", () => {
      const res = parseRemote("Backend Engineer", "Remote - Anywhere in the world", true);
      expect(res.isRemote).toBe(true);
      expect(res.remoteEligibility).toBe("worldwide");
    });

    it("classifies India remote", () => {
      const res = parseRemote("Software Engineer", "Bangalore, India (Remote)", true);
      expect(res.isRemote).toBe(true);
      expect(res.remoteEligibility).toBe("india");
    });

    it("classifies US-only remote and NEVER marks it worldwide", () => {
      const res = parseRemote("Staff Engineer", "Remote - US Only", true);
      expect(res.isRemote).toBe(true);
      expect(res.remoteEligibility).toBe("us_only");
      expect(res.remoteEligibility).not.toBe("worldwide");
    });

    it("classifies hybrid positions", () => {
      const res = parseRemote("Backend Developer", "Bangalore (Hybrid)", false);
      expect(res.isRemote).toBe(false);
      expect(res.remoteEligibility).toBe("hybrid");
    });

    it("classifies onsite positions", () => {
      const res = parseRemote("Backend Developer", "Bengaluru, Karnataka, India", false);
      expect(res.isRemote).toBe(false);
      expect(res.remoteEligibility).toBe("onsite");
    });
  });

  describe("Skill Extractor", () => {
    it("extracts primary and additional skills without false positives", () => {
      const text = "We need an engineer proficient in Node.js, TypeScript, PostgreSQL, Docker, and Redis. Familiarity with AWS, React, and Git is a plus.";
      const { skills, primaryMatches, additionalMatches } = extractSkills(text);
      expect(skills).toContain("Node.js");
      expect(skills).toContain("TypeScript");
      expect(skills).toContain("PostgreSQL");
      expect(skills).toContain("Docker");
      expect(skills).toContain("Redis");
      expect(skills).toContain("AWS");
      expect(skills).toContain("React");
      expect(skills).toContain("Git");
      expect(primaryMatches).toEqual(expect.arrayContaining(["Node.js", "TypeScript", "PostgreSQL", "Docker", "Redis"]));
      expect(additionalMatches).toEqual(expect.arrayContaining(["AWS", "React", "Git"]));
    });
  });

  describe("Full Normalizer", () => {
    it("normalizes a RawAtsJob into a standardized database-ready structure", () => {
      const rawJob: RawAtsJob = {
        atsProvider: "ashby",
        atsJobId: "job-12345",
        companyId: "posthog",
        companyName: "PostHog",
        jobTitle: "Software Engineer - Core Backend",
        rawDescription: "<p>We are seeking an engineer with 1-2 years experience in TypeScript, Node.js, and PostgreSQL. Salary: $120k - $140k.</p>",
        location: "Worldwide Remote",
        isRemote: true,
        applicationUrl: "https://jobs.ashbyhq.com/posthog/job-12345",
      };

      const normalized = normalizeJob(rawJob, "2026-11-07T12:00:00.000Z");
      expect(normalized.id).toBe("ashby_posthog_job-12345");
      expect(normalized.companyName).toBe("PostHog");
      expect(normalized.jobTitle).toBe("Software Engineer - Core Backend");
      expect(normalized.isRemote).toBe(true);
      expect(normalized.remoteEligibility).toBe("worldwide");
      expect(normalized.experienceClassification).toBe("1-2");
      expect(normalized.salaryCurrency).toBe("USD");
      expect(normalized.salaryMin).toBe(120000);
      expect(normalized.salaryMax).toBe(140000);
      const skills = JSON.parse(normalized.extractedSkills);
      expect(skills).toContain("TypeScript");
      expect(skills).toContain("Node.js");
      expect(skills).toContain("PostgreSQL");
    });
  });
});

