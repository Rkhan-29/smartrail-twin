// ============================================================
// services/analyticsEngine.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// This is the "brain" that turns raw, messy data (CCTV counts,
// ticket sales, GPS pings) into the clean numbers the frontend
// displays: crowd density per station, and ETA per train.
//
// For each calculation, it FIRST tries asking the AI engine
// (services/aiEngine.ts) for a smarter prediction. If the AI
// engine isn't available yet (not built, not running, or times
// out), it automatically falls back to a solid, transparent
// math-based estimate — so the backend stays fully functional
// on its own the whole time the AI engine is being developed.
// ============================================================

import { CctvEvent } from "@/models/CctvEvent";
import { AtvmLog } from "@/models/AtvmLog";
import { UtsLog } from "@/models/UtsLog";
import { GpsLog } from "@/models/GpsLog";
import { CrowdLog, type ICrowdLog } from "@/models/CrowdLog";
import { EtaLog, type IEtaLog } from "@/models/EtaLog";
import { Station } from "@/models/Station";
import { Train } from "@/models/Train";
import { getAiCrowdPrediction, getAiEtaPrediction } from "./aiEngine";
import { updateStationState } from "./digitalTwin";

// Only look at data from the last N minutes when calculating "right
// now" stats. Older readings are considered stale and ignored.
const RECENT_WINDOW_MINUTES = 5;

/**
 * recalculateCrowdForStation
 * Human explanation: For one station, gathers recent CCTV
 * headcounts and ticket sales, tries to get the AI engine's
 * opinion on what that means for real crowd levels, and — if the
 * AI engine isn't available — calculates a sensible estimate
 * itself. Either way, saves the result as a new CrowdLog entry
 * and returns it.
 */
export async function recalculateCrowdForStation(stationId: string): Promise<ICrowdLog | null> {
  const since = new Date(Date.now() - RECENT_WINDOW_MINUTES * 60 * 1000);

  const station = await Station.findById(stationId);
  if (!station) return null;

  // Sum up the most recent CCTV people-counts for this station
  const cctvEvents = await CctvEvent.find({ station: stationId, capturedAt: { $gte: since } });
  const cctvCount = cctvEvents.reduce((sum, e) => sum + e.peopleCount, 0);

  // Sum up recent ticket sales (both ATVM machines and UTS app/counter)
  const atvmLogs = await AtvmLog.find({ station: stationId, transactionAt: { $gte: since } });
  const utsLogs = await UtsLog.find({ station: stationId, transactionAt: { $gte: since } });
  const ticketCount =
    atvmLogs.reduce((sum, t) => sum + t.ticketsIssued, 0) +
    utsLogs.reduce((sum, t) => sum + t.ticketsIssued, 0);

  // Step 1: try the AI engine first
  const aiResult = await getAiCrowdPrediction({
    stationId,
    cctvCount,
    ticketCount,
    capacity: station.capacity,
    timestamp: new Date().toISOString(),
  });

  let estimatedCount: number;
  let densityPercent: number;
  let level: ICrowdLog["level"];
  let aiAssisted = false;

  if (aiResult) {
    // AI engine responded — trust its numbers
    estimatedCount = aiResult.estimatedCount;
    densityPercent = aiResult.densityPercent;
    level = aiResult.level;
    aiAssisted = true;
  } else {
    // Step 2: fallback — simple, transparent blending rule.
    // CCTV headcount is the primary signal (people physically present),
    // ticket sales are added at a lower weight since ticket buyers
    // haven't necessarily entered the platform yet.
    estimatedCount = Math.round(cctvCount + ticketCount * 0.5);
    densityPercent = Math.round((estimatedCount / station.capacity) * 100);

    level = "low";
    if (densityPercent >= 100) level = "critical";
    else if (densityPercent >= 75) level = "high";
    else if (densityPercent >= 40) level = "moderate";
  }

  const crowdLog = await CrowdLog.create({
    station: stationId,
    estimatedCount,
    densityPercent,
    level,
    sourceBreakdown: { cctvCount, ticketCount },
    aiAssisted,
  });

  // Keep the digital twin's live station state (occupancy/inflow/outflow)
  // in sync with every new crowd calculation — this is what powers the
  // /api/heatmap endpoint and any other "current state" reads.
  await updateStationState(stationId, estimatedCount);

  return crowdLog;
}

/**
 * recalculateEtaForTrain
 * Human explanation: For one train, grabs its most recent GPS
 * ping, tries to get the AI engine's smarter ETA prediction, and
 * — if unavailable — calculates a simple distance-over-speed
 * estimate itself. Saves the result as a new EtaLog entry.
 */
export async function recalculateEtaForTrain(trainId: string): Promise<IEtaLog | null> {
  const train = await Train.findById(trainId);
  if (!train || !train.nextStation) return null;

  const latestPing = await GpsLog.findOne({ train: trainId }).sort({ recordedAt: -1 });
  if (!latestPing) return null;

  // Guard against divide-by-zero / stationary trains: assume a slow
  // crawl speed rather than pretending the ETA is "infinite"
  const speed = latestPing.speedKmph > 2 ? latestPing.speedKmph : 15;
  // distanceToNextStationM comes from the GPS device if available;
  // fall back to a generic short-hop distance estimate otherwise.
  const distanceMeters = latestPing.distanceToNextStationM ?? 1500;

  // Step 1: try the AI engine first
  const aiResult = await getAiEtaPrediction({
    trainId,
    targetStationId: train.nextStation.toString(),
    speedKmph: speed,
    distanceToNextStationM: distanceMeters,
    timestamp: new Date().toISOString(),
  });

  let etaMinutes: number;
  let confidence: number;
  let aiAssisted = false;

  if (aiResult) {
    etaMinutes = aiResult.etaMinutes;
    confidence = aiResult.confidence;
    aiAssisted = true;
  } else {
    // Step 2: fallback — simple distance ÷ speed math
    const speedMetersPerMin = (speed * 1000) / 60;
    etaMinutes = Math.max(0, Math.round(distanceMeters / speedMetersPerMin));

    // Confidence drops if the GPS ping we're using is old
    const pingAgeSeconds = (Date.now() - latestPing.recordedAt.getTime()) / 1000;
    confidence = pingAgeSeconds > 60 ? 0.5 : 0.9;
  }

  const predictedArrival = new Date(Date.now() + etaMinutes * 60 * 1000);

  const etaLog = await EtaLog.create({
    train: trainId,
    targetStation: train.nextStation,
    etaMinutes,
    predictedArrival,
    confidence,
    aiAssisted,
  });

  return etaLog;
}

export { RECENT_WINDOW_MINUTES };
