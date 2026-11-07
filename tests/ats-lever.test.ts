import { describe, it, expect } from "vitest";
import { fetchLeverJobs } from "../src/lib/ats/lever";

describe("Lever ATS Adapter", () => {
  it("should fetch and normalize jobs from an active Lever company (Kinsta)", async () => {
    const result = await fetchLeverJobs({
      id: "kinsta",
      name: "Kinsta",
      atsToken: "kinsta",
      websiteUrl: "https://kinsta.com",
    });

    expect(result.success).toBe(true);
    expect(result.atsProvider).toBe("lever");
    expect(result.jobs.length).toBeGreaterThan(0);

    const sample = result.jobs[0];
    expect(sample.atsJobId).toBeDefined();
    expect(sample.jobTitle).toBeDefined();
    expect(sample.applicationUrl).toContain("lever.co");
  });

  it("should gracefully handle non-existent Lever company (404)", async () => {
    const result = await fetchLeverJobs({
      id: "non-existent-lever-token-999",
      name: "NonExistent",
      atsToken: "non-existent-lever-token-999xyz",
    });

    expect(result.success).toBe(false);
    expect(result.httpStatus).toBe(404);
    expect(result.jobs).toEqual([]);
    expect(result.error).toContain("404");
  });
});

