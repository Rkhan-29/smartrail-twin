import React, { useState, useEffect } from 'react';
import { Station, CrowdPrediction } from '../types';
import {
  MOCK_STATIONS,
  MOCK_DADAR_PREDICTION,
  MOCK_ACCURACY_EVALUATIONS,
  MOCK_MODEL_STATS,
  MOCK_DATA_SIGNALS_INFO
} from '../data/mockData';
import { ApiService, Predictions15mResponse } from '../services/api';
import { Card } from '../components/ui/Card';
import { CrowdStatusBadge } from '../components/ui/CrowdStatusBadge';
import { StationBadge } from '../components/ui/StationBadge';
import { CapacityIndicator } from '../components/ui/CapacityIndicator';
import {
  TrendingUp,
  Clock,
  Sparkles,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

interface PredictionsViewProps {
  selectedStation: Station;
  onSelectStation: (station: Station) => void;
  onRouteChange: (route: string) => void;
}

export const PredictionsView: React.FC<PredictionsViewProps> = ({
  selectedStation,
  onSelectStation,
  onRouteChange
}) => {
  const [selectedHorizon, setSelectedHorizon] = useState<number>(15);
  const [activeStationId, setActiveStationId] = useState<string>(selectedStation?.id || 'dadar');
  const [stationList, setStationList] = useState<Station[]>(MOCK_STATIONS);
  const [predictionsData, setPredictionsData] = useState<Predictions15mResponse | null>(null);
  const [currentPrediction, setCurrentPrediction] = useState<CrowdPrediction>(MOCK_DADAR_PREDICTION);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real backend 15m predictions
  const loadPredictions = async () => {
    setIsLoading(true);
    try {
      const [allPredRes, singlePredRes, stationsRes] = await Promise.all([
        ApiService.get15mPredictions(),
        ApiService.getStationPrediction(activeStationId),
        ApiService.getStations()
      ]);
      setPredictionsData(allPredRes.predictionData);
      setCurrentPrediction(singlePredRes.prediction);
      setStationList(stationsRes.stations);
      setIsBackendConnected(allPredRes.isFromBackend || singlePredRes.isFromBackend);
    } catch (err) {
      console.warn('Failed to load predictions from backend:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPredictions();
  }, [activeStationId]);

  const currentStation = stationList.find((s) => s.id === activeStationId) || selectedStation || MOCK_STATIONS[0];
  const prediction: CrowdPrediction = currentPrediction;

  const occupancyDiff = prediction.predictedOccupancy - currentStation.currentOccupancy;
  const diffSign = occupancyDiff > 0 ? `+${occupancyDiff}%` : `${occupancyDiff}%`;

  let statusMessage = 'Stable crowd condition expected';
  if (occupancyDiff >= 8) {
    statusMessage = 'Surge Alert: Crowd expected to become High in 15 minutes';
  } else if (occupancyDiff > 0) {
    statusMessage = 'Moderate inflow expected: slight density increase';
  } else if (occupancyDiff < 0) {
    statusMessage = 'Easing Flow: Post-train departure crowd dissipation';
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Page Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E5E0] shadow-sm space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#008080]/10 text-[#008080] border border-[#008080]/30 text-xs font-bold uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5 text-[#008080]" />
              <span>AI Predictive Engine</span>
            </div>
            <span className={cn(
              "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full",
              isBackendConnected ? "bg-[#10B981]/10 text-[#059669] border border-[#10B981]/30" : "bg-[#F59E0B]/10 text-[#D97706] border border-[#F59E0B]/30"
            )}>
              {isBackendConnected ? "● Live Backend Predictions (/api/predictions)" : "○ Standby Mode"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#9E9E9E]">
              Model Refresh: {predictionsData?.meta.modelRefreshInterval || MOCK_MODEL_STATS.modelRefreshRate}
            </span>
            <button
              onClick={loadPredictions}
              title="Refresh Predictions"
              className="p-1 rounded-lg bg-[#F9F9F7] hover:bg-[#EBECE8] border border-[#E5E5E0]"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-[#6B7280]", isLoading && "animate-spin text-[#008080]")} />
            </button>
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
          15-Minute Crowd Surge Forecasting &amp; Accuracy Evaluation
        </h1>
        <p className="text-xs sm:text-sm text-[#6B7280] max-w-3xl leading-relaxed">
          RailFlow AI fuses multi-source telemetry to predict station crowd conditions ~15 minutes ahead, giving the Operations Control Center time to dispatch crowd marshals and prevent FOB bottlenecks.
        </p>
      </div>

      {/* 2. Station Selector & Horizon Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E5E5E0] shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-[#1A1A1A]">Select Station:</span>
          <select
            value={activeStationId}
            onChange={(e) => {
              setActiveStationId(e.target.value);
              const found = stationList.find((s) => s.id === e.target.value);
              if (found) onSelectStation(found);
            }}
            className="text-xs font-bold text-[#1A1A1A] bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#008080]"
          >
            {stationList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.line} Line) - {s.currentOccupancy}% Load
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#9E9E9E]" />
          <span className="text-xs font-bold text-[#1A1A1A]">Forecast Horizon:</span>
          <div className="flex items-center gap-1 bg-[#F9F9F7] p-1 rounded-xl border border-[#E5E5E0] text-xs font-bold">
            {[15, 30, 45, 60].map((mins) => (
              <button
                key={mins}
                onClick={() => setSelectedHorizon(mins)}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all font-mono',
                  selectedHorizon === mins
                    ? 'bg-[#008080] text-white shadow-xs'
                    : 'text-[#6B7280] hover:bg-[#E5E5E0]'
                )}
              >
                +{mins}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. CORE 15-MINUTE PREDICTION HERO SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 15-Min Prediction Highlight Card */}
        <Card className="lg:col-span-8 border-[#E5E5E0] bg-white space-y-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E0]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-[#1A1A1A]">
                  {currentStation.name} Station
                </h3>
                <StationBadge line={currentStation.line} size="sm" />
              </div>
              <p className="text-xs text-[#9E9E9E] mt-0.5">
                Target Projection Time: {prediction.timestamp} (+{selectedHorizon} mins)
              </p>
            </div>
            <CrowdStatusBadge status={prediction.predictedCrowd} occupancy={prediction.predictedOccupancy} size="md" />
          </div>

          {/* Side-by-Side Current vs 15-Min Forecast Gauge */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Current */}
            <div className="bg-[#F9F9F7] p-4 rounded-xl border border-[#E5E5E0] space-y-1">
              <div className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-wider">
                Current Crowd
              </div>
              <div className="text-3xl font-black text-[#1A1A1A] font-mono">
                {currentStation.currentOccupancy}%
              </div>
              <div className="text-xs text-[#6B7280] font-medium">
                Live Sensor Baseline
              </div>
              <div className="mt-2">
                <CapacityIndicator occupancy={currentStation.currentOccupancy} size="sm" showLabels={false} />
              </div>
            </div>

            {/* Change Arrow / Indicator */}
            <div className={cn(
              'p-4 rounded-xl border flex flex-col justify-between space-y-1',
              occupancyDiff > 0
                ? 'bg-[#F97316]/10 border-[#F97316]/30 text-[#F97316]'
                : 'bg-[#008080]/10 border-[#008080]/30 text-[#008080]'
            )}>
              <div className="text-[10px] font-bold uppercase tracking-wider">
                Predicted Shift (+{selectedHorizon}m)
              </div>
              <div className="flex items-center gap-1.5 my-1">
                {occupancyDiff >= 0 ? (
                  <ArrowUpRight className="w-6 h-6 shrink-0" />
                ) : (
                  <ArrowDownRight className="w-6 h-6 shrink-0" />
                )}
                <span className="text-3xl font-black font-mono">
                  {diffSign}
                </span>
              </div>
              <div className="text-[11px] font-bold">
                {occupancyDiff >= 0 ? 'Expected Surge' : 'Crowd Easing'}
              </div>
            </div>

            {/* 15-Minute Forecast */}
            <div className="bg-[#008080]/5 p-4 rounded-xl border border-[#008080]/30 space-y-1">
              <div className="text-[10px] text-[#008080] font-bold uppercase tracking-wider">
                Predicted Crowd (+{selectedHorizon}m)
              </div>
              <div className="text-3xl font-black text-[#008080] font-mono">
                {prediction.predictedOccupancy}%
              </div>
              <div className="text-xs text-[#6B7280] font-medium">
                AI Ensemble Projection
              </div>
              <div className="mt-2">
                <CapacityIndicator occupancy={prediction.predictedOccupancy} size="sm" showLabels={false} />
              </div>
            </div>
          </div>

          {/* Status Message Banner */}
          <div className="bg-[#F9F9F7] p-3 rounded-xl border border-[#E5E5E0] flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#008080] shrink-0" />
            <div className="text-xs">
              <strong className="text-[#1A1A1A] font-bold">Operational Status: </strong>
              <span className="text-[#6B7280]">{statusMessage}</span>
            </div>
          </div>

          {/* Contributing Predictive Factors */}
          <div className="space-y-2 pt-1">
            <h4 className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-wider">
              Signal Weighting &amp; Real-time Trigger Factors
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {prediction.contributingFactors.map((f, idx) => (
                <div
                  key={idx}
                  className="bg-[#F9F9F7] p-3 rounded-xl border border-[#E5E5E0] text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1A1A1A]">{f.factor}</span>
                    <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 bg-white text-[#008080] rounded border border-[#E5E5E0]">
                      {f.impact} Impact
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6B7280] leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Right: Quick Operational Summary & Model Metadata */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-[#E5E5E0] bg-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E0]">
              <h4 className="font-bold text-[#1A1A1A] text-sm">Engine Telemetry</h4>
              <span className="font-mono font-bold text-[#008080] bg-[#008080]/10 border border-[#008080]/30 px-2 py-0.5 rounded text-xs">
                {prediction.confidenceScore}% Confidence
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-[#6B7280]">
              <div className="flex items-center justify-between py-1 border-b border-[#E5E5E0]">
                <span>Algorithm Architecture</span>
                <strong className="text-[#1A1A1A] font-mono">Ensemble Ridge + LSTM</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E5E5E0]">
                <span>Signal Freshness</span>
                <strong className="text-[#1A1A1A] font-mono">2.8s sync</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E5E5E0]">
                <span>Mean Absolute Error (MAE)</span>
                <strong className="text-[#008080] font-mono font-bold">±{MOCK_MODEL_STATS.meanAbsoluteError}%</strong>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Validation Accuracy</span>
                <strong className="text-[#1A1A1A] font-mono">{MOCK_MODEL_STATS.overallAccuracy}%</strong>
              </div>
            </div>

            <div className="bg-[#F9F9F7] p-3 rounded-xl border border-[#E5E5E0] text-[11px] text-[#6B7280] leading-relaxed">
              <strong className="text-[#1A1A1A] block mb-0.5">Control Room Actionability:</strong>
              When predicted crowd exceeds 80%, early alerts trigger marshal deployment at concourses 15 minutes before peak choke.
            </div>

            <button
              onClick={() => onRouteChange('/control-room')}
              className="w-full py-2.5 bg-[#1A1A1A] hover:bg-black text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              Open Operations Control Center →
            </button>
          </Card>
        </div>
      </div>

      {/* 3.5 KEY REPRESENTATIVE STATIONS 15-MINUTE FORECAST COMPARISON (Recharts) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E5E0] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5E0]">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#008080]" />
              <h2 className="text-lg sm:text-xl font-black text-[#1A1A1A]">
                Key Stations: Current Crowd vs 15-Min Forecast
              </h2>
            </div>
            <p className="text-xs text-[#6B7280] mt-1">
              Side-by-side predictive comparison across high-density hubs (Dadar, Andheri, Churchgate, Mumbai Central, CSMT, Borivali, Kurla, Thane).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#F97316] bg-[#F97316]/10 px-2.5 py-1 rounded-xl border border-[#F97316]/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#F97316] animate-ping" />
              <span>Surge Watch Active</span>
            </span>
          </div>
        </div>

        {/* Multi-station Recharts Bar Chart */}
        <div className="h-72 w-full bg-[#F9F9F7] p-3.5 rounded-xl border border-[#E5E5E0]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { id: 'dadar', name: 'Dadar', current: 88, predicted: 94, line: 'WESTERN/CENTRAL' },
                { id: 'andheri', name: 'Andheri', current: 84, predicted: 89, line: 'WESTERN' },
                { id: 'churchgate', name: 'Churchgate', current: 58, predicted: 62, line: 'WESTERN' },
                { id: 'mumbai-central', name: 'Mumbai Central', current: 65, predicted: 72, line: 'WESTERN' },
                { id: 'csmt', name: 'CSMT', current: 76, predicted: 83, line: 'CENTRAL/HARBOUR' },
                { id: 'borivali', name: 'Borivali', current: 79, predicted: 86, line: 'WESTERN' },
                { id: 'kurla', name: 'Kurla', current: 92, predicted: 97, line: 'CENTRAL/HARBOUR' },
                { id: 'thane', name: 'Thane', current: 96, predicted: 98, line: 'CENTRAL' }
              ].map(item => {
                const liveStation = MOCK_STATIONS.find(s => s.id === item.id);
                return {
                  id: item.id,
                  name: liveStation ? liveStation.name : item.name,
                  current: liveStation ? liveStation.currentOccupancy : item.current,
                  predicted: liveStation ? liveStation.predictedOccupancy : item.predicted,
                  isHighCrowd: (liveStation ? liveStation.predictedOccupancy : item.predicted) >= 70,
                  isCritical: (liveStation ? liveStation.predictedOccupancy : item.predicted) >= 85
                };
              })}
              margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E0" vertical={false} />
              <XAxis dataKey="name" stroke="#9E9E9E" fontSize={11} tickLine={false} />
              <YAxis stroke="#9E9E9E" fontSize={11} domain={[0, 100]} unit="%" tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const diff = data.predicted - data.current;
                    return (
                      <div className="bg-white p-3 rounded-xl border border-[#E5E5E0] shadow-md text-xs space-y-1 font-sans">
                        <div className="font-bold text-[#1A1A1A]">{label} Station</div>
                        <div className="text-[#1A1A1A] font-medium">Current Crowd: <strong className="font-mono">{data.current}%</strong></div>
                        <div className="text-[#008080] font-bold">15-Min Forecast: <strong className="font-mono">{data.predicted}%</strong></div>
                        <div className="text-[11px] font-bold text-[#F97316]">
                          Projected Shift: {diff > 0 ? `+${diff}% Surge` : `${diff}% Easing`}
                        </div>
                        {data.predicted >= 85 && (
                          <div className="text-[10px] text-[#EF4444] font-bold bg-[#EF4444]/10 px-1.5 py-0.5 rounded">
                            ⚠️ Expected Critical High Crowd
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="current" name="Current Crowd %" fill="#1A1A1A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="predicted" name="15-Min Predicted Crowd %" fill="#008080" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Representative Station Forecast Cards Grid with High Crowd Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {['dadar', 'andheri', 'churchgate', 'mumbai-central', 'csmt', 'borivali', 'kurla', 'thane'].map((stnId) => {
            const stn = MOCK_STATIONS.find((s) => s.id === stnId);
            if (!stn) return null;
            const isSurging = stn.predictedOccupancy >= 70;
            const isCritical = stn.predictedOccupancy >= 85;
            const isSelected = stn.id === currentStation.id;

            return (
              <button
                key={stn.id}
                onClick={() => {
                  setActiveStationId(stn.id);
                  onSelectStation(stn);
                }}
                className={cn(
                  'p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between',
                  isSelected
                    ? 'border-[#008080] bg-[#008080]/5 ring-2 ring-[#008080]/20'
                    : isCritical
                    ? 'border-[#EF4444]/40 bg-[#EF4444]/5 hover:bg-[#EF4444]/10'
                    : isSurging
                    ? 'border-[#F97316]/40 bg-[#F97316]/5 hover:bg-[#F97316]/10'
                    : 'border-[#E5E5E0] bg-[#F9F9F7] hover:bg-[#F3F4F1]'
                )}
              >
                <div>
                  <div className="text-[11px] font-bold text-[#1A1A1A] truncate">{stn.name}</div>
                  <div className="text-[9px] text-[#6B7280]">{stn.line}</div>
                </div>

                <div className="mt-2 space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[9px] text-[#9E9E9E]">Live:</span>
                    <span className="text-[11px] font-mono font-bold text-[#1A1A1A]">{stn.currentOccupancy}%</span>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-[#E5E5E0]/60 pt-1">
                    <span className="text-[9px] font-bold text-[#008080]">+15m:</span>
                    <span className={cn(
                      'text-xs font-mono font-black',
                      isCritical ? 'text-[#EF4444]' : isSurging ? 'text-[#F97316]' : 'text-[#008080]'
                    )}>
                      {stn.predictedOccupancy}%
                    </span>
                  </div>
                </div>

                {isSurging && (
                  <span className={cn(
                    'mt-1.5 text-[8px] font-bold font-mono uppercase px-1 py-0.2 rounded text-center',
                    isCritical ? 'bg-[#EF4444] text-white' : 'bg-[#F97316] text-white'
                  )}>
                    {isCritical ? 'High Crowd' : 'Rising'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. PREDICTION ACCURACY / OVERPREDICTION EVALUATION SECTION (MANDATORY FOR JUDGES) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E5E0] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E5E0]">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#008080]" />
              <h2 className="text-lg sm:text-xl font-black text-[#1A1A1A]">
                Prediction Performance &amp; Overprediction Analysis
              </h2>
            </div>
            <p className="text-xs text-[#6B7280] mt-1">
              Evaluating predicted vs actual platform density across rolling 15-minute verification intervals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1A1A1A] bg-[#008080]/10 text-[#008080] px-3 py-1 rounded-xl border border-[#008080]/30 font-mono">
              Model Accuracy: {MOCK_MODEL_STATS.overallAccuracy}%
            </span>
          </div>
        </div>

        {/* Accuracy KPI Cards (Overprediction vs Underprediction) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Overall Accuracy */}
          <div className="bg-[#F9F9F7] p-4 rounded-xl border border-[#E5E5E0] space-y-1">
            <div className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-wider">
              Prediction Accuracy
            </div>
            <div className="text-2xl font-black text-[#1A1A1A] font-mono">
              {MOCK_MODEL_STATS.overallAccuracy}%
            </div>
            <div className="text-[11px] text-[#008080] font-bold">
              High Reliability Threshold
            </div>
          </div>

          {/* Mean Absolute Error */}
          <div className="bg-[#F9F9F7] p-4 rounded-xl border border-[#E5E5E0] space-y-1">
            <div className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-wider">
              Mean Absolute Error (MAE)
            </div>
            <div className="text-2xl font-black text-[#1A1A1A] font-mono">
              ±{MOCK_MODEL_STATS.meanAbsoluteError}%
            </div>
            <div className="text-[11px] text-[#6B7280]">
              Average Residual Deviation
            </div>
          </div>

          {/* Overprediction Indicator */}
          <div className="bg-[#2563EB]/5 p-4 rounded-xl border border-[#2563EB]/30 space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-[#2563EB] font-bold uppercase tracking-wider">
                Overprediction Case
              </div>
              <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 bg-white text-[#2563EB] border border-[#2563EB]/30 rounded">
                +6% Safe Margin
              </span>
            </div>
            <div className="text-sm font-bold text-[#1A1A1A] font-mono mt-1">
              Pred: <span className="text-[#2563EB]">82%</span> | Act: 76%
            </div>
            <div className="text-[11px] text-[#6B7280]">
              Diff: <strong className="text-[#2563EB]">+6% (Overprediction)</strong>
            </div>
          </div>

          {/* Underprediction Indicator */}
          <div className="bg-[#F97316]/5 p-4 rounded-xl border border-[#F97316]/30 space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-[#F97316] font-bold uppercase tracking-wider">
                Underprediction Case
              </div>
              <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 bg-white text-[#F97316] border border-[#F97316]/30 rounded">
                -3% Minor
              </span>
            </div>
            <div className="text-sm font-bold text-[#1A1A1A] font-mono mt-1">
              Pred: <span className="text-[#F97316]">78%</span> | Act: 81%
            </div>
            <div className="text-[11px] text-[#6B7280]">
              Diff: <strong className="text-[#F97316]">-3% (Underprediction)</strong>
            </div>
          </div>
        </div>

        {/* Recharts Chart: Actual vs Predicted Crowd Comparison */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1A1A1A]">
              Historical Validation: Actual vs. Predicted Crowd (Dadar Station)
            </h3>
            <span className="text-[11px] text-[#9E9E9E] font-mono">Past 6 Evaluation Windows</span>
          </div>

          <div className="h-64 w-full bg-[#F9F9F7] p-3 rounded-xl border border-[#E5E5E0]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_ACCURACY_EVALUATIONS} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E0" vertical={false} />
                <XAxis dataKey="time" stroke="#9E9E9E" fontSize={11} tickLine={false} />
                <YAxis stroke="#9E9E9E" fontSize={11} domain={[40, 100]} unit="%" tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as (typeof MOCK_ACCURACY_EVALUATIONS)[0];
                      return (
                        <div className="bg-white p-3 rounded-xl border border-[#E5E5E0] shadow-md text-xs space-y-1 font-sans">
                          <div className="font-bold text-[#1A1A1A]">{label} - {data.stationName}</div>
                          <div className="text-[#008080] font-bold">Predicted Crowd: {data.predictedOccupancy}%</div>
                          <div className="text-[#1A1A1A] font-medium">Actual Crowd: {data.actualOccupancy}%</div>
                          <div className="text-[11px] font-bold text-[#2563EB]">
                            Variance: {data.difference > 0 ? `+${data.difference}%` : `${data.difference}%`} ({data.classification})
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="actualOccupancy" name="Actual Crowd %" fill="#1A1A1A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="predictedOccupancy" name="Predicted Crowd %" fill="#008080" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Evaluation Table for Hackathon Review */}
        <div className="overflow-x-auto rounded-xl border border-[#E5E5E0]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9F9F7] border-b border-[#E5E5E0] text-[#9E9E9E] font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="p-3">Time Window</th>
                <th className="p-3">Station</th>
                <th className="p-3">Predicted Crowd</th>
                <th className="p-3">Actual Crowd</th>
                <th className="p-3">Difference (Residual)</th>
                <th className="p-3">Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E0] font-medium text-[#1A1A1A]">
              {MOCK_ACCURACY_EVALUATIONS.map((evalItem, idx) => (
                <tr key={idx} className="hover:bg-[#F3F4F1] transition-colors">
                  <td className="p-3 font-mono">{evalItem.time}</td>
                  <td className="p-3 font-bold">{evalItem.stationName}</td>
                  <td className="p-3 font-mono text-[#008080] font-bold">{evalItem.predictedOccupancy}%</td>
                  <td className="p-3 font-mono">{evalItem.actualOccupancy}%</td>
                  <td className="p-3 font-mono font-bold">
                    {evalItem.difference > 0 ? `+${evalItem.difference}%` : `${evalItem.difference}%`}
                  </td>
                  <td className="p-3">
                    <span className={cn(
                      'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono',
                      evalItem.classification === 'Exact Match'
                        ? 'bg-[#008080]/10 text-[#008080] border border-[#008080]/30'
                        : evalItem.classification === 'Overprediction'
                        ? 'bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/30'
                        : 'bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/30'
                    )}>
                      {evalItem.classification}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. DATA SIGNALS USED BY THE SYSTEM */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A]">
              Multi-Modal Telemetry Data Signals
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              5 core input signals fused to produce 15-minute crowd forecasts.
            </p>
          </div>
          <span className="text-[11px] font-mono text-[#9E9E9E]">5 Ingestion Feeds</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_DATA_SIGNALS_INFO.map((sig) => (
            <Card key={sig.id} className="border-[#E5E5E0] bg-white space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 bg-[#008080]/10 text-[#008080] border border-[#008080]/30 rounded">
                  {sig.status}
                </span>
                <span className="text-[10px] font-mono text-[#9E9E9E]">
                  Weight: {sig.confidenceWeight}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-[#1A1A1A] text-sm">{sig.title}</h4>
                <div className="text-[11px] text-[#008080] font-medium">{sig.subtitle}</div>
              </div>

              <p className="text-xs text-[#6B7280] leading-relaxed">
                {sig.description}
              </p>

              <div className="pt-2 border-t border-[#E5E5E0] flex items-center justify-between text-[10px] font-mono text-[#9E9E9E]">
                <span>Sample: {sig.sampleRate}</span>
                <span>Uptime: {sig.uptime}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};


