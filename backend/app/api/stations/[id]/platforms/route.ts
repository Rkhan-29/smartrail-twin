// ============================================================
// app/api/stations/[id]/platforms/route.ts
// ------------------------------------------------------------
// NEW ROUTE. Handles GET /api/stations/:id/platforms. This
// backend's schema only stores a single `platformCount` number
// per station (not per-platform live telemetry), so we build one
// PlatformInfo entry per physical platform using the station's
// overall live occupancy as a reasonable shared baseline — this
// is documented as a simplification (see BUGFIX_REPORT.md) since
// no backend model tracks per-platform occupancy independently.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Station } from "@/models/Station";
import { mapStationToFrontend } from "@/lib/frontendContract";
import { buildEnrichmentMap } from "@/lib/stationEnrichment";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();

    const station = await Station.findById(params.id).catch(() => null);
    if (!station) {
      return NextResponse.json({ success: false, error: `Station '${params.id}' not found` }, { status: 404 });
    }

    const getEnrichment = await buildEnrichmentMap();
    const mapped = mapStationToFrontend(station, getEnrichment(station._id.toString()));

    const platforms = Array.from({ length: Math.max(1, station.platformCount) }, (_, i) => ({
      platformNumber: i + 1,
      line: mapped.line,
      currentCrowd: mapped.crowdStatus,
      occupancyPercentage: mapped.currentOccupancy,
      nextTrainTime: mapped.nextTrain,
      nextTrainDestination: mapped.destination,
      isFastTrainOnly: false,
    }));

    return NextResponse.json({
      success: true,
      stationId: mapped.id,
      stationName: mapped.name,
      platformsCount: station.platformCount,
      data: platforms,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch platform telemetry.", message: (error as Error).message },
      { status: 500 }
    );
  }
}
