import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { syncLogs, companies } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { syncAllCompanies, syncCompany } from "@/lib/ingestion/sync-service";
import { syncHuntYourTribe } from "@/lib/ingestion/hunt-your-tribe-sync";
import { syncFreehire } from "@/lib/ingestion/freehire-sync";

export async function GET() {
  try {
    initDb();
    const logs = db
      .select()
      .from(syncLogs)
      .orderBy(desc(syncLogs.id))
      .limit(20)
      .all();

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Sync GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    initDb();
    let body: {
      companyId?: string;
      source?: string;
      maxJobs?: number;
      batchSize?: number;
      searchOptions?: Record<string, unknown>;
    } = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty for full sync
    }

    // Support syncing HuntYourTribe directly
    if (body.source === "huntyourtribe") {
      const stats = await syncHuntYourTribe({
        maxJobs: body.maxJobs,
        batchSize: body.batchSize,
        searchOptions: body.searchOptions,
      });
      return NextResponse.json({ stats });
    }

    // Support syncing Freehire directly
    if (body.source === "freehire") {
      const stats = await syncFreehire({
        maxJobs: body.maxJobs,
        batchSize: body.batchSize,
        searchOptions: body.searchOptions,
      });
      return NextResponse.json({ stats });
    }

    if (body.companyId) {
      const company = db
        .select()
        .from(companies)
        .where(eq(companies.id, body.companyId))
        .get();

      if (!company) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 });
      }

      const result = await syncCompany(company);
      return NextResponse.json({ result });
    }

    // Full sync of all active companies
    const stats = await syncAllCompanies("manual", 5);
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Sync POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

