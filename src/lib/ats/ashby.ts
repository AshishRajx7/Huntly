import type { RawAtsJob, AtsFetchResult, RawCompensation } from "./types";

interface AshbyJobItem {
  id: string;
  title: string;
  department?: string;
  team?: string;
  employmentType?: string;
  location?: string;
  secondaryLocations?: Array<{ location: string }>;
  publishedAt?: string;
  isListed?: boolean;
  isRemote?: boolean;
  workplaceType?: string;
  address?: {
    postalAddress?: {
      addressCountry?: string;
      addressLocality?: string;
      addressRegion?: string;
    };
  };
  jobUrl?: string;
  applyUrl?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  compensation?: {
    compensationTierSummary?: string;
    scrapeableCompensationSalarySummary?: string;
    compensationTiers?: Array<{
      title?: string;
      tierSummary?: string;
      interval?: string;
      exactAmount?: number;
      minAmount?: number;
      maxAmount?: number;
      currencyCode?: string;
    }>;
  };
}

interface AshbyApiResponse {
  apiVersion?: string;
  jobs?: AshbyJobItem[];
}

export async function fetchAshbyJobs(
  company: { id: string; name: string; atsToken: string; websiteUrl?: string | null; logoUrl?: string | null },
  options: { timeoutMs?: number; maxRetries?: number } = {}
): Promise<AtsFetchResult> {
  const { timeoutMs = 8000, maxRetries = 2 } = options;
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(company.atsToken)}?includeCompensation=true`;

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
            atsProvider: "ashby",
            success: false,
            jobs: [],
            error: `Company board not found (HTTP 404): ${company.atsToken}`,
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

      const data: AshbyApiResponse = await res.json();
      const rawList = Array.isArray(data?.jobs) ? data.jobs : [];

      const normalizedJobs: RawAtsJob[] = rawList
        .filter((item) => item && item.id && item.isListed !== false && item.title)
        .map((item) => {
          let comp: RawCompensation | undefined;
          if (item.compensation) {
            const tiers = item.compensation.compensationTiers || [];
            if (tiers.length > 0) {
              const tier = tiers[0];
              comp = {
                min: tier.minAmount || tier.exactAmount,
                max: tier.maxAmount || tier.exactAmount,
                currency: tier.currencyCode,
                interval: tier.interval?.toLowerCase() || "year",
                summary: tier.tierSummary || item.compensation.compensationTierSummary,
              };
            } else if (item.compensation.compensationTierSummary) {
              comp = {
                summary: item.compensation.compensationTierSummary,
              };
            }
          }

          const isRemote =
            item.isRemote === true ||
            item.workplaceType?.toLowerCase() === "remote" ||
            item.location?.toLowerCase().includes("remote") ||
            false;

          const desc = item.descriptionHtml || item.descriptionPlain || "";

          return {
            atsProvider: "ashby",
            atsJobId: item.id,
            companyId: company.id,
            companyName: company.name,
            companyWebsite: company.websiteUrl || undefined,
            companyLogo: company.logoUrl || undefined,
            jobTitle: item.title.trim(),
            rawDescription: desc,
            location: item.location || (isRemote ? "Remote" : undefined),
            isRemote,
            department: item.department || item.team,
            employmentType: item.employmentType || "Full-time",
            applicationUrl: item.applyUrl || item.jobUrl || `https://jobs.ashbyhq.com/${company.atsToken}/${item.id}`,
            originalPostingDate: item.publishedAt,
            rawCompensation: comp,
            metadata: {
              workplaceType: item.workplaceType,
              addressCountry: item.address?.postalAddress?.addressCountry,
            },
          };
        });

      return {
        companyId: company.id,
        companyName: company.name,
        atsProvider: "ashby",
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
    atsProvider: "ashby",
    success: false,
    jobs: [],
    error: lastError,
    httpStatus: lastStatus || 500,
  };
}

