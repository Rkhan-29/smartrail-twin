// ============================================================
// lib/alertsEngine.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// RailFlow's frontend expects a REST "Alert" resource
// (GET /api/alerts, POST /api/alerts/:id/ack), but this backend
// doesn't store alerts as their own collection — an alert is
// really "a station whose latest crowd reading is high/critical"
// (see CrowdLog). This file computes that list on the fly from
// live crowd data, and layers in persisted acknowledgements
// (models/AlertAck.ts) so an operator dismissing an alert sticks
// across requests/restarts, without needing a full alert-writing
// pipeline that doesn't otherwise exist in this backend.
// ============================================================

import { Station } from "@/models/Station";
import { CrowdLog } from "@/models/CrowdLog";
import { AlertAck } from "@/models/AlertAck";
import { mapLine } from "@/lib/frontendContract";

export interface FrontendAlert {
  id: string;
  stationId: string;
  stationName: string;
  line: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  actionRecommended?: string;
}

export async function buildAlertsList(): Promise<FrontendAlert[]> {
  const [latest, stations, acks] = await Promise.all([
    CrowdLog.aggregate([
      { $sort: { calculatedAt: -1 } },
      { $group: { _id: "$station", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } },
    ]),
    Station.find(),
    AlertAck.find(),
  ]);

  const stationById = new Map(stations.map((s) => [s._id.toString(), s]));
  const ackedIds = new Set(acks.map((a) => a.crowdLog.toString()));

  const alerts: FrontendAlert[] = [];
  for (const log of latest) {
    if (log.level !== "high" && log.level !== "critical") continue;
    const station = stationById.get(log.station.toString());
    if (!station) continue;

    const severity: FrontendAlert["severity"] = log.level === "critical" ? "critical" : "warning";

    alerts.push({
      id: log._id.toString(),
      stationId: station._id.toString(),
      stationName: station.name,
      line: mapLine(station.line),
      severity,
      title: log.level === "critical" ? `${station.name} at critical capacity` : `${station.name} approaching high density`,
      description: `Live occupancy is ${log.densityPercent}% of rated capacity (est. ${log.estimatedCount} people).`,
      timestamp: new Date(log.calculatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      resolved: ackedIds.has(log._id.toString()),
      actionRecommended:
        log.level === "critical"
          ? "Deploy additional RPF personnel and consider temporary entry restriction."
          : "Monitor closely and prepare mitigation measures.",
    });
  }

  return alerts;
}

export async function acknowledgeAlert(alertId: string): Promise<FrontendAlert | null> {
  const alerts = await buildAlertsList();
  const alert = alerts.find((a) => a.id === alertId);
  if (!alert) return null;

  await AlertAck.findOneAndUpdate(
    { crowdLog: alertId },
    { crowdLog: alertId, acknowledgedAt: new Date() },
    { upsert: true }
  );

  return { ...alert, resolved: true };
}
