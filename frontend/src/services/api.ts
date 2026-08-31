import {
  Station,
  Train,
  Alert,
  NetworkOverviewStats,
  CrowdPrediction,
  PlatformInfo
} from '../types';
import {
  MOCK_STATIONS,
  MOCK_ALERTS,
  MOCK_NETWORK_STATS,
  MOCK_DADAR_PREDICTION,
  MOCK_ACCURACY_EVALUATIONS,
  MOCK_MODEL_STATS,
  MOCK_DATA_SIGNALS_INFO,
  getStationById
} from '../data/mockData';

// Dynamic API Base URL resolution supporting import.meta.env.VITE_API_URL with /api fallback
const getBaseUrl = (): string => {
  const customUrl = import.meta.env.VITE_API_URL;
  if (typeof customUrl === 'string' && customUrl.trim() !== '') {
    return customUrl.trim().replace(/\/+$/, '');
  }
  return '/api';
};

/**
 * Safely constructs the target API URL by resolving the base URL with the endpoint path,
 * correctly avoiding duplicate slashes and duplicate /api segments.
 */
function resolveApiUrl(endpoint: string): string {
  const base = getBaseUrl();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // If base already ends with '/api' and path starts with '/api/', normalize to avoid double '/api'
  if (base.endsWith('/api') && path.startsWith('/api/')) {
    return `${base}${path.slice(4)}`;
  }
  if (base.endsWith('/api') && path === '/api') {
    return base;
  }

  return `${base}${path}`;
}

/**
 * Standard fetch helper with JSON parsing, timeout, and robust error handling
 */
async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = resolveApiUrl(endpoint);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options?.headers || {})
      }
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  total?: number;
  error?: string;
  meta?: any;
}

export interface HeatmapStationPoint {
  id: string;
  name: string;
  marathiName?: string;
  line: string;
  lines: string[];
  latitude: number;
  longitude: number;
  currentOccupancy: number;
  predictedOccupancy: number;
  crowdStatus: string;
  heatWeight: number;
  forecastHeatWeight: number;
  surgeAlert: boolean;
  nextTrain: string;
  platform: number;
  destination: string;
}

export interface Predictions15mResponse {
  meta: {
    predictionWindowMinutes: number;
    modelRefreshInterval: string;
    accuracyRate: number;
    meanAbsoluteError: number;
    overpredictionRate: number;
    underpredictionRate: number;
  };
  keyStationsComparison: {
    id: string;
    name: string;
    line: string;
    currentOccupancy: number;
    predictedOccupancy: number;
    crowdStatus: string;
    shiftPercentage: number;
    isHighCrowd: boolean;
    isCritical: boolean;
    confidenceScore: number;
    nextTrain: string;
    platform: number;
  }[];
  sampleAccuracyEvaluations: any[];
  telemetrySignals: any[];
  primaryPrediction: CrowdPrediction;
}

export interface RecommendationItem {
  id: string;
  stationId: string;
  stationName: string;
  platformNumber?: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  actionRequired: string;
  rationale: string;
  estimatedCrowdRelief: string;
  generatedAt: string;
}

export interface AiAdvisoryResult {
  summary: string;
  keyInsights: string[];
  recommendedActions: string[];
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  source: 'CLAUDE_AI' | 'DETERMINISTIC_ENGINE';
  timestamp: string;
}

// -------------------------------------------------------------
// FRONTEND API CLIENT SERVICE
// -------------------------------------------------------------

