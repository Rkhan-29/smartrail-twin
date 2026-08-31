// ============================================================
// app/api/stations/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles GET /api/stations. Returns the full list of stations
// so the frontend can draw the network map / station picker.
// Supports ?line=, ?search=, ?minOccupancy= and ?limit= filters.
//
// INTEGRATION CHANGE: this route's response shape and auth
// requirement were changed as part of wiring up the RailFlow
// frontend (see BUGFIX_REPORT.md, "Broken routes" section):
//   1. Response is now the `{ success, count, total, data }`
//      envelope RailFlow's api.ts expects, with each station
//      mapped to RailFlow's richer Station shape (lib/
//      frontendContract.ts), instead of the old raw
//      `{ count, stations }` shape.
//   2. requireAuth() was removed for this read-only public
//      dashboard endpoint — RailFlow has no login flow and is
//      meant to be a public OCC telemetry display. Write/
//      ingestion endpoints (POST /api/cctv, /api/atvm, /api/uts,
//      /api/gps, /api/gtfs) still require auth, unchanged.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Station } from "@/models/Station";
import { mapStationToFrontend } from "@/lib/frontendContract";
import { buildEnrichmentMap } from "@/lib/stationEnrichment";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const line = req.nextUrl.searchParams.get("line");
    const search = req.nextUrl.searchParams.get("search");
    const minOccupancy = req.nextUrl.searchParams.get("minOccupancy");
    const limit = req.nextUrl.searchParams.get("limit");

    const dbFilter: Record<string, unknown> = {};
    if (line && line.toUpperCase() !== "ALL") {
      // Frontend lines are uppercase (WESTERN); DB lines are
      // capitalized (Western) — case-insensitive match on name.
      dbFilter.line = new RegExp(`^${line}$`, "i");
    }
    if (search) {
      dbFilter.name = new RegExp(search, "i");
    }

    const stations = await Station.find(dbFilter).sort({ name: 1 });
    const getEnrichment = await buildEnrichmentMap();

    let mapped = stations.map((s) => mapStationToFrontend(s, getEnrichment(s._id.toString())));

    if (minOccupancy && !Number.isNaN(Number(minOccupancy))) {
      const min = Number(minOccupancy);
      mapped = mapped.filter((s) => s.currentOccupancy >= min);
    }

    const total = mapped.length;
    if (limit && !Number.isNaN(Number(limit))) {
      mapped = mapped.slice(0, Number(limit));
    }

    return NextResponse.json({ success: true, count: mapped.length, total, data: mapped });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch stations.", message: (error as Error).message },
      { status: 500 }
    );
  }
}
