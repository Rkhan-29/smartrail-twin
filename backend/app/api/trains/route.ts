// ============================================================
// app/api/trains/route.ts
// ------------------------------------------------------------
// Handles GET /api/trains. Returns active trains in the shape
// RailFlow's frontend expects. See app/api/stations/route.ts for
// why the auth requirement was dropped and the response envelope
// changed (same reasoning applies here).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Train } from "@/models/Train";
import { EtaLog } from "@/models/EtaLog";
import { mapTrainToFrontend } from "@/lib/frontendContract";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const line = req.nextUrl.searchParams.get("line");
    const search = req.nextUrl.searchParams.get("search");
    const status = req.nextUrl.searchParams.get("status");

    const filter: Record<string, unknown> = {};
    if (line && line.toUpperCase() !== "ALL") filter.line = new RegExp(`^${line}$`, "i");

    const statusMap: Record<string, string> = {
      "on time": "running",
      delayed: "delayed",
      departed: "terminated",
      cancelled: "cancelled",
    };
    if (status && statusMap[status.toLowerCase()]) filter.status = statusMap[status.toLowerCase()];

    const trains = await Train.find(filter)
      .populate("currentStation", "name")
      .populate("nextStation", "name")
      .populate("route")
      .sort({ trainNumber: 1 });

    const trainIds = trains.map((t) => t._id);
    const etas = await EtaLog.find({ train: { $in: trainIds } }).sort({ calculatedAt: -1 });
    const latestEtaByTrain = new Map<string, number>();
    for (const e of etas) {
      const key = e.train.toString();
      if (!latestEtaByTrain.has(key)) latestEtaByTrain.set(key, e.etaMinutes);
    }

    let mapped = trains.map((t) =>
      mapTrainToFrontend(t, {
        currentStationName: (t.currentStation as any)?.name,
        nextStationName: (t.nextStation as any)?.name,
        route: t.route as any,
        latestEtaMinutes: latestEtaByTrain.get(t._id.toString()) ?? null,
      })
    );

    if (search) {
      const q = search.toLowerCase().trim();
      mapped = mapped.filter(
        (t) =>
          t.trainName.toLowerCase().includes(q) ||
          t.trainNumber.includes(q) ||
          t.destination.toLowerCase().includes(q) ||
          t.currentStation.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ success: true, count: mapped.length, data: mapped });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to retrieve active trains.", message: (error as Error).message },
      { status: 500 }
    );
  }
}
