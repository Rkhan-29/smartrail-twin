// ============================================================
// lib/recommendationsEngine.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Builds the list of "operational recommendation" cards the
// RailFlow dashboard shows (e.g. "deploy crowd marshals at
// Dadar"). Derives them from real, live crowd data (CrowdLog +
// the digital twin) — every station currently at HIGH or
// CRITICAL density gets a recommendation, ranked by severity.
// This is the same underlying signal the original
// app/api/recommendations/route.ts used (per-station "least
// crowded train" tip); this version additionally covers the
// network-wide, no-stationId-required shape RailFlow's frontend
// expects (see lib/frontendContract.ts header comment for why an
// adapter layer exists at all).
// ============================================================

import { Station } from "@/models/Station";
import { CrowdLog } from "@/models/CrowdLog";
import { mapLine } from "@/lib/frontendContract";

export interface FrontendRecommendation {
  id: string;
  stationId: string;
  stationName: string;
  platformNumber?: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  category: string;
  title: string;
  actionRequired: string;
  rationale: string;
  estimatedCrowdRelief: string;
  generatedAt: string;
}

async function latestCrowdPerStation() {
  return CrowdLog.aggregate([
    { $sort: { calculatedAt: -1 } },
    { $group: { _id: "$station", doc: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$doc" } },
  ]);
}

export async function buildAllRecommendations(): Promise<FrontendRecommendation[]> {
  const [latest, stations] = await Promise.all([latestCrowdPerStation(), Station.find()]);
  const stationById = new Map(stations.map((s) => [s._id.toString(), s]));

  const recs: FrontendRecommendation[] = [];

  for (const log of latest) {
    if (log.level !== "high" && log.level !== "critical") continue;
    const station = stationById.get(log.station.toString());
    if (!station) continue;

    const priority: FrontendRecommendation["priority"] = log.level === "critical" ? "HIGH" : "MEDIUM";
    const line = mapLine(station.line);

    recs.push({
      id: `REC-${log._id.toString().slice(-6).toUpperCase()}`,
      stationId: station._id.toString(),
      stationName: station.name,
      priority,
      category: "MARSHALLING",
      title:
        log.level === "critical"
          ? `Deploy crowd marshals at ${station.name} (${line})`
          : `Monitor rising density at ${station.name} (${line})`,
      actionRequired:
        log.level === "critical"
          ? "Station Master to reposition RPF personnel to regulate platform access and interchange transit."
          : "Station Master to keep an eye on ticketing velocity and be ready to open additional gates.",
      rationale: `Live crowd reading is ${log.densityPercent}% of rated capacity (${log.level.toUpperCase()}), estimated headcount ${log.estimatedCount}.`,
      estimatedCrowdRelief: log.level === "critical" ? "-15% to -25% within 10 minutes if actioned" : "Prevents escalation to critical",
      generatedAt: new Date(log.calculatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    });
  }

  // Highest priority first
  return recs.sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "HIGH" ? -1 : 1));
}

export async function buildRecommendationsForStation(stationId: string): Promise<FrontendRecommendation[]> {
  const all = await buildAllRecommendations();
  return all.filter((r) => r.stationId === stationId);
}
