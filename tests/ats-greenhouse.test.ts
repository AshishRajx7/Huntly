import { describe, it, expect } from "vitest";
import { fetchGreenhouseJobs } from "../src/lib/ats/greenhouse";

describe("Greenhouse ATS Adapter", () => {
  it("should fetch and normalize jobs from an active Greenhouse company (Sezzle)", async () => {
    const result = await fetchGreenhouseJobs({
      id: "sezzle",
      name: "Sezzle",
      atsToken: "sezzle",
      websiteUrl: "https://sezzle.com",
    });

    expect(result.success).toBe(true);
    expect(result.atsProvider).toBe("greenhouse");
    expect(result.jobs.length).toBeGreaterThan(0);

    const sample = result.jobs[0];
    expect(sample.atsJobId).toBeDefined();
    expect(sample.jobTitle).toBeDefined();
    expect(sample.applicationUrl).toContain("greenhouse.io");
    expect(sample.rawDescription.length).toBeGreaterThan(10);
  });

  it("should gracefully handle non-existent Greenhouse token (404)", async () => {
    const result = await fetchGreenhouseJobs({
      id: "non-existent-gh-board",
      name: "NonExistent",
      atsToken: "non-existent-gh-token-999xyz",
    });

    expect(result.success).toBe(false);
    expect(result.httpStatus).toBe(404);
    expect(result.jobs).toEqual([]);
    expect(result.error).toContain("404");
  });
});

