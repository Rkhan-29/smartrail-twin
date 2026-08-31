// ============================================================
// app/api/trains/[id]/route.ts
// ------------------------------------------------------------
// NEW ROUTE. Handles GET /api/trains/:id for the frontend's
// train detail lookups. Accepts either the Mongo _id or the
// public trainNumber (e.g. "WR-1001"), matching the old mock
// server's lenient lookup behaviour.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Train } from "@/models/Train";
import { EtaLog } from "@/models/EtaLog";
import { mapTrainToFrontend } from "@/lib/frontendContract";
import mongoose from "mongoose";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();

    const isObjectId = mongoose.isValidObjectId(params.id);
    const train = await Train.findOne(
      isObjectId ? { _id: params.id } : { trainNumber: params.id.toUpperCase() }
    )
      .populate("currentStation", "name")
      .populate("nextStation", "name")
      .populate("route");

    if (!train) {
      return NextResponse.json({ success: false, error: `Train '${params.id}' not found` }, { status: 404 });
    }

    const latestEta = await EtaLog.findOne({ train: train._id }).sort({ calculatedAt: -1 });

    const mapped = mapTrainToFrontend(train, {
      currentStationName: (train.currentStation as any)?.name,
      nextStationName: (train.nextStation as any)?.name,
      route: train.route as any,
      latestEtaMinutes: latestEta?.etaMinutes ?? null,
    });

    return NextResponse.json({ success: true, data: mapped });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to retrieve train details.", message: (error as Error).message },
      { status: 500 }
    );
  }
}
