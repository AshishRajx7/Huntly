import type { RawAtsJob, AtsFetchResult, RawCompensation } from "./types";

interface LeverJobItem {
  id: string;
  text: string;
  descriptionPlain?: string;
  description?: string;
  additionalPlain?: string;
  additional?: string;
  hostedUrl?: string;
  applyUrl?: string;
  createdAt?: number; // epoch ms
  categories?: {
    commitment?: string;
    department?: string;
    location?: string;
    team?: string;
    allLocations?: string[];
  };
  workplaceType?: string; // "remote", "onsite", "hybrid"
  salaryRange?: {
    min?: number;
    max?: number;
    currency?: string;
    interval?: string;
  };
}

export async function fetchLeverJobs(
  company: { id: string; name: string; atsToken: string; websiteUrl?: string | null; logoUrl?: string | null },
  options: { timeoutMs?: number; maxRetries?: number } = {}
): Promise<AtsFetchResult> {
  const { timeoutMs = 8000, maxRetries = 2 } = options;
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(company.atsToken)}?mode=json`;

  let lastError = "";
  let lastStatus = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        headers: {
          "User-Agent": "Huntly/1.0 (Personal Job Discovery; +https://huntly.local)",
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timer);
      lastStatus = res.status;

      if (!res.ok) {
        if (res.status === 404) {
          return {
            companyId: company.id,
            companyName: company.name,
            atsProvider: "lever",
            success: false,
            jobs: [],
            error: `Lever company not found (HTTP 404): ${company.atsToken}`,
            httpStatus: 404,
          };
        }
        if (res.status === 429 && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const rawList: LeverJobItem[] = await res.json();
      if (!Array.isArray(rawList)) {
        throw new Error("Lever returned non-array response");
      }

      const normalizedJobs: RawAtsJob[] = rawList
        .filter((item) => item && item.id && item.text)
        .map((item) => {
          const isRemote =
            item.workplaceType?.toLowerCase() === "remote" ||
            item.categories?.location?.toLowerCase().includes("remote") ||
            item.text.toLowerCase().includes("remote") ||
            false;

          let comp: RawCompensation | undefined;
          if (item.salaryRange) {
            comp = {
              min: item.salaryRange.min,
              max: item.salaryRange.max,
              currency: item.salaryRange.currency,
              interval: item.salaryRange.interval,
            };
          }

          const descParts = [item.description || item.descriptionPlain || ""];
          if (item.additional || item.additionalPlain) {
            descParts.push(item.additional || item.additionalPlain || "");
          }
          const fullDesc = descParts.filter(Boolean).join("\n\n");

          const postedDate = item.createdAt ? new Date(item.createdAt).toISOString() : undefined;

          return {
            atsProvider: "lever",
            atsJobId: item.id,
            companyId: company.id,
            companyName: company.name,
            companyWebsite: company.websiteUrl || undefined,
            companyLogo: company.logoUrl || undefined,
            jobTitle: item.text.trim(),
            rawDescription: fullDesc,
            location: item.categories?.location || (isRemote ? "Remote" : undefined),
            isRemote,
            department: item.categories?.department || item.categories?.team,
            employmentType: item.categories?.commitment || "Full-time",
            applicationUrl: item.applyUrl || item.hostedUrl || `https://jobs.lever.co/${company.atsToken}/${item.id}`,
            originalPostingDate: postedDate,
            rawCompensation: comp,
            metadata: {
              workplaceType: item.workplaceType,
              allLocations: item.categories?.allLocations,
            },
          };
        });

      return {
        companyId: company.id,
        companyName: company.name,
        atsProvider: "lever",
        success: true,
        jobs: normalizedJobs,
        httpStatus: 200,
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return {
    companyId: company.id,
    companyName: company.name,
    atsProvider: "lever",
    success: false,
    jobs: [],
    error: lastError,
    httpStatus: lastStatus || 500,
  };
}

