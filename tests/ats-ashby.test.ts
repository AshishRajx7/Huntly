import { describe, it, expect } from "vitest";
import { fetchAshbyJobs } from "../src/lib/ats/ashby";

describe("Ashby ATS Adapter", () => {
  it("should fetch and normalize jobs from an active Ashby company (PostHog)", async () => {
    const result = await fetchAshbyJobs({
      id: "posthog",
      name: "PostHog",
      atsToken: "posthog",
      websiteUrl: "https://posthog.com",
    });

    expect(result.success).toBe(true);
    expect(result.atsProvider).toBe("ashby");
    expect(result.jobs.length).toBeGreaterThan(0);

    const sample = result.jobs[0];
    expect(sample.atsJobId).toBeDefined();
    expect(sample.jobTitle).toBeDefined();
    expect(sample.applicationUrl).toContain("ashbyhq.com");
    expect(sample.rawDescription.length).toBeGreaterThan(20);
  });

  it("should gracefully handle non-existent company token (404)", async () => {
    const result = await fetchAshbyJobs({
      id: "non-existent-xyz-999",
      name: "NonExistent",
      atsToken: "non-existent-xyz-999-board-token",
    });

    expect(result.success).toBe(false);
    expect(result.httpStatus).toBe(404);
    expect(result.jobs).toEqual([]);
    expect(result.error).toContain("404");
  });
});

