import { setTimeout as sleep } from "timers/promises";

export interface FreehireJobEnrichment {
  summary?: string;
  relocation?: string;
  experience_years_min?: number;
  education_level?: string;
  category?: string;
  domains?: string[];
  posting_language?: string;
  company_type?: string;
  company_size?: string;
  requirements?: Array<{
    text: string;
    priority: "required" | "preferred" | string;
  }>;
}

export interface FreehireJobReality {
  class?: "fresh" | "stale" | "ghost" | string;
  age_days?: number;
  repost_count?: number;
  mass_posting_count?: number;
  fake_freshness?: boolean;
}

export interface FreehireJob {
  public_slug: string;
  source: string;
  manually_added?: boolean;
  external_id: string;
  url: string;
  title: string;
  company: string;
  company_slug: string;
  location: string;
  description: string;
  countries?: string[];
  regions?: string[];
  work_mode?: "remote" | "hybrid" | "onsite" | string;
  skills?: string[];
  cities?: string[];
  metros?: string[];
  collections?: string[];
  perks?: string[];
  is_tech?: string;
  posted_at?: string;
  created_at?: string;
  updated_at?: string;
  last_seen_at?: string;
  closed_at?: string | null;
  enrichment?: FreehireJobEnrichment;
  reality?: FreehireJobReality;
}

export interface FreehireSearchOptions {
  q?: string;
  skills?: string | string[];
  cities?: string | string[];
  countries?: string | string[];
  work_mode?: "remote" | "hybrid" | "onsite" | string;
  limit?: number;
  offset?: number;
  description_format?: "markdown" | "html";
  reality_class?: "fresh" | "stale" | "ghost" | string;
}

export interface FreehireSearchResponse {
  data: FreehireJob[];
  meta: {
    limit: number;
    offset: number;
    total: number;
    ignored_params?: Record<string, unknown>;
  };
}

export interface FreehireClientConfig {
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBaseMs?: number;
  userAgent?: string;
}

export class FreehireError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "FreehireError";
  }
}

/**
 * Client for Freehire's public Agent API.
 * Uses GET /api/v1/agent/jobs/search with retry backoff and rate limit handling.
 */
export class FreehireClient {
  private baseUrl: string;
  private timeoutMs: number;
  private maxRetries: number;
  private retryBaseMs: number;
  private userAgent: string;

  constructor(config: FreehireClientConfig = {}) {
    this.baseUrl = config.baseUrl || "https://freehire.me/api/v1";
    this.timeoutMs = config.timeoutMs || 15000;
    this.maxRetries = config.maxRetries || 3;
    this.retryBaseMs = config.retryBaseMs || 1000;
    this.userAgent = config.userAgent || "Huntly/1.0 (+https://github.com/huntly)";
  }

  /**
   * Searches jobs using Freehire's public Agent API endpoint.
   */
  async searchJobs(options: FreehireSearchOptions = {}): Promise<FreehireSearchResponse> {
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const offset = Math.max(0, options.offset || 0);

    // Freehire constraint: offset + limit <= 10000
    if (offset + limit > 10000) {
      throw new FreehireError("Offset + limit cannot exceed 10,000 in Freehire API", 400, false);
    }

    const url = new URL(`${this.baseUrl}/agent/jobs/search`);
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("offset", offset.toString());
    url.searchParams.set("description_format", options.description_format || "markdown");

    if (options.q?.trim()) {
      url.searchParams.set("q", options.q.trim());
    }

    if (options.work_mode) {
      url.searchParams.set("work_mode", options.work_mode);
    }

    if (options.skills) {
      const skillsVal = Array.isArray(options.skills) ? options.skills.join(",") : options.skills;
      if (skillsVal.trim()) url.searchParams.set("skills", skillsVal.trim());
    }

    if (options.cities) {
      const citiesVal = Array.isArray(options.cities) ? options.cities.join(",") : options.cities;
      if (citiesVal.trim()) url.searchParams.set("cities", citiesVal.trim());
    }

    if (options.countries) {
      const countriesVal = Array.isArray(options.countries)
        ? options.countries.join(",")
        : options.countries;
      if (countriesVal.trim()) url.searchParams.set("countries", countriesVal.trim());
    }

    if (options.reality_class) {
      url.searchParams.set("reality_class", options.reality_class);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "User-Agent": this.userAgent,
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timer);

        // Rate limit tracking
        const remaining = response.headers.get("x-ratelimit-remaining");
        const resetSeconds = parseInt(response.headers.get("x-ratelimit-reset") || "1", 10);

        if (response.status === 429) {
          const waitMs = (resetSeconds > 0 ? resetSeconds : 2) * 1000;
          if (attempt < this.maxRetries) {
            await sleep(waitMs);
            continue;
          }
          throw new FreehireError("Rate limit exceeded (429)", 429, true);
        }

        if (!response.ok) {
          const isRetryable = response.status >= 500 && response.status < 600;
          const bodyText = await response.text().catch(() => "");
          const err = new FreehireError(
            `Freehire API HTTP ${response.status}: ${bodyText.slice(0, 200)}`,
            response.status,
            isRetryable
          );

          if (isRetryable && attempt < this.maxRetries) {
            lastError = err;
            const backoffMs = this.retryBaseMs * Math.pow(2, attempt) + Math.random() * 200;
            await sleep(backoffMs);
            continue;
          }
          throw err;
        }

        const data = await response.json();

        // Validate response structure
        if (!data || !Array.isArray(data.data)) {
          throw new FreehireError("Malformed Freehire response: missing 'data' array", 200, false);
        }

        return {
          data: data.data,
          meta: {
            limit: data.meta?.limit || limit,
            offset: data.meta?.offset || offset,
            total: data.meta?.total || 0,
            ignored_params: data.meta?.ignored_params,
          },
        };
      } catch (err: unknown) {
        if (err instanceof FreehireError && !err.retryable) {
          throw err;
        }

        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < this.maxRetries) {
          const backoffMs = this.retryBaseMs * Math.pow(2, attempt) + Math.random() * 200;
          await sleep(backoffMs);
        }
      }
    }

    throw (
      lastError ||
      new FreehireError(`Request failed after ${this.maxRetries + 1} attempts`, 500, false)
    );
  }
}

