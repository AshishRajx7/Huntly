import { describe, it, expect } from "vitest";
import { evaluateJobMatch } from "../src/lib/matching/engine";

describe("Candidate Matching Engine", () => {
  it("gives a high affinity score (80+) to early-career backend role in Bangalore or Worldwide", () => {
    const job = {
      jobTitle: "Backend Engineer - Node.js / TypeScript",
      cleanedDescription: "We are seeking a Backend Engineer with 1 year experience in TypeScript, Node.js, PostgreSQL, and Docker. Experience with Redis and REST APIs is a plus.",
      location: "Bangalore, India",
      isRemote: true,
      remoteEligibility: "india",
      experienceClassification: "1-2",
      minExperience: 1,
      maxExperience: 2,
      experienceStated: true,
      salaryMin: 1800000,
      salaryMax: 2400000,
      salaryCurrency: "INR",
      extractedSkills: JSON.stringify(["Node.js", "TypeScript", "PostgreSQL", "Docker", "Redis", "REST APIs"]),
    };

    const evaluation = evaluateJobMatch(job);
    expect(evaluation.matchScore).toBeGreaterThanOrEqual(80);
    expect(evaluation.isEarlyCareer).toBe(true);
    expect(evaluation.matchedSkills).toContain("Node.js");
    expect(evaluation.matchedSkills).toContain("TypeScript");
    expect(evaluation.matchedSkills).toContain("PostgreSQL");
    expect(evaluation.locationScore).toBeGreaterThanOrEqual(95);
  });

  it("demotes Senior / Staff / Lead level roles", () => {
    const job = {
      jobTitle: "Staff Software Engineer - Backend",
      cleanedDescription: "Lead technical architecture for high-throughput distributed systems using Node.js and PostgreSQL. 8+ years required.",
      location: "Worldwide Remote",
      isRemote: true,
      remoteEligibility: "worldwide",
      experienceClassification: "5+",
      minExperience: 8,
      experienceStated: true,
      extractedSkills: JSON.stringify(["Node.js", "PostgreSQL"]),
    };

    const evaluation = evaluateJobMatch(job);
    expect(evaluation.matchScore).toBeLessThanOrEqual(20);
    expect(evaluation.matchReasons.some((r) => r.includes("Senior/Staff/Lead"))).toBe(true);
  });

  it("demotes US-only remote jobs", () => {
    const job = {
      jobTitle: "Software Engineer 1",
      cleanedDescription: "Join as an entry-level engineer. Must be based in the United States.",
      location: "Remote - US Only",
      isRemote: true,
      remoteEligibility: "us_only",
      experienceClassification: "0-1",
      minExperience: 0,
      maxExperience: 1,
      experienceStated: true,
      extractedSkills: JSON.stringify(["TypeScript", "Python"]),
    };

    const evaluation = evaluateJobMatch(job);
    expect(evaluation.locationScore).toBe(0);
    expect(evaluation.matchScore).toBeLessThanOrEqual(20);
    expect(evaluation.matchReasons.some((r) => r.includes("US/EU only"))).toBe(true);
  });

  it("does not penalize unspecified salary and scores it neutral", () => {
    const job = {
      jobTitle: "Backend Developer",
      cleanedDescription: "Work with Node.js and Redis. Salary undisclosed.",
      location: "Worldwide Remote",
      isRemote: true,
      remoteEligibility: "worldwide",
      experienceClassification: "unspecified",
      experienceStated: false,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      extractedSkills: JSON.stringify(["Node.js", "Redis"]),
    };

    const evaluation = evaluateJobMatch(job);
    expect(evaluation.salaryScore).toBe(70);
    expect(evaluation.matchScore).toBeGreaterThanOrEqual(60);
  });
});

