// ============================================================
// app/api/predictions/[stationId]/route.ts
// ------------------------------------------------------------
// NEW ROUTE. Handles GET /api/predictions/:stationId — the
// single-station prediction detail view, including a
// "contributing factors" breakdown built from real recent signal
// data (CCTV confidence, UTS/ATVM ticketing velocity) rather than
// invented numbers.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Station } from "@/models/Station";
import { CrowdLog } from "@/models/CrowdLog";
import { mapStationToFrontend } from "@/lib/frontendContract";
import { buildEnrichmentMap } from "@/lib/stationEnrichment";

export async function GET(req: NextRequest, { params }: { params: { stationId: string } }) {
  try {
    await connectToDatabase();

    const station = await Station.findById(params.stationId).catch(() => null);
    if (!station) {
      return NextResponse.json(
        { success: false, error: `Station '${params.stationId}' prediction not found` },
        { status: 404 }
      );
    }

    const getEnrichment = await buildEnrichmentMap();
    const enrichment = getEnrichment(station._id.toString());
    const mapped = mapStationToFrontend(station, enrichment);

    const latestLog = await CrowdLog.findOne({ station: station._id }).sort({ calculatedAt: -1 });

    const trend =
      mapped.predictedOccupancy > mapped.currentOccupancy
        ? "rising"
        : mapped.predictedOccupancy < mapped.currentOccupancy
          ? "falling"
          : "stable";

    return NextResponse.json({
      success: true,
      data: {
        stationId: mapped.id,
        stationName: mapped.name,
        line: mapped.line,
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        targetMinutes: 15,
        predictedCrowd: mapped.crowdStatus,
        predictedOccupancy: mapped.predictedOccupancy,
        confidenceScore: mapped.cctvSignalConfidence,
        trend,
        aiAssisted: latestLog?.aiAssisted ?? false,
        contributingFactors: [
          {
            factor: "CCTV Optical Density Flow",
            impact: "high",
            description: `Camera-based headcount tracking at ${mapped.cctvSignalConfidence}% average confidence over the last 5 minutes.`,
          },
          {
            factor: "UTS Digital Ticketing Velocity",
            impact: "high",
            description: `${enrichment.utsSessionCount ?? 0} UTS mobile-app bookings in the last 5 minutes.`,
          },
          {
            factor: "ATVM / UTS Counter Velocity",
            impact: "medium",
            description: `${mapped.etvmTicketingVelocity} tickets issued per minute across all channels.`,
          },
          {
            factor: "Digital Twin Flow Balance",
            impact: "medium",
            description: `Net inflow/outflow trend currently projects a ${trend} occupancy over the next 15 minutes.`,
          },
        ],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to compute station prediction.", message: (error as Error).message },
      { status: 500 }
    );
  }
}
