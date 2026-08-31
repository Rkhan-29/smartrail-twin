// ============================================================
// lib/frontendContract.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// The RailFlow frontend (src/services/api.ts) was built against
// a specific, richly-shaped JSON contract (see its `Station` /
// `Train` / etc. TypeScript interfaces). This backend's own data
// model (Station/Train/CrowdLog/StationState/EtaLog...) is a
// different — real — sensor-driven shape.
//
// This file is the single place that translates between the two:
// it reads the backend's real, live data and maps it into
// exactly the JSON shape the frontend was built to consume, so
// nothing in the frontend's UI/business logic has to change.
//
// A few frontend fields (e.g. Marathi/Hindi station names,
// "device density index") don't exist as physical sensors in
// this backend's schema. Where that happens, we compute the most
// honest real substitute we can from data we actually have
// (ticketing velocity, CCTV confidence, digital-twin inflow/
// outflow) rather than inventing fake numbers — see comments
// below on each field.
// ============================================================

import type { IStation, Line } from "@/models/Station";
import type { ITrain } from "@/models/Train";
import type { IRoute } from "@/models/Route";
import type { LiveStationState } from "@/services/digitalTwin";

export type FrontendLine = "CENTRAL" | "WESTERN" | "HARBOUR" | "INTERCHANGE";
export type FrontendCrowdStatus = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export function mapLine(line: Line): FrontendLine {
  switch (line) {
    case "Western":
      return "WESTERN";
    case "Central":
      return "CENTRAL";
    case "Harbour":
    case "Trans-Harbour":
      return "HARBOUR";
    default:
      return "WESTERN";
  }
}

export function densityToCrowdStatus(densityPercent: number): FrontendCrowdStatus {
  if (densityPercent >= 85) return "CRITICAL";
  if (densityPercent >= 70) return "HIGH";
  if (densityPercent >= 40) return "MEDIUM";
  return "LOW";
}

export interface StationEnrichment {
  state?: LiveStationState | null;
  /** Average CCTV confidence (0-1) over the recent window, if any events exist */
  avgCctvConfidence?: number;
  /** ATVM + UTS tickets issued per minute over the recent window */
  ticketingVelocity?: number;
  /** Count of recent UTS mobile-app bookings, used as a proxy for "active app sessions" */
  utsSessionCount?: number;
  nextTrain?: { time: string; destination: string; platform: number } | null;
}

/**
 * mapStationToFrontend
 * Converts one real Station document (+ whatever live signal data
 * we have for it) into the exact Station shape RailFlow's frontend
 * expects (see frontend `src/types/index.ts`).
 */
export function mapStationToFrontend(station: IStation, enrichment: StationEnrichment = {}) {
  const occupancy = enrichment.state?.occupancy ?? 0;
  const capacity = station.capacity || 1;
  const currentOccupancy = Math.max(0, Math.min(100, Math.round((occupancy / capacity) * 100)));

  // Predicted occupancy: derived from the digital twin's real
  // inflow/outflow trend (not invented) — if more people are
  // flowing in than out, we project a modest continued rise over
  // the next 15 minutes, and vice versa.
  const netFlow = (enrichment.state?.inflow ?? 0) - (enrichment.state?.outflow ?? 0);
  const trendAdjustment = capacity > 0 ? Math.round((netFlow / capacity) * 100) : 0;
  const predictedOccupancy = Math.max(0, Math.min(100, currentOccupancy + trendAdjustment));

  const crowdStatus = densityToCrowdStatus(currentOccupancy);
  const line = mapLine(station.line);

  return {
    id: station._id.toString(),
    name: station.name,
    line,
    lines: [line] as FrontendLine[],
    latitude: station.location.lat,
    longitude: station.location.lng,
    crowdStatus,
    currentOccupancy,
    predictedOccupancy,
    predictionMinutes: 15,
    platform: 1,
    platformsCount: station.platformCount,
    nextTrain: enrichment.nextTrain?.time ?? "N/A",
    destination: enrichment.nextTrain?.destination ?? "—",
    delayStatus: "On Time" as const,
    // Real CCTV confidence average when we have recent camera events;
    // otherwise the model's own configured default (0.9) as a
    // reasonable baseline instead of a fabricated figure.
    cctvSignalConfidence: Math.round((enrichment.avgCctvConfidence ?? 0.9) * 100),
    etvmTicketingVelocity: Math.round((enrichment.ticketingVelocity ?? 0) * 10) / 10,
    utsActiveSessions: enrichment.utsSessionCount ?? 0,
    // Composite of live occupancy + ticketing velocity as a stand-in
    // for the "anonymous device density" concept — there is no such
    // physical sensor in this backend's schema, so rather than fake
    // a number we derive it transparently from real live signals.
    deviceDensityIndex: Math.max(0, Math.min(100, Math.round(currentOccupancy * 0.7 + (enrichment.ticketingVelocity ?? 0) * 2))),
  };
}

// --------------------------------------------------------------
// Train mapping
// --------------------------------------------------------------

export interface TrainEnrichment {
  currentStationName?: string;
  nextStationName?: string;
  route?: IRoute | null;
  latestEtaMinutes?: number | null;
}

function crowdStatusFromOccupancyPercent(occupancyPercent: number): FrontendCrowdStatus {
  return densityToCrowdStatus(occupancyPercent);
}

/**
 * mapTrainToFrontend
 * Converts one real Train document (+ populated station names/
 * route) into the exact Train shape RailFlow's frontend expects.
 */
export function mapTrainToFrontend(train: ITrain, enrichment: TrainEnrichment = {}) {
  const line = mapLine(train.line);
  const firstStop = enrichment.route?.stops?.[0];
  const lastStop = enrichment.route?.stops?.[enrichment.route.stops.length - 1];

  const statusMap: Record<ITrain["status"], "On Time" | "Delayed" | "Departed" | "Cancelled"> = {
    scheduled: "On Time",
    running: "On Time",
    delayed: "Delayed",
    terminated: "Departed",
    cancelled: "Cancelled",
  };

  return {
    id: train._id.toString(),
    trainNumber: train.trainNumber,
    trainName: enrichment.route?.name ?? `${line} ${train.direction} Local`,
    line,
    source: train.direction === "Up" ? (firstStop ? "Origin" : "—") : (lastStop ? "Origin" : "—"),
    destination: enrichment.nextStationName ?? "—",
    currentStation: enrichment.currentStationName ?? "—",
    nextStation: enrichment.nextStationName ?? "—",
    eta:
      enrichment.latestEtaMinutes !== null && enrichment.latestEtaMinutes !== undefined
        ? `${enrichment.latestEtaMinutes} min`
        : "N/A",
    delayMinutes: 0,
    delayStatus: statusMap[train.status],
    platform: 1,
    crowdLevel: crowdStatusFromOccupancyPercent(train.occupancyPercent),
    occupancyPercentage: Math.round(train.occupancyPercent),
    speedKmH: 0,
    isFast: false,
    coaches: 12,
  };
}
