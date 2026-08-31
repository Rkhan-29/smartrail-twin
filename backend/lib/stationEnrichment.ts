// ============================================================
// lib/stationEnrichment.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Shared helper used by every frontend-facing station route
// (list + single station) to gather the recent signal data
// (CCTV confidence, ticketing velocity, next-train info) needed
// to fill in RailFlow's richer Station shape — in one batch of
// queries instead of repeating N+1 queries per station per route.
// Pulled out into its own module (rather than living inside a
// route.ts file) because Next.js App Router route files may only
// export HTTP method handlers.
// ============================================================

import { CctvEvent } from "@/models/CctvEvent";
import { AtvmLog } from "@/models/AtvmLog";
import { UtsLog } from "@/models/UtsLog";
import { Train } from "@/models/Train";
import { getAllStationStates } from "@/services/digitalTwin";
import type { StationEnrichment } from "@/lib/frontendContract";

const RECENT_WINDOW_MS = 5 * 60 * 1000;

export async function buildEnrichmentMap(): Promise<(stationId: string) => StationEnrichment> {
  const since = new Date(Date.now() - RECENT_WINDOW_MS);
  const [states, cctvEvents, atvmLogs, utsLogs, upcomingTrains] = await Promise.all([
    getAllStationStates(),
    CctvEvent.find({ capturedAt: { $gte: since } }).select("station confidence"),
    AtvmLog.find({ transactionAt: { $gte: since } }).select("station ticketsIssued"),
    UtsLog.find({ transactionAt: { $gte: since } }).select("station ticketsIssued"),
    Train.find({ status: "running" }).select("nextStation trainNumber"),
  ]);

  const stateByStation = new Map(states.map((s) => [s.stationId, s]));

  const cctvByStation = new Map<string, number[]>();
  for (const e of cctvEvents) {
    const key = e.station.toString();
    if (!cctvByStation.has(key)) cctvByStation.set(key, []);
    cctvByStation.get(key)!.push(e.confidence);
  }

  const ticketsByStation = new Map<string, number>();
  for (const t of [...atvmLogs, ...utsLogs]) {
    const key = t.station.toString();
    ticketsByStation.set(key, (ticketsByStation.get(key) ?? 0) + t.ticketsIssued);
  }
  const utsByStation = new Map<string, number>();
  for (const t of utsLogs) {
    const key = t.station.toString();
    utsByStation.set(key, (utsByStation.get(key) ?? 0) + 1);
  }

  const nextTrainByStation = new Map<string, { time: string; destination: string; platform: number }>();
  for (const t of upcomingTrains) {
    if (!t.nextStation) continue;
    const key = t.nextStation.toString();
    if (!nextTrainByStation.has(key)) {
      nextTrainByStation.set(key, {
        time: new Date(Date.now() + 5 * 60 * 1000).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        destination: t.trainNumber,
        platform: 1,
      });
    }
  }

  return (stationId: string): StationEnrichment => {
    const cctvSamples = cctvByStation.get(stationId);
    return {
      state: stateByStation.get(stationId) ?? null,
      avgCctvConfidence: cctvSamples?.length
        ? cctvSamples.reduce((a, b) => a + b, 0) / cctvSamples.length
        : undefined,
      ticketingVelocity: (ticketsByStation.get(stationId) ?? 0) / (RECENT_WINDOW_MS / 60000),
      utsSessionCount: utsByStation.get(stationId) ?? 0,
      nextTrain: nextTrainByStation.get(stationId) ?? null,
    };
  };
}
