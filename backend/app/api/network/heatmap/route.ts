// ============================================================
// app/api/network/heatmap/route.ts
// ------------------------------------------------------------
// NEW ROUTE. Handles GET /api/network/heatmap — the map-pin
// dataset RailFlow's frontend expects (richer than the existing
// /api/heatmap route, which stays untouched for any other
// consumer that already depends on its simpler shape).
// ============================================================

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Station } from "@/models/Station";
import { mapStationToFrontend } from "@/lib/frontendContract";
import { buildEnrichmentMap } from "@/lib/stationEnrichment";

export async function GET() {
  try {
    await connectToDatabase();

    const stations = await Station.find();
    const getEnrichment = await buildEnrichmentMap();

    const points = stations.map((s) => {
      const mapped = mapStationToFrontend(s, getEnrichment(s._id.toString()));
      return {
        id: mapped.id,
        name: mapped.name,
        line: mapped.line,
        lines: mapped.lines,
        latitude: mapped.latitude,
        longitude: mapped.longitude,
        currentOccupancy: mapped.currentOccupancy,
        predictedOccupancy: mapped.predictedOccupancy,
        crowdStatus: mapped.crowdStatus,
        heatWeight: Math.round((mapped.currentOccupancy / 100) * 10) / 10,
        forecastHeatWeight: Math.round((mapped.predictedOccupancy / 100) * 10) / 10,
        surgeAlert: mapped.predictedOccupancy >= 80,
        nextTrain: mapped.nextTrain,
        platform: mapped.platform,
        destination: mapped.destination,
      };
    });

    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), count: points.length, data: points });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to generate heatmap dataset.", message: (error as Error).message },
      { status: 500 }
    );
  }
}
