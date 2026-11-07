import { db } from "../db";
import { companies, type Company, type NewCompany } from "../db/schema";
import { eq } from "drizzle-orm";
import verifiedCompaniesJson from "./verified-companies.json";

export async function seedCompanies(): Promise<number> {
  const existing = await db.select({ id: companies.id }).from(companies);
  const existingIds = new Set(existing.map((c) => c.id));

  let insertedCount = 0;
  const now = new Date().toISOString();

  for (const c of verifiedCompaniesJson) {
    if (!existingIds.has(c.id)) {
      await db.insert(companies).values({
        id: c.id,
        name: c.name,
        atsProvider: c.atsProvider,
        atsToken: c.atsToken,
        websiteUrl: c.websiteUrl,
        careerPageUrl: c.careerPageUrl,
        logoUrl: `https://logo.clearbit.com/${new URL(c.websiteUrl).hostname}`,
        isActive: true,
        createdAt: now,
      });
      insertedCount++;
    }
  }

  return insertedCount;
}

export async function getAllCompanies(activeOnly = false): Promise<Company[]> {
  if (activeOnly) {
    return db.select().from(companies).where(eq(companies.isActive, true));
  }
  return db.select().from(companies);
}

export async function getCompanyById(id: string): Promise<Company | undefined> {
  const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return result[0];
}

export async function toggleCompany(id: string, isActive: boolean): Promise<void> {
  await db.update(companies).set({ isActive }).where(eq(companies.id, id));
}

export async function updateCompanyLastSynced(id: string): Promise<void> {
  await db
    .update(companies)
    .set({ lastSyncedAt: new Date().toISOString() })
    .where(eq(companies.id, id));
}

export async function addCompany(newCo: {
  name: string;
  atsProvider: "ashby" | "greenhouse" | "lever";
  atsToken: string;
  websiteUrl?: string;
  careerPageUrl?: string;
}): Promise<Company> {
  const id = newCo.atsToken.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const now = new Date().toISOString();

  const values: NewCompany = {
    id,
    name: newCo.name,
    atsProvider: newCo.atsProvider,
    atsToken: newCo.atsToken,
    websiteUrl: newCo.websiteUrl || null,
    careerPageUrl: newCo.careerPageUrl || null,
    logoUrl: newCo.websiteUrl ? `https://logo.clearbit.com/${new URL(newCo.websiteUrl).hostname}` : null,
    isActive: true,
    createdAt: now,
  };

  await db.insert(companies).values(values).onConflictDoUpdate({
    target: companies.id,
    set: {
      name: newCo.name,
      atsProvider: newCo.atsProvider,
      atsToken: newCo.atsToken,
      websiteUrl: newCo.websiteUrl || null,
      careerPageUrl: newCo.careerPageUrl || null,
    },
  });

  return (await getCompanyById(id))!;
}

/**
 * Lightweight ATS detection using public career page or URL pattern
 */
export function detectAtsFromUrl(inputUrl: string): {
  atsProvider: "ashby" | "greenhouse" | "lever" | null;
  atsToken: string | null;
} {
  try {
    const url = new URL(inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`);
    const host = url.hostname.toLowerCase();
    const pathname = url.pathname.replace(/^\/|\/$/g, "");
    const segments = pathname.split("/");

    // 1. Ashby patterns: jobs.ashbyhq.com/:token or api.ashbyhq.com/posting-api/job-board/:token
    if (host.includes("ashbyhq.com")) {
      const token = segments[segments.length - 1] || segments[0];
      return { atsProvider: "ashby", atsToken: token };
    }

    // 2. Greenhouse patterns: boards.greenhouse.io/:token or job-boards.greenhouse.io/:token
    if (host.includes("greenhouse.io")) {
      const token = segments[0] === "embed" && url.searchParams.get("for")
        ? url.searchParams.get("for")
        : segments[0];
      return { atsProvider: "greenhouse", atsToken: token || null };
    }

    // 3. Lever patterns: jobs.lever.co/:token
    if (host.includes("lever.co")) {
      const token = segments[0];
      return { atsProvider: "lever", atsToken: token || null };
    }

    return { atsProvider: null, atsToken: null };
  } catch {
    return { atsProvider: null, atsToken: null };
  }
}

