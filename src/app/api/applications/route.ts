import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { applications, jobs } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    initDb();

    const items = db
      .select({
        id: applications.id,
        jobId: applications.jobId,
        companyName: applications.companyName,
        jobTitle: applications.jobTitle,
        applicationUrl: applications.applicationUrl,
        status: applications.status,
        appliedDate: applications.appliedDate,
        notes: applications.notes,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        location: jobs.location,
        salaryFormatted: jobs.salaryFormatted,
        isRemote: jobs.isRemote,
      })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .orderBy(desc(applications.updatedAt))
      .all();

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Applications GET error:", error);
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
    const { jobId, companyName, jobTitle, applicationUrl, status, appliedDate, notes } = body;

    if (!jobId || !companyName || !jobTitle || !applicationUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const now = new Date().toISOString();

    const result = db
      .insert(applications)
      .values({
        jobId,
        companyName,
        jobTitle,
        applicationUrl,
        status: status || "saved",
        appliedDate: appliedDate || null,
        notes: notes || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    return NextResponse.json({ item: result });
  } catch (error) {
    console.error("Applications POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

