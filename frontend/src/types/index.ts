export type RailwayLine = 'CENTRAL' | 'WESTERN' | 'HARBOUR' | 'INTERCHANGE';

export type CrowdStatus = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DelayStatus = 'On Time' | 'Delayed' | 'Departed' | 'Cancelled';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type UserRole = 'passenger' | 'control_room';

export interface PlatformInfo {
  platformNumber: number;
  line: RailwayLine;
  currentCrowd: CrowdStatus;
  occupancyPercentage: number;
  nextTrainTime: string;
  nextTrainDestination: string;
  isFastTrainOnly?: boolean;
}

export interface Station {
  id: string;
  name: string;
  hindiName?: string;
  marathiName?: string;
  line: RailwayLine;
  lines: RailwayLine[];
  latitude: number;
  longitude: number;
  crowdStatus: CrowdStatus;
  currentOccupancy: number; // percentage (0 - 100)
  predictedOccupancy: number; // percentage (0 - 100)
  predictionMinutes: number; // e.g. 15 mins
  platform: number;
  platformsCount: number;
  platforms?: PlatformInfo[];
  nextTrain: string; // e.g. "08:42 PM"
  destination: string;
  delayStatus: DelayStatus;
  delayMinutes?: number;
  isInterchange?: boolean;
  interchangeLines?: RailwayLine[];
  
  // Multi-modal signal metrics (conceptual/mock)
  cctvSignalConfidence: number; // e.g. 94%
  etvmTicketingVelocity: number; // tickets/min
  utsActiveSessions: number; // active digital app sessions
  deviceDensityIndex: number; // experimental anonymous signal index (0-100)
  
  // Historical / prediction trend (next 6 hours hourly)
  hourlyTrend?: {
    time: string;
    occupancy: number;
    predicted: number;
    crowdLevel: CrowdStatus;
  }[];
}

export interface Train {
  id: string;
  trainNumber: string;
  trainName: string;
  line: RailwayLine;
  source: string;
  destination: string;
  currentStation: string;
  nextStation: string;
  eta: string;
  delayMinutes: number;
  delayStatus: DelayStatus;
  platform: number;
  crowdLevel: CrowdStatus;
  occupancyPercentage: number;
  speedKmH: number;
  isFast: boolean;
  coaches: number; // 12 or 15 car
  acLocal?: boolean;
}

export interface CrowdPrediction {
  stationId: string;
  stationName: string;
  line: RailwayLine;
  timestamp: string;
  targetMinutes: number;
  predictedCrowd: CrowdStatus;
  predictedOccupancy: number;
  confidenceScore: number;
  trend: 'rising' | 'falling' | 'stable';
  contributingFactors: {
    factor: string;
    impact: 'low' | 'medium' | 'high';
    description: string;
  }[];
}

export interface Alert {
  id: string;
  stationId: string;
  stationName: string;
  line: RailwayLine;
  severity: AlertSeverity;
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  actionRecommended?: string;
}

export interface NetworkOverviewStats {
  totalStationsMonitored: number;
  activeTrains: number;
  averageOccupancy: number;
  criticalStationsCount: number;
  highCrowdStationsCount: number;
  moderateStationsCount: number;
  normalStationsCount: number;
  systemHealth: 'Optimal' | 'Heavy Traffic' | 'Congestion Alert';
  lastSignalSync: string;
}
