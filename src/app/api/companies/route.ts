import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { companies, jobs } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { addCompany, toggleCompany, detectAtsFromUrl } from "@/lib/companies/registry";

export async function GET() {
  try {
    initDb();

    // Query companies with active job counts
    const items = db
      .select({
        id: companies.id,
        name: companies.name,
        atsProvider: companies.atsProvider,
        atsToken: companies.atsToken,
        websiteUrl: companies.websiteUrl,
        careerPageUrl: companies.careerPageUrl,
        logoUrl: companies.logoUrl,
        isActive: companies.isActive,
        lastSyncedAt: companies.lastSyncedAt,
        createdAt: companies.createdAt,
        activeJobsCount: sql<number>`(
          SELECT count(*) FROM jobs 
          WHERE jobs.company_id = ${companies.id} AND jobs.status = 'active'
        )`,
      })
      .from(companies)
      .orderBy(companies.name)
      .all();

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Companies GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    initDb();
    const body = await request.json();
    const { name, atsProvider, atsToken, websiteUrl, careerPageUrl } = body;

    let finalProvider = atsProvider;
    let finalToken = atsToken;

    // If career page URL was provided, attempt detection if provider/token are missing
    if ((!finalProvider || !finalToken) && careerPageUrl) {
      const detected = detectAtsFromUrl(careerPageUrl);
      if (detected.atsProvider && detected.atsToken) {
        finalProvider = detected.atsProvider;
        finalToken = detected.atsToken;
      }
    }

    if (!name || !finalProvider || !finalToken) {
      return NextResponse.json(
        { error: "Name, ATS Provider, and ATS Token are required." },
        { status: 400 }
      );
    }

    const company = await addCompany({
      name,
      atsProvider: finalProvider,
      atsToken: finalToken,
      websiteUrl,
      careerPageUrl,
    });

    return NextResponse.json({ item: company });
  } catch (error) {
    console.error("Company POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    initDb();
    const body = await request.json();
    const { id, isActive } = body;

    if (!id || typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    await toggleCompany(id, isActive);
    return NextResponse.json({ success: true, id, isActive });
  } catch (error) {
    console.error("Company PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

