import type { RawAtsJob, AtsFetchResult } from "./types";

interface GreenhouseJobItem {
  id: number | string;
  title: string;
  content?: string;
  location?: {
    name?: string;
  };
  departments?: Array<{
    id: number;
    name: string;
  }>;
  offices?: Array<{
    id: number;
    name: string;
    location?: string;
  }>;
  absolute_url?: string;
  updated_at?: string;
}

interface GreenhouseApiResponse {
  jobs?: GreenhouseJobItem[];
}

export async function fetchGreenhouseJobs(
  company: { id: string; name: string; atsToken: string; websiteUrl?: string | null; logoUrl?: string | null },
  options: { timeoutMs?: number; maxRetries?: number } = {}
): Promise<AtsFetchResult> {
  const { timeoutMs = 8000, maxRetries = 2 } = options;
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(company.atsToken)}/jobs?content=true`;

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
            atsProvider: "greenhouse",
            success: false,
            jobs: [],
            error: `Greenhouse board not found (HTTP 404): ${company.atsToken}`,
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

      const data: GreenhouseApiResponse = await res.json();
      const rawList = Array.isArray(data?.jobs) ? data.jobs : [];

      const normalizedJobs: RawAtsJob[] = rawList
        .filter((item) => item && item.id != null && item.title)
        .map((item) => {
          const locationName = item.location?.name || "";
          const isRemote =
            locationName.toLowerCase().includes("remote") ||
            item.title.toLowerCase().includes("remote") ||
            false;

          const dept = item.departments && item.departments.length > 0 ? item.departments[0].name : undefined;

          return {
            atsProvider: "greenhouse",
            atsJobId: String(item.id),
            companyId: company.id,
            companyName: company.name,
            companyWebsite: company.websiteUrl || undefined,
            companyLogo: company.logoUrl || undefined,
            jobTitle: item.title.trim(),
            rawDescription: item.content || "",
            location: locationName || (isRemote ? "Remote" : undefined),
            isRemote,
            department: dept,
            employmentType: "Full-time",
            applicationUrl: item.absolute_url || `https://boards.greenhouse.io/${company.atsToken}/jobs/${item.id}`,
            originalPostingDate: item.updated_at,
            metadata: {
              departments: item.departments?.map((d) => d.name),
              offices: item.offices?.map((o) => o.name),
            },
          };
        });

      return {
        companyId: company.id,
        companyName: company.name,
        atsProvider: "greenhouse",
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
    atsProvider: "greenhouse",
    success: false,
    jobs: [],
    error: lastError,
    httpStatus: lastStatus || 500,
  };
}

