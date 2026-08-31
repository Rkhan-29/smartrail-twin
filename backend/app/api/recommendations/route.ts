// ============================================================
// app/api/recommendations/route.ts
// ------------------------------------------------------------
// INTEGRATION CHANGE: previously required a `stationId` query
// param, required auth, and returned a single-station "board
// this train" tip. RailFlow's frontend calls this with NO
// required params expecting a network-wide, optionally filtered
// list of operational recommendation cards. Rewritten to match
// that contract — see lib/recommendationsEngine.ts for the
// generation logic (built from live CrowdLog data, not mocked).
// Public (no auth) for the same reason as the other dashboard
// read endpoints — see app/api/stations/route.ts.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { buildAllRecommendations } from "@/lib/recommendationsEngine";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const stationId = req.nextUrl.searchParams.get("stationId");
    const priority = req.nextUrl.searchParams.get("priority");

    let recs = await buildAllRecommendations();

    if (stationId) {
      recs = recs.filter((r) => r.stationId.toLowerCase() === stationId.toLowerCase());
    }
    if (priority) {
      recs = recs.filter((r) => r.priority.toUpperCase() === priority.toUpperCase());
    }

    return NextResponse.json({ success: true, count: recs.length, data: recs });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch recommendations.", message: (error as Error).message },
      { status: 500 }
    );
  }
}
