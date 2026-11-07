import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { matches, jobs, applications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    initDb();
    const { id } = await params;
    const matchId = parseInt(id, 10);
    const body = await request.json();
    const { status } = body;

    if (!["new", "saved", "dismissed", "applied"].includes(status)) {
      return NextResponse.json({ error: "Invalid match status" }, { status: 400 });
    }

    const match = db.select().from(matches).where(eq(matches.id, matchId)).get();
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    db.update(matches)
      .set({ status, updatedAt: now })
      .where(eq(matches.id, matchId))
      .run();

    // If marked as applied or saved, check if we should create an entry in applications table
    if (status === "applied" || status === "saved") {
      const existingApp = db
        .select()
        .from(applications)
        .where(eq(applications.jobId, match.jobId))
        .get();

      if (!existingApp) {
        const job = db.select().from(jobs).where(eq(jobs.id, match.jobId)).get();
        if (job) {
          db.insert(applications)
            .values({
              jobId: job.id,
              companyName: job.companyName,
              jobTitle: job.jobTitle,
              applicationUrl: job.applicationUrl,
              status: status === "applied" ? "applied" : "saved",
              appliedDate: status === "applied" ? now.slice(0, 10) : null,
              notes: `Added from AI Matches (Score: ${match.matchScore}%)`,
              createdAt: now,
              updatedAt: now,
            })
            .run();
        }
      } else if (status === "applied" && existingApp.status !== "applied") {
        db.update(applications)
          .set({
            status: "applied",
            appliedDate: now.slice(0, 10),
            updatedAt: now,
          })
          .where(eq(applications.id, existingApp.id))
          .run();
      }
    }

    return NextResponse.json({ success: true, matchId, status });
  } catch (error) {
    console.error("Match update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

