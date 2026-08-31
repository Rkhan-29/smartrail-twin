// ============================================================
// app/api/ai/advisory/route.ts
// ------------------------------------------------------------
// NEW ROUTE. Handles POST /api/ai/advisory. GEMINI AUDIT: this
// is the backend home for the advisory/chat-style feature that
// used to live in RailFlow's own bundled Express server
// (src/server/app.ts + geminiService.ts), calling Google Gemini.
// That usage has been removed and replaced with Anthropic Claude
// — see services/advisoryEngine.ts for full rationale and the
// deterministic fallback used when ANTHROPIC_API_KEY isn't set.
// Public (no auth) — read-only dashboard endpoint.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Station } from "@/models/Station";
import { CrowdLog } from "@/models/CrowdLog";
import { generateOperationalAdvisory, type StationSnapshot } from "@/services/advisoryEngine";
import { buildAllRecommendations } from "@/lib/recommendationsEngine";
import { mapLine } from "@/lib/frontendContract";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const { stationId, query } = (await req.json().catch(() => ({}))) as {
      stationId?: string;
      query?: string;
    };

    const [stations, latestLogs, recommendations] = await Promise.all([
      Station.find(),
      CrowdLog.aggregate([
        { $sort: { calculatedAt: -1 } },
        { $group: { _id: "$station", doc: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$doc" } },
      ]),
      buildAllRecommendations(),
    ]);

    const logByStation = new Map(latestLogs.map((l) => [l.station.toString(), l]));

    const snapshots: StationSnapshot[] = stations.map((s) => {
      const log = logByStation.get(s._id.toString());
      return {
        stationId: s._id.toString(),
        name: s.name,
        line: mapLine(s.line),
        occupancy: log?.estimatedCount ?? 0,
        capacity: s.capacity,
        densityPercent: log?.densityPercent ?? 0,
        level: log?.level ?? "low",
      };
    });

    const advisory = await generateOperationalAdvisory(
      snapshots,
      recommendations.map((r) => ({
        stationId: r.stationId,
        title: r.title,
        actionRequired: r.actionRequired,
        priority: r.priority,
      })),
      query,
      stationId
    );

    return NextResponse.json({ success: true, data: advisory });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to generate operational advisory.", message: (error as Error).message },
      { status: 500 }
    );
  }
}
