// ============================================================
// app/api/network/overview/route.ts
// ------------------------------------------------------------
// NEW ROUTE. Handles GET /api/network/overview — the top-level
// KPI strip on RailFlow's dashboard (total stations, active
// trains, per-line counts, congestion breakdown, average
// occupancy, system health). Built entirely from real,
// currently-live data (Station + digital twin + Train), no mock
// numbers.
// ============================================================

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Station } from "@/models/Station";
import { Train } from "@/models/Train";
import { getAllStationStates } from "@/services/digitalTwin";
import { mapLine } from "@/lib/frontendContract";

export async function GET() {
  try {
    await connectToDatabase();

    const [stations, states, activeTrains] = await Promise.all([
      Station.find(),
      getAllStationStates(),
      Train.countDocuments({ status: "running" }),
    ]);

    const stateByStation = new Map(states.map((s) => [s.stationId, s]));

    const occupancyByStation = stations.map((s) => {
      const state = stateByStation.get(s._id.toString());
      const occupancy = state?.occupancy ?? 0;
      return Math.max(0, Math.min(100, Math.round((occupancy / (s.capacity || 1)) * 100)));
    });

    const westernCount = stations.filter((s) => mapLine(s.line) === "WESTERN").length;
    const centralCount = stations.filter((s) => mapLine(s.line) === "CENTRAL").length;
    const harbourCount = stations.filter((s) => mapLine(s.line) === "HARBOUR").length;

    const criticalCount = occupancyByStation.filter((o) => o >= 85).length;
    const highCount = occupancyByStation.filter((o) => o >= 70 && o < 85).length;
    const moderateCount = occupancyByStation.filter((o) => o >= 40 && o < 70).length;
    const normalCount = occupancyByStation.filter((o) => o < 40).length;

    const averageOccupancy = occupancyByStation.length
      ? Math.round(occupancyByStation.reduce((a, b) => a + b, 0) / occupancyByStation.length)
      : 0;

    const systemHealth = criticalCount > 4 ? "Congestion Alert" : criticalCount > 0 ? "Heavy Traffic" : "Optimal";

    return NextResponse.json({
      success: true,
      data: {
        totalStationsMonitored: stations.length,
        activeTrains,
        westernStationsCount: westernCount,
        centralStationsCount: centralCount,
        harbourStationsCount: harbourCount,
        criticalStationsCount: criticalCount,
        highCrowdStationsCount: highCount,
        moderateStationsCount: moderateCount,
        normalStationsCount: normalCount,
        averageOccupancy,
        systemHealth,
        lastSignalSync: `Live (Sync @ ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })})`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to generate network overview.", message: (error as Error).message },
      { status: 500 }
    );
  }
}
