import { setTimeout as sleep } from "timers/promises";

export interface HytCompany {
  id?: string;
  name: string;
  slug?: string;
  logo_url?: string | null;
  url?: string | null;
}

export interface HytJobSummary {
  id: string; // UUID
  title: string;
  company: string | HytCompany;
  company_url?: string;
  location?: string;
  work_mode?: string;
  level?: string;
  role_type?: string;
  department?: string;
  skills?: string[];
  minimum_experience_years?: number;
  posted_at?: string;
  url?: string; // Direct employer application URL
}

export interface HytJobDetail {
  id: string; // UUID
  title: string;
  description: string; // Full markdown / HTML description
  company: string | HytCompany;
  company_url?: string;
  location?: string;
  continent?: string;
  country?: string;
  city?: string;
  work_mode?: string;
  level?: string;
  role_type?: string;
  department?: string;
  job_role?: string;
  skills?: string[];
  minimum_experience_years?: number;
  posted_at?: string;
  first_seen_at?: string;
  url?: string; // Direct employer application URL
}

export interface HytSearchOptions {
  query?: string;
  job_role?: string;
  city?: string;
  country?: string;
  continent?: string;
  work_mode?: string;
  level?: string;
  role_type?: string;
  skills?: string[];
  min_experience_years?: number;
  company?: string;
  limit?: number; // 1 to 25
  page?: number;
}

export interface HytSearchResponse {
  jobs: HytJobSummary[];
  meta: {
    page: number;
    limit: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    search?: {
      text?: string;
      corrected_from?: string | null;
      chips?: unknown[];
    };
  };
}

export interface HytClientConfig {
  endpoint?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBaseMs?: number;
  userAgent?: string;
}

export class HuntYourTribeError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public rpcCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "HuntYourTribeError";
  }
}

/**
 * Client for HuntYourTribe's public Model Context Protocol (MCP) server.
 * Uses Streamable HTTP (SSE) + JSON-RPC 2.0.
 */
export class HuntYourTribeClient {
  private endpoint: string;
  private timeoutMs: number;
  private maxRetries: number;
  private retryBaseMs: number;
  private userAgent: string;
  private nextRpcId = 1;
  private isInitialized = false;

  constructor(config: HytClientConfig = {}) {
    this.endpoint = config.endpoint || "https://api.huntyourtribe.com/mcp";
    this.timeoutMs = config.timeoutMs || 15000;
    this.maxRetries = config.maxRetries || 3;
    this.retryBaseMs = config.retryBaseMs || 1000;
    this.userAgent = config.userAgent || "Huntly/1.0 (+https://github.com/huntly)";
  }

