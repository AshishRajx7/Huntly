import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { applications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    initDb();
    const { id } = await params;
    const appId = parseInt(id, 10);
    const body = await request.json();

    const allowedStatuses = ["saved", "applied", "screening", "interview", "offer", "rejected"];
    if (body.status && !allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = { updatedAt: now };

    if (body.status !== undefined) updateData.status = body.status;
    if (body.appliedDate !== undefined) updateData.appliedDate = body.appliedDate;
    if (body.notes !== undefined) updateData.notes = body.notes;

    db.update(applications)
      .set(updateData)
      .where(eq(applications.id, appId))
      .run();

    return NextResponse.json({ success: true, id: appId });
  } catch (error) {
    console.error("Application PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    initDb();
    const { id } = await params;
    const appId = parseInt(id, 10);

    db.delete(applications).where(eq(applications.id, appId)).run();

    return NextResponse.json({ success: true, id: appId });
  } catch (error) {
    console.error("Application DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

