// ============================================================
// services/aiEngine.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// This is the ONE place in the whole backend that talks to the
// separate AI/ML engine (smartrail-ai-engine-v2, a FastAPI
// service). Every other file that wants an AI-powered
// prediction calls the functions in here — they never call the
// AI engine directly.
//
// BUG FIX (AI integration issue): this file used to send a
// hand-invented payload shape (camelCase fields like `stationId`,
// `cctvCount`, `speedKmph`...) that did NOT match the AI engine's
// actual Pydantic request schemas (app/schemas.py), which expect
// snake_case fields like `station_id`, `people_count`,
// `current_speed_kmh`, etc., several of which are REQUIRED with
// no default. Sending the old payload caused FastAPI to reject
// every request with a 422 Unprocessable Entity, so `res.ok` was
// always false and the AI engine was silently never actually
// used — every prediction silently fell back to the plain-math
// estimate, 100% of the time, even when the AI engine was
// healthy and running. The response parsing was also wrong: the
// real engine returns fields like `predicted15MinPercentage` and
// `risk.level` (crowd) / `predictedMinutes` (eta), not
// `densityPercent` / `etaMinutes`.
//
// Both the outgoing payload and the incoming response are fixed
// below to match app/schemas.py and app/runtime.py exactly.
// ============================================================

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://localhost:8000";

// --- What WE send (matches app/schemas.py Common + CrowdRequest / ETARequest) ---

export interface CrowdPredictionRequest {
  stationId: string;
  cctvCount: number;
  ticketCount: number;
  capacity: number;
  timestamp: string;
  /** Optional — used to compute recent_crowd_growth_rate when known */
  previousDensityPercent?: number;
}

export interface EtaPredictionRequest {
  trainId: string;
  targetStationId: string;
  speedKmph: number;
  distanceToNextStationM: number;
  timestamp: string;
  /** Optional — original scheduled ETA, if known, for a delay estimate */
  scheduledEtaMinutes?: number;
}

// --- What WE use internally after normalizing the AI engine's response ---

export interface CrowdPredictionResponse {
  estimatedCount: number;
  densityPercent: number;
  level: "low" | "moderate" | "high" | "critical";
}

export interface EtaPredictionResponse {
  etaMinutes: number;
  confidence: number;
}

/**
 * getAiCrowdPrediction
 * Human explanation: Sends the raw CCTV + ticket numbers to the
 * AI engine (in the field names/shape it actually expects) and
 * asks "given all this, what's your best estimate of the real
 * crowd level 15 minutes from now?" Returns null (instead of
 * throwing) if the AI engine isn't reachable, isn't trained yet,
 * or rejects the request, so the caller can gracefully fall back
 * to the simpler built-in calculation in analyticsEngine.ts.
 */
export async function getAiCrowdPrediction(
  payload: CrowdPredictionRequest
): Promise<CrowdPredictionResponse | null> {
  try {
    const currentCrowdPercentage =
      payload.capacity > 0 ? Math.min(200, (payload.cctvCount / payload.capacity) * 100) : 0;
    const growthRate =
      payload.previousDensityPercent !== undefined
        ? currentCrowdPercentage - payload.previousDensityPercent
        : 0;

    const body = {
      timestamp: payload.timestamp,
      station_id: payload.stationId,
      people_count: payload.cctvCount,
      crowd_density: currentCrowdPercentage,
      entry_count: payload.ticketCount,
      exit_count: 0,
      atvm_count: payload.ticketCount,
      uts_count: 0,
      station_capacity: payload.capacity,
      current_crowd_percentage: currentCrowdPercentage,
      recent_crowd_growth_rate: growthRate,
    };

    const res = await fetch(`${AI_ENGINE_URL}/predict/crowd`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Don't let a slow/unreachable AI engine hang the whole request
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      predicted15MinPercentage: number;
      risk: { level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL"; probability: number };
    };

    const densityPercent = Math.round(data.predicted15MinPercentage);
    const estimatedCount = Math.round((densityPercent / 100) * payload.capacity);
    const level = data.risk.level.toLowerCase() as CrowdPredictionResponse["level"];

    return { estimatedCount, densityPercent, level };
  } catch {
    // AI engine not running yet, model not trained yet, or network
    // error — caller falls back to the deterministic estimate.
    return null;
  }
}

/**
 * getAiEtaPrediction
 * Human explanation: Sends the train's live GPS speed/distance to
 * the AI engine (in the field names/shape it actually expects)
 * and asks for a smarter ETA prediction. Returns null if the AI
 * engine isn't reachable/trained, so the caller can fall back to
 * the simple distance-over-speed math.
 */
export async function getAiEtaPrediction(
  payload: EtaPredictionRequest
): Promise<EtaPredictionResponse | null> {
  try {
    const distanceKm = payload.distanceToNextStationM / 1000;
    const scheduledEtaMinutes =
      payload.scheduledEtaMinutes ?? Math.max(1, Math.round((distanceKm / Math.max(payload.speedKmph, 1)) * 60));

    const body = {
      timestamp: payload.timestamp,
      station_id: payload.targetStationId,
      train_id: payload.trainId,
      current_speed_kmh: payload.speedKmph,
      distance_to_next_km: distanceKm,
      distance_to_destination_km: distanceKm,
      scheduled_eta_minutes: scheduledEtaMinutes,
    };

    const res = await fetch(`${AI_ENGINE_URL}/predict/eta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      predictedMinutes: number;
      predictedDelay: number;
      scheduledMinutes: number;
    };

    // The AI engine doesn't return an explicit confidence score, so
    // we derive one from how large the predicted delay is relative
    // to the scheduled time — a small predicted delay implies the
    // model is confident in the original schedule; a large one means
    // more uncertainty.
    const delayRatio = Math.abs(data.predictedDelay) / Math.max(data.scheduledMinutes, 1);
    const confidence = Math.max(0.4, Math.min(0.95, 1 - delayRatio));

    return { etaMinutes: Math.max(0, Math.round(data.predictedMinutes)), confidence };
  } catch {
    return null;
  }
}
