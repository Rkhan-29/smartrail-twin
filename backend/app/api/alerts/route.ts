// ============================================================
// app/api/alerts/route.ts
// ------------------------------------------------------------
// NEW ROUTE. Handles GET /api/alerts. See lib/alertsEngine.ts
// for how alerts are computed (from live CrowdLog high/critical
// readings) and acknowledged (persisted in models/AlertAck.ts).
// Public (no auth) — read-only dashboard endpoint.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { buildAlertsList } from "@/lib/alertsEngine";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const severity = req.nextUrl.searchParams.get("severity");
    const resolved = req.nextUrl.searchParams.get("resolved");

    let alerts = await buildAlertsList();

    if (severity) {
      alerts = alerts.filter((a) => a.severity.toLowerCase() === severity.toLowerCase());
    }
    if (resolved !== null) {
      const isResolved = resolved === "true";
      alerts = alerts.filter((a) => a.resolved === isResolved);
    }

    return NextResponse.json({
      success: true,
      count: alerts.length,
      unresolvedCount: alerts.filter((a) => !a.resolved).length,
      data: alerts,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch alerts.", message: (error as Error).message },
      { status: 500 }
    );
  }
}
