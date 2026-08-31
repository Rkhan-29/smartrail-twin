// ============================================================
// app/api/alerts/[id]/ack/route.ts
// ------------------------------------------------------------
// NEW ROUTE. Handles POST /api/alerts/:id/ack — an operator
// acknowledging/dismissing an alert. Persisted via
// models/AlertAck.ts so it survives a page refresh / server
// restart. Public (no auth) to match the rest of this dashboard
// surface; see app/api/stations/route.ts for the rationale. If
// you want to lock this specific write action down to logged-in
// operators later, add requireAuth() here without touching
// anything else.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { acknowledgeAlert } from "@/lib/alertsEngine";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();

    const alert = await acknowledgeAlert(params.id);
    if (!alert) {
      return NextResponse.json({ success: false, error: `Alert '${params.id}' not found` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Alert '${params.id}' acknowledged successfully`,
      data: alert,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to acknowledge alert.", message: (error as Error).message },
      { status: 500 }
    );
  }
}
