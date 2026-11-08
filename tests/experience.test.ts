import { describe, it, expect } from "vitest";
import { parseExperience, classifyExperience } from "../src/lib/normalization/experience-parser";
import { normalizeJob } from "../src/lib/normalization/normalizer";
import { RawAtsJob } from "../src/lib/ats/types";

describe("Experience Parsing & Normalization Suite", () => {
  describe("1. Structured Experience Metadata", () => {
    it("prefers structured metadata when provided", () => {
      const res = parseExperience(
        "Staff Software Engineer",
        "We are looking for someone with 10 years experience",
        { minExperience: 8, maxExperience: 10 }
      );
      expect(res.minExperience).toBe(8);
      expect(res.maxExperience).toBe(10);
      expect(res.classification).toBe("5+");
      expect(res.experienceStated).toBe(true);
    });

    it("prefers structured single min experience over description text", () => {
      const res = parseExperience(
        "Backend Engineer",
        "Founded 10 years ago, we want 1 year experience",
        { minExperience: 2 }
      );
      expect(res.minExperience).toBe(2);
      expect(res.classification).toBe("1-2");
      expect(res.experienceStated).toBe(true);
    });
  });

  describe("2. Experience Ranges & Formatting Variations", () => {
    it("handles en-dash range: 8–10 years (Instahyre format)", () => {
      const res = parseExperience(
        "Backend Engineer",
        "Experience: 8–10 years\nResponsibilities: Build microservices and high-scale systems."
      );
      expect(res.minExperience).toBe(8);
      expect(res.maxExperience).toBe(10);
      expect(res.classification).toBe("5+");
      expect(res.experienceStated).toBe(true);
    });

    it("handles ASCII hyphen range: 8-10 years", () => {
      const res = parseExperience(
        "Backend Engineer",
        "Requirements:\n- 8-10 years of experience in distributed backend systems"
      );
      expect(res.minExperience).toBe(8);
      expect(res.maxExperience).toBe(10);
      expect(res.classification).toBe("5+");
      expect(res.experienceStated).toBe(true);
    });

    it("handles 'to' word range: 8 to 10 years", () => {
      const res = parseExperience(
        "Senior Architect",
        "The ideal candidate has 8 to 10 years of software engineering experience."
      );
      expect(res.minExperience).toBe(8);
      expect(res.maxExperience).toBe(10);
      expect(res.classification).toBe("5+");
    });

    it("handles '8+ years'", () => {
      const res = parseExperience(
        "Lead Engineer",
        "Requires 8+ years of experience leading software development teams."
      );
      expect(res.minExperience).toBe(8);
      expect(res.maxExperience).toBeNull();
      expect(res.classification).toBe("5+");
      expect(res.experienceStated).toBe(true);
    });

    it("handles 'Minimum 8 years' and 'At least 8 years of experience'", () => {
      const res1 = parseExperience(
        "Staff Engineer",
        "Qualifications:\n- Minimum 8 years working in high-growth startups."
      );
      expect(res1.minExperience).toBe(8);
      expect(res1.classification).toBe("5+");

      const res2 = parseExperience(
        "Staff Engineer",
        "Must have at least 8 years of experience with PostgreSQL and Node.js."
      );
      expect(res2.minExperience).toBe(8);
      expect(res2.classification).toBe("5+");
    });

    it("handles '5-8 years of relevant experience'", () => {
      const res = parseExperience(
        "Backend Engineer",
        "Publicis Global Delivery | Bangalore | 5–8 years of relevant experience in Python & Azure"
      );
      expect(res.minExperience).toBe(5);
      expect(res.maxExperience).toBe(8);
      expect(res.classification).toBe("5+");
    });

    it("handles early-career ranges: 0-1 years and 1-2 years", () => {
      const res0 = parseExperience("Associate Developer", "0-1 years of experience in Node.js");
      expect(res0.minExperience).toBe(0);
      expect(res0.maxExperience).toBe(1);
      expect(res0.classification).toBe("0-1");

      const res1 = parseExperience("SDE 1", "Requires 1 to 2 years of relevant experience");
      expect(res1.minExperience).toBe(1);
      expect(res1.maxExperience).toBe(2);
      expect(res1.classification).toBe("1-2");
    });

    it("handles months: '6-12 months of experience' and '6 months of experience'", () => {
      const resRange = parseExperience("Junior Dev", "Requires 6-12 months of experience in React");
      expect(resRange.minExperience).toBe(0.5);
      expect(resRange.maxExperience).toBe(1);
      expect(resRange.classification).toBe("0-1");

      const resSingle = parseExperience("Intern", "Minimum 6 months of experience with Python");
      expect(resSingle.minExperience).toBe(0.5);
      expect(resSingle.classification).toBe("0-1");
    });
  });

  describe("3. Unrelated Numbers & Noise Resistance", () => {
    it("ignores notice period mentions (e.g. 30 days, 60 days, 1-2 months notice)", () => {
      const res = parseExperience(
        "Backend Developer",
        "We are looking for immediate joiners with 30-60 days notice period. Notice period must not exceed 2 months."
      );
      expect(res.minExperience).toBeNull();
      expect(res.classification).toBe("unspecified");
      expect(res.experienceStated).toBe(false);
    });

    it("ignores salary figures (e.g. $120,000, 15-20 LPA)", () => {
      const res = parseExperience(
        "Software Engineer",
        "Compensation is $120,000 - $180,000 per year plus equity. Join our team!"
      );
      expect(res.minExperience).toBeNull();
      expect(res.classification).toBe("unspecified");
    });

    it("ignores calendar years and founding dates (e.g. 2019, 2024)", () => {
      const res = parseExperience(
        "Backend Engineer",
        "Founded in 2019 by ex-Google engineers, our company has been growing since 2021."
      );
      expect(res.minExperience).toBeNull();
      expect(res.classification).toBe("unspecified");
    });

    it("ignores technology version numbers (e.g. Python 3.8+, Java 17, .NET 8)", () => {
      const res = parseExperience(
        "Software Engineer",
        "Expertise in Python 3.8+ and Java 17 required. Experience with PostgreSQL and Docker."
      );
      expect(res.minExperience).toBeNull();
      expect(res.classification).toBe("unspecified");
    });

    it("ignores college degree durations (e.g. 4-year degree in Computer Science)", () => {
      const res = parseExperience(
        "Software Engineer",
        "Requires a 4-year degree in Computer Science or equivalent. No prior work experience necessary."
      );
      expect(res.minExperience).toBeNull();
      expect(res.classification).toBe("unspecified");
    });

    it("ignores weekly onsite schedule (e.g. 2-3 days onsite per week)", () => {
      const res = parseExperience(
        "Software Engineer",
        "This role requires 2-3 days onsite per week at our Bangalore office."
      );
      expect(res.minExperience).toBeNull();
      expect(res.classification).toBe("unspecified");
    });
  });

  describe("4. No Title Inference Rule", () => {
    it("does not infer 5+ from 'Senior Backend Engineer' title when description lacks requirements", () => {
      const res = parseExperience(
        "Senior Backend Engineer",
        "We are building next-generation fintech infrastructure using TypeScript and PostgreSQL."
      );
      expect(res.minExperience).toBeNull();
      expect(res.maxExperience).toBeNull();
      expect(res.classification).toBe("unspecified");
      expect(res.experienceStated).toBe(false);
    });

    it("does not infer 0 from 'Junior Developer' title when description lacks requirements", () => {
      const res = parseExperience(
        "Junior Software Developer",
        "Come join our engineering cohort and build web apps."
      );
      expect(res.minExperience).toBeNull();
      expect(res.classification).toBe("unspecified");
      expect(res.experienceStated).toBe(false);
    });
  });

  describe("5. Normalization Pipeline Integration", () => {
    it("passes structuredMinExperience from RawAtsJob into NormalizedJob", () => {
      const rawJob: RawAtsJob = {
        atsProvider: "freehire",
        atsJobId: "job-instahyre-123",
        companyId: "acme",
        companyName: "Acme",
        jobTitle: "Backend Engineer",
        rawDescription: "Work on backend microservices. General description without numbers.",
        applicationUrl: "https://www.instahyre.com/job-123",
        structuredMinExperience: 8,
      };

      const normalized = normalizeJob(rawJob);
      expect(normalized.minExperience).toBe(8);
      expect(normalized.experienceClassification).toBe("5+");
      expect(normalized.experienceStated).toBe(true);
    });

    it("extracts 8-10 years from rawDescription when structured metadata is null", () => {
      const rawJob: RawAtsJob = {
        atsProvider: "freehire",
        atsJobId: "job-instahyre-456",
        companyId: "acme",
        companyName: "Acme",
        jobTitle: "Backend Engineer",
        rawDescription: "<p>About the role: Experience: 8–10 years in backend development.</p>",
        applicationUrl: "https://www.instahyre.com/job-456",
      };

      const normalized = normalizeJob(rawJob);
      expect(normalized.minExperience).toBe(8);
      expect(normalized.maxExperience).toBe(10);
      expect(normalized.experienceClassification).toBe("5+");
      expect(normalized.experienceStated).toBe(true);
    });
  });
});

