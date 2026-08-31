// ============================================================
// app/api/stations/[id]/route.ts
// ------------------------------------------------------------
// NEW ROUTE (didn't exist before). Handles GET /api/stations/:id
// — RailFlow's frontend calls this for the station detail view.
// Returns the mapped Station shape plus its active recommendations
// and alerts, matching src/services/api.ts's `getStationById`.
// Public (no auth) for the same reason as GET /api/stations —
// see that route's comments.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Station } from "@/models/Station";
import { mapStationToFrontend } from "@/lib/frontendContract";
import { buildEnrichmentMap } from "@/lib/stationEnrichment";
import { buildRecommendationsForStation } from "@/lib/recommendationsEngine";
import { buildAlertsList } from "@/lib/alertsEngine";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();

    const station = await Station.findById(params.id).catch(() => null);
    if (!station) {
      return NextResponse.json({ success: false, error: `Station '${params.id}' not found` }, { status: 404 });
    }

    const getEnrichment = await buildEnrichmentMap();
    const mapped = mapStationToFrontend(station, getEnrichment(station._id.toString()));

    const recommendations = await buildRecommendationsForStation(station._id.toString());
    const allAlerts = await buildAlertsList();
    const activeAlerts = allAlerts.filter((a) => a.stationId === station._id.toString() && !a.resolved);

    return NextResponse.json({
      success: true,
      data: { ...mapped, recommendations, activeAlerts },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to retrieve station details.", message: (error as Error).message },
      { status: 500 }
    );
  }
}