  /**
   * Initializes the MCP protocol session if not already initialized.
   */
  async initialize(): Promise<{ name: string; version: string }> {
    const response = await this.rpcCall("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "huntly-client",
        version: "1.0.0",
      },
    });

    this.isInitialized = true;
    const serverInfo = response?.serverInfo || { name: "huntyourtribe-jobs", version: "1.0.0" };
    return serverInfo;
  }

  /**
   * Searches live job listings via the `search_jobs` MCP tool.
   */
  async searchJobs(options: HytSearchOptions = {}): Promise<HytSearchResponse> {
    const limit = Math.max(1, Math.min(25, options.limit || 10));
    const page = Math.max(1, options.page || 1);

    const args: Record<string, unknown> = {
      limit,
      page,
    };

    if (options.query?.trim()) args.query = options.query.trim();
    if (options.job_role?.trim()) args.job_role = options.job_role.trim();
    if (options.city?.trim()) args.city = options.city.trim();
    if (options.country?.trim()) args.country = options.country.trim();
    if (options.continent?.trim()) args.continent = options.continent.trim();
    if (options.work_mode?.trim()) args.work_mode = options.work_mode.trim();
    if (options.level?.trim()) args.level = options.level.trim();
    if (options.role_type?.trim()) args.role_type = options.role_type.trim();
    if (Array.isArray(options.skills) && options.skills.length > 0) args.skills = options.skills;
    if (typeof options.min_experience_years === "number") {
      args.min_experience_years = options.min_experience_years;
    }
    if (options.company?.trim()) args.company = options.company.trim();

    const toolResult = await this.callTool<string>("search_jobs", args);

    try {
      const parsed = typeof toolResult === "string" ? JSON.parse(toolResult) : toolResult;
      return {
        jobs: Array.isArray(parsed?.jobs) ? parsed.jobs : [],
        meta: {
          page: parsed?.meta?.page || page,
          limit: parsed?.meta?.limit || limit,
          total_count: parsed?.meta?.total_count || 0,
          total_pages: parsed?.meta?.total_pages || 1,
          has_next: Boolean(parsed?.meta?.has_next),
          search: parsed?.meta?.search,
        },
      };
    } catch (parseErr) {
      throw new HuntYourTribeError(
        `Failed to parse search_jobs response JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
        200,
        undefined,
        false
      );
    }
  }

  /**
   * Retrieves full details for a single job by its UUID via `get_job_details`.
   */
  async getJobDetails(id: string): Promise<HytJobDetail> {
    if (!id || typeof id !== "string") {
      throw new HuntYourTribeError("A valid job id (UUID) is required for get_job_details");
    }

    const toolResult = await this.callTool<string>("get_job_details", { id });

    try {
      const parsed: HytJobDetail = typeof toolResult === "string" ? JSON.parse(toolResult) : toolResult;
      return parsed;
    } catch (parseErr) {
      throw new HuntYourTribeError(
        `Failed to parse get_job_details response JSON for id ${id}: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
        200,
        undefined,
        false
      );
    }
  }

  /**
   * Invokes an MCP tool by name with arguments.
   */
  async callTool<T = unknown>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    const response = await this.rpcCall("tools/call", {
      name,
      arguments: args,
    });

    const content = response?.content;
    if (Array.isArray(content) && content.length > 0) {
      const textItem = content.find((item: { type: string; text?: string }) => item.type === "text");
      if (textItem && typeof textItem.text === "string") {
        return textItem.text as unknown as T;
      }
    }

    throw new HuntYourTribeError(
      `Unexpected MCP tool response structure for tool "${name}"`,
      200,
      undefined,
      false
    );
  }

  /**
   * Sends a JSON-RPC 2.0 request over HTTP POST and parses the SSE / JSON response.
   * Handles retry with exponential backoff on transient errors (429, 503, timeouts).
   */
  private async rpcCall(method: string, params: Record<string, unknown>): Promise<any> {
    const id = this.nextRpcId++;
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params,
    });

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(this.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
            "User-Agent": this.userAgent,
          },
          body: payload,
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        // Handle rate limiting (HTTP 429) and temporary service errors (HTTP 502/503/504)
        if (response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504) {
          const retryAfterSec = Number(response.headers.get("retry-after")) || (this.retryBaseMs * Math.pow(2, attempt - 1)) / 1000;
          const waitMs = Math.min(retryAfterSec * 1000, 10000);
          lastError = new HuntYourTribeError(
            `HuntYourTribe HTTP ${response.status} (${response.statusText}); waiting ${waitMs}ms`,
            response.status,
            undefined,
            true
          );
          if (attempt < this.maxRetries) {
            await sleep(waitMs);
            continue;
          }
          throw lastError;
        }

        if (!response.ok) {
          throw new HuntYourTribeError(
            `HuntYourTribe HTTP request failed: ${response.status} ${response.statusText}`,
            response.status,
            undefined,
            false
          );
        }

        const rawText = await response.text();
        return this.parseRpcResponse(rawText, id);
      } catch (err: unknown) {
        if (err instanceof HuntYourTribeError && !err.retryable) {
          throw err;
        }

        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.maxRetries) {
          const backoff = this.retryBaseMs * Math.pow(2, attempt - 1);
          await sleep(backoff);
        }
      }
    }

    throw lastError || new HuntYourTribeError(`RPC call "${method}" failed after ${this.maxRetries} attempts`);
  }

  /**
   * Parses JSON-RPC responses from raw text, supporting both direct JSON and SSE format.
   */
  private parseRpcResponse(rawText: string, expectedId: number): any {
    // 1. Try parsing directly as JSON
    const trimmed = rawText.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const json = JSON.parse(trimmed);
        if (json.error) {
          throw new HuntYourTribeError(
            `HuntYourTribe RPC Error: ${json.error.message || "Unknown error"}`,
            200,
            json.error.code,
            Boolean(json.error.code === -32000)
          );
        }
        return json.result;
      } catch (e) {
        if (e instanceof HuntYourTribeError) throw e;
      }
    }

    // 2. Parse Server-Sent Events (SSE) format: 'event: message\ndata: {...}'
    const lines = rawText.split("\n");
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("data:")) {
        const jsonPart = trimmedLine.replace(/^data:\s*/, "");
        try {
          const json = JSON.parse(jsonPart);
          if (json.error) {
            throw new HuntYourTribeError(
              `HuntYourTribe RPC Error: ${json.error.message || "Unknown error"}`,
              200,
              json.error.code,
              Boolean(json.error.code === -32000)
            );
          }
          if (json.id === expectedId || json.result !== undefined) {
            return json.result;
          }
        } catch (e) {
          if (e instanceof HuntYourTribeError) throw e;
        }
      }
    }

    throw new HuntYourTribeError(
      `Could not parse valid JSON-RPC message from response: ${rawText.slice(0, 200)}...`
    );
  }
}