export const ApiService = {
  /**
   * Health Check
   */
  async checkHealth(): Promise<{ status: string; service: string }> {
    try {
      return await fetchJson('/api/health');
    } catch {
      return { status: 'offline', service: 'RailFlow AI Client Fallback' };
    }
  },

  /**
   * Fetch All Stations with optional query params
   */
  async getStations(params?: {
    line?: string;
    search?: string;
    minOccupancy?: number;
    limit?: number;
  }): Promise<{ stations: Station[]; isFromBackend: boolean }> {
    try {
      const query = new URLSearchParams();
      if (params?.line && params.line !== 'ALL') query.append('line', params.line);
      if (params?.search) query.append('search', params.search);
      if (params?.minOccupancy) query.append('minOccupancy', String(params.minOccupancy));
      if (params?.limit) query.append('limit', String(params.limit));

      const res = await fetchJson<ApiResponse<Station[]>>(
        `/api/stations${query.toString() ? `?${query.toString()}` : ''}`
      );
      if (res && res.data && Array.isArray(res.data)) {
        return { stations: res.data, isFromBackend: true };
      }
      throw new Error('Invalid backend response format');
    } catch (error) {
      console.warn('API /api/stations unavailable, using fallback mock data:', error);
      let list = [...MOCK_STATIONS];
      if (params?.line && params.line !== 'ALL') {
        list = list.filter(s => s.line === params.line || s.lines.includes(params.line as any));
      }
      if (params?.search) {
        const q = params.search.toLowerCase();
        list = list.filter(
          s =>
            s.name.toLowerCase().includes(q) ||
            (s.marathiName && s.marathiName.includes(q)) ||
            s.line.toLowerCase().includes(q)
        );
      }
      return { stations: list, isFromBackend: false };
    }
  },

  /**
   * Fetch Single Station Details by ID
   */
  async getStationById(
    id: string
  ): Promise<{ station: Station; recommendations?: RecommendationItem[]; isFromBackend: boolean }> {
    try {
      const res = await fetchJson<ApiResponse<Station & { recommendations?: RecommendationItem[] }>>(
        `/api/stations/${id}`
      );
      if (res && res.data) {
        return {
          station: res.data,
          recommendations: res.data.recommendations,
          isFromBackend: true
        };
      }
      throw new Error('Station not found on backend');
    } catch (error) {
      console.warn(`API /api/stations/${id} fallback:`, error);
      const fallbackStation = getStationById(id);
      return { station: fallbackStation, isFromBackend: false };
    }
  },

  /**
   * Fetch Platforms Breakdown for a Station
   */
  async getStationPlatforms(
    id: string
  ): Promise<{ platforms: PlatformInfo[]; isFromBackend: boolean }> {
    try {
      const res = await fetchJson<ApiResponse<PlatformInfo[]>>(`/api/stations/${id}/platforms`);
      if (res && res.data && Array.isArray(res.data)) {
        return { platforms: res.data, isFromBackend: true };
      }
      throw new Error('Platforms not found on backend');
    } catch (error) {
      console.warn(`API /api/stations/${id}/platforms fallback:`, error);
      const station = getStationById(id);
      const fallbackPlatforms = station.platforms || [
        {
          platformNumber: 1,
          line: station.line,
          currentCrowd: station.crowdStatus,
          occupancyPercentage: station.currentOccupancy,
          nextTrainTime: station.nextTrain,
          nextTrainDestination: station.destination,
          isFastTrainOnly: true
        }
      ];
      return { platforms: fallbackPlatforms, isFromBackend: false };
    }
  },

  /**
   * Fetch Active Trains in Transit (GET /api/trains)
   */
  async getTrains(params?: {
    line?: string;
    search?: string;
    status?: string;
  }): Promise<{ trains: Train[]; isFromBackend: boolean }> {
    try {
      const query = new URLSearchParams();
      if (params?.line && params.line !== 'ALL') query.append('line', params.line);
      if (params?.search) query.append('search', params.search);
      if (params?.status) query.append('status', params.status);

      const res = await fetchJson<ApiResponse<Train[]>>(
        `/api/trains${query.toString() ? `?${query.toString()}` : ''}`
      );
      if (res && res.data && Array.isArray(res.data)) {
        return { trains: res.data, isFromBackend: true };
      }
      throw new Error('Invalid backend response format');
    } catch (error) {
      console.warn('API /api/trains unavailable:', error);
      return { trains: [], isFromBackend: false };
    }
  },

  /**
   * Fetch Single Train by ID (GET /api/trains/:id)
   */
  async getTrainById(id: string): Promise<{ train: Train | null; isFromBackend: boolean }> {
    try {
      const res = await fetchJson<ApiResponse<Train>>(`/api/trains/${id}`);
      if (res && res.data) {
        return { train: res.data, isFromBackend: true };
      }
      return { train: null, isFromBackend: false };
    } catch (error) {
      console.warn(`API /api/trains/${id} unavailable:`, error);
      return { train: null, isFromBackend: false };
    }
  },

  /**
   * Fetch Network Overview KPI Statistics
   */
  async getNetworkOverview(): Promise<{ stats: NetworkOverviewStats; isFromBackend: boolean }> {
    try {
      const res = await fetchJson<ApiResponse<NetworkOverviewStats>>('/api/network/overview');
      if (res && res.data) {
        return { stats: res.data, isFromBackend: true };
      }
      throw new Error('Network stats unavailable from backend');
    } catch (error) {
      console.warn('API /api/network/overview fallback:', error);
      return { stats: MOCK_NETWORK_STATS, isFromBackend: false };
    }
  },

  /**
   * Fetch Railway Network Heatmap Dataset
   */
  async getNetworkHeatmap(): Promise<{ points: HeatmapStationPoint[]; isFromBackend: boolean }> {
    try {
      const res = await fetchJson<ApiResponse<HeatmapStationPoint[]>>('/api/network/heatmap');
      if (res && res.data && Array.isArray(res.data)) {
        return { points: res.data, isFromBackend: true };
      }
      throw new Error('Heatmap dataset unavailable from backend');
    } catch (error) {
      console.warn('API /api/network/heatmap fallback:', error);
      const fallbackPoints: HeatmapStationPoint[] = MOCK_STATIONS.map(s => ({
        id: s.id,
        name: s.name,
        marathiName: s.marathiName,
        line: s.line,
        lines: s.lines,
        latitude: s.latitude,
        longitude: s.longitude,
        currentOccupancy: s.currentOccupancy,
        predictedOccupancy: s.predictedOccupancy,
        crowdStatus: s.crowdStatus,
        heatWeight: Math.round((s.currentOccupancy / 100) * 10) / 10,
        forecastHeatWeight: Math.round((s.predictedOccupancy / 100) * 10) / 10,
        surgeAlert: s.predictedOccupancy >= 80,
        nextTrain: s.nextTrain,
        platform: s.platform,
        destination: s.destination
      }));
      return { points: fallbackPoints, isFromBackend: false };
    }
  },

  /**
   * Fetch 15-Minute Predictions & Multi-Station Comparison
   */
  async get15mPredictions(): Promise<{
    predictionData: Predictions15mResponse;
    isFromBackend: boolean;
  }> {
    try {
      const res = await fetchJson<Predictions15mResponse>('/api/predictions/15m');
      if (res && res.keyStationsComparison) {
        return { predictionData: res, isFromBackend: true };
      }
      throw new Error('Predictions payload invalid');
    } catch (error) {
      console.warn('API /api/predictions/15m fallback:', error);
      const fallbackData: Predictions15mResponse = {
        meta: {
          predictionWindowMinutes: 15,
          modelRefreshInterval: '30s rolling',
          accuracyRate: MOCK_MODEL_STATS.overallAccuracy,
          meanAbsoluteError: MOCK_MODEL_STATS.meanAbsoluteError,
          overpredictionRate: MOCK_MODEL_STATS.overpredictionRate,
          underpredictionRate: MOCK_MODEL_STATS.underpredictionRate
        },
        keyStationsComparison: [
          { id: 'dadar', name: 'Dadar', line: 'WESTERN', currentOccupancy: 88, predictedOccupancy: 94, crowdStatus: 'CRITICAL', shiftPercentage: 6, isHighCrowd: true, isCritical: true, confidenceScore: 96, nextTrain: getStationById('dadar').nextTrain, platform: 1 },
          { id: 'andheri', name: 'Andheri', line: 'WESTERN', currentOccupancy: 84, predictedOccupancy: 89, crowdStatus: 'HIGH', shiftPercentage: 5, isHighCrowd: true, isCritical: true, confidenceScore: 94, nextTrain: getStationById('andheri').nextTrain, platform: 3 },
          { id: 'churchgate', name: 'Churchgate', line: 'WESTERN', currentOccupancy: 58, predictedOccupancy: 62, crowdStatus: 'MEDIUM', shiftPercentage: 4, isHighCrowd: false, isCritical: false, confidenceScore: 92, nextTrain: getStationById('churchgate').nextTrain, platform: 1 },
          { id: 'mumbai-central', name: 'Mumbai Central', line: 'WESTERN', currentOccupancy: 65, predictedOccupancy: 72, crowdStatus: 'HIGH', shiftPercentage: 7, isHighCrowd: true, isCritical: false, confidenceScore: 90, nextTrain: getStationById('mumbai-central').nextTrain, platform: 2 },
          { id: 'csmt', name: 'CSMT', line: 'CENTRAL', currentOccupancy: 76, predictedOccupancy: 83, crowdStatus: 'HIGH', shiftPercentage: 7, isHighCrowd: true, isCritical: false, confidenceScore: 95, nextTrain: getStationById('csmt').nextTrain, platform: 4 },
          { id: 'borivali', name: 'Borivali', line: 'WESTERN', currentOccupancy: 79, predictedOccupancy: 86, crowdStatus: 'HIGH', shiftPercentage: 7, isHighCrowd: true, isCritical: true, confidenceScore: 93, nextTrain: getStationById('borivali').nextTrain, platform: 2 },
          { id: 'kurla', name: 'Kurla', line: 'CENTRAL', currentOccupancy: 92, predictedOccupancy: 97, crowdStatus: 'CRITICAL', shiftPercentage: 5, isHighCrowd: true, isCritical: true, confidenceScore: 97, nextTrain: getStationById('kurla').nextTrain, platform: 7 },
          { id: 'thane', name: 'Thane', line: 'CENTRAL', currentOccupancy: 96, predictedOccupancy: 98, crowdStatus: 'CRITICAL', shiftPercentage: 2, isHighCrowd: true, isCritical: true, confidenceScore: 98, nextTrain: getStationById('thane').nextTrain, platform: 2 }
        ],
        sampleAccuracyEvaluations: MOCK_ACCURACY_EVALUATIONS,
        telemetrySignals: MOCK_DATA_SIGNALS_INFO,
        primaryPrediction: MOCK_DADAR_PREDICTION
      };
      return { predictionData: fallbackData, isFromBackend: false };
    }
  },

  /**
   * Fetch Single Station 15-Minute Prediction
   */
  async getStationPrediction(
    stationId: string
  ): Promise<{ prediction: CrowdPrediction; isFromBackend: boolean }> {
    try {
      const res = await fetchJson<ApiResponse<CrowdPrediction>>(`/api/predictions/${stationId}`);
      if (res && res.data) {
        return { prediction: res.data, isFromBackend: true };
      }
      throw new Error('Station prediction unavailable');
    } catch (error) {
      console.warn(`API /api/predictions/${stationId} fallback:`, error);
      const station = getStationById(stationId);
      const fallbackPrediction: CrowdPrediction = {
        stationId: station.id,
        stationName: station.name,
        line: station.line,
        timestamp: '08:42 PM',
        targetMinutes: 15,
        predictedCrowd: station.predictedOccupancy >= 85 ? 'CRITICAL' : station.predictedOccupancy >= 70 ? 'HIGH' : 'MEDIUM',
        predictedOccupancy: station.predictedOccupancy,
        confidenceScore: station.cctvSignalConfidence,
        trend: station.predictedOccupancy > station.currentOccupancy ? 'rising' : 'stable',
        contributingFactors: MOCK_DADAR_PREDICTION.contributingFactors
      };
      return { prediction: fallbackPrediction, isFromBackend: false };
    }
  },

  /**
   * Fetch Operational Recommendations
   */
  async getRecommendations(params?: {
    stationId?: string;
    priority?: string;
  }): Promise<{ recommendations: RecommendationItem[]; isFromBackend: boolean }> {
    try {
      const query = new URLSearchParams();
      if (params?.stationId) query.append('stationId', params.stationId);
      if (params?.priority) query.append('priority', params.priority);

      const res = await fetchJson<ApiResponse<RecommendationItem[]>>(
        `/api/recommendations${query.toString() ? `?${query.toString()}` : ''}`
      );
      if (res && res.data && Array.isArray(res.data)) {
        return { recommendations: res.data, isFromBackend: true };
      }
      throw new Error('Recommendations unavailable');
    } catch (error) {
      console.warn('API /api/recommendations fallback:', error);
      return {
        recommendations: [
          {
            id: 'REC-001',
            stationId: 'dadar',
            stationName: 'Dadar Interchange',
            platformNumber: 1,
            priority: 'HIGH',
            category: 'MARSHALLING',
            title: 'Deploy RPF Crowd Marshals at Western-Central Middle FOB',
            actionRequired: 'Station Master to reposition 4 Railway Protection Force personnel to regulate pedestrian interchange transit from PF 1 to PF 6.',
            rationale: 'FOB bottleneck optical flow exceeded 1.8 persons/sqm threshold with 89% predicted surge in 15 minutes.',
            estimatedCrowdRelief: '-22% localized staircase congestion within 8 minutes',
            generatedAt: '08:43 PM'
          }
        ],
        isFromBackend: false
      };
    }
  },

  /**
   * Fetch Live Operational Alerts
   */
  async getAlerts(params?: {
    severity?: string;
    resolved?: boolean;
  }): Promise<{ alerts: Alert[]; isFromBackend: boolean }> {
    try {
      const query = new URLSearchParams();
      if (params?.severity) query.append('severity', params.severity);
      if (params?.resolved !== undefined) query.append('resolved', String(params.resolved));

      const res = await fetchJson<ApiResponse<Alert[]>>(
        `/api/alerts${query.toString() ? `?${query.toString()}` : ''}`
      );
      if (res && res.data && Array.isArray(res.data)) {
        return { alerts: res.data, isFromBackend: true };
      }
      throw new Error('Alerts unavailable');
    } catch (error) {
      console.warn('API /api/alerts fallback:', error);
      return { alerts: MOCK_ALERTS, isFromBackend: false };
    }
  },

  /**
   * Acknowledge Alert (POST /api/alerts/:id/ack)
   */
  async acknowledgeAlert(id: string): Promise<boolean> {
    try {
      const res = await fetchJson<ApiResponse<Alert>>(`/api/alerts/${id}/ack`, {
        method: 'POST'
      });
      return res.success;
    } catch (error) {
      console.warn(`API /api/alerts/${id}/ack failed:`, error);
      return false;
    }
  },

  /**
   * AI Operational Advisory (POST /api/ai/advisory)
   */
  async getAiAdvisory(payload?: {
    stationId?: string;
    query?: string;
  }): Promise<{ advisory: AiAdvisoryResult | null; isFromBackend: boolean }> {
    try {
      const res = await fetchJson<ApiResponse<AiAdvisoryResult>>('/api/ai/advisory', {
        method: 'POST',
        body: JSON.stringify(payload || {})
      });
      if (res && res.data) {
        return { advisory: res.data, isFromBackend: true };
      }
      return { advisory: null, isFromBackend: false };
    } catch (error) {
      console.warn('API /api/ai/advisory unavailable:', error);
      return { advisory: null, isFromBackend: false };
    }
  }
};
