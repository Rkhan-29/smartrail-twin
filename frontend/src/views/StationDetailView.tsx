import React, { useState, useEffect } from 'react';
import { Station, PlatformInfo } from '../types';
import { MOCK_STATIONS, getMumbaiNextTrainTime } from '../data/mockData';
import { ApiService, RecommendationItem } from '../services/api';
import { Card } from '../components/ui/Card';
import { CrowdStatusBadge } from '../components/ui/CrowdStatusBadge';
import { StationBadge } from '../components/ui/StationBadge';
import { CapacityIndicator } from '../components/ui/CapacityIndicator';
import {
  Train,
  Clock,
  Radio,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Info,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { cn } from '../lib/utils';

interface StationDetailViewProps {
  station: Station;
  onSelectStation?: (station: Station) => void;
  onRouteChange: (route: string) => void;
}

export const StationDetailView: React.FC<StationDetailViewProps> = ({
  station,
  onSelectStation,
  onRouteChange
}) => {
  const [stationList, setStationList] = useState<Station[]>(MOCK_STATIONS);
  const [platformsList, setPlatformsList] = useState<PlatformInfo[]>(station.platforms || []);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadStationDetails = async () => {
    setIsLoading(true);
    try {
      const [stationRes, platformsRes, allStationsRes, recsRes] = await Promise.all([
        ApiService.getStationById(station.id),
        ApiService.getStationPlatforms(station.id),
        ApiService.getStations(),
        ApiService.getRecommendations({ stationId: station.id })
      ]);
      setPlatformsList(platformsRes.platforms);
      setStationList(allStationsRes.stations);
      setRecommendations(recsRes.recommendations);
      setIsBackendConnected(stationRes.isFromBackend || platformsRes.isFromBackend);
    } catch (err) {
      console.warn('Failed to load station details from backend:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStationDetails();
  }, [station.id]);

  // Generate station-specific 15-minute chronological curve data
  const trendData = [
    { time: 'T-30m', actual: Math.max(30, station.currentOccupancy - 18), predicted: Math.max(28, station.currentOccupancy - 20) },
    { time: 'T-20m', actual: Math.max(35, station.currentOccupancy - 12), predicted: Math.max(34, station.currentOccupancy - 14) },
    { time: 'T-10m', actual: Math.max(45, station.currentOccupancy - 5), predicted: Math.max(42, station.currentOccupancy - 6) },
    { time: 'Now', actual: station.currentOccupancy, predicted: station.currentOccupancy },
    { time: '+5m', actual: null, predicted: Math.round(station.currentOccupancy * 0.7 + station.predictedOccupancy * 0.3) },
    { time: '+10m', actual: null, predicted: Math.round(station.currentOccupancy * 0.3 + station.predictedOccupancy * 0.7) },
    { time: '+15m (Surge)', actual: null, predicted: station.predictedOccupancy },
    { time: '+20m', actual: null, predicted: Math.max(40, station.predictedOccupancy - 4) },
    { time: '+30m', actual: null, predicted: Math.max(35, station.predictedOccupancy - 12) }
  ];

  // Inflow & outflow metrics
  const inflowRate = Math.round(station.currentOccupancy * 18.5);
  const outflowRate = Math.round(station.currentOccupancy * 14.2);
  const netAccumulation = inflowRate - outflowRate;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header Navigation Bar with Station Selector Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E5E5E0] shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => onRouteChange('/home')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A1A1A] hover:text-[#008080] bg-[#F9F9F7] px-3 py-1.5 rounded-xl border border-[#E5E5E0] shadow-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <div className="h-5 w-px bg-[#E5E5E0] hidden sm:block" />

          {/* Quick Station Switcher */}
          <div className="relative">
            <select
              value={station.id}
              onChange={(e) => {
                const target = stationList.find((s) => s.id === e.target.value);
                if (target && onSelectStation) {
                  onSelectStation(target);
                }
              }}
              className="appearance-none bg-[#F9F9F7] border border-[#E5E5E0] text-xs font-bold text-[#1A1A1A] py-1.5 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#008080] cursor-pointer"
            >
              {stationList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.currentOccupancy}% • {s.crowdStatus})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#9E9E9E] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <span className={cn(
            "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full hidden md:inline-block",
            isBackendConnected ? "bg-[#10B981]/10 text-[#059669] border border-[#10B981]/30" : "bg-[#F59E0B]/10 text-[#D97706] border border-[#F59E0B]/30"
          )}>
            {isBackendConnected ? "● Live Station API" : "○ Fallback Data"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadStationDetails}
            title="Refresh Platform Feeds"
            className="p-1.5 rounded-xl bg-[#F9F9F7] hover:bg-[#EBECE8] border border-[#E5E5E0] text-[#1A1A1A] transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-[#6B7280]", isLoading && "animate-spin text-[#008080]")} />
          </button>
          <button
            onClick={() => onRouteChange('/map')}
            className="text-xs font-bold text-[#008080] bg-[#008080]/10 px-3 py-1.5 rounded-xl border border-[#008080]/30 hover:bg-[#008080]/20 transition-colors flex items-center gap-1"
          >
            <span>View On Live Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Main Station Header Banner */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E5E0] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
                {station.name} Station
              </h1>
              {station.marathiName && (
                <span className="text-lg text-[#9E9E9E] font-medium">
                  ({station.marathiName})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StationBadge
                line={station.line}
                lines={station.lines}
                isInterchange={station.isInterchange}
                size="md"
              />
              <span className="text-xs text-[#6B7280] font-mono bg-[#F9F9F7] border border-[#E5E5E0] px-2 py-0.5 rounded-md">
                Lat: {station.latitude.toFixed(4)}, Lon: {station.longitude.toFixed(4)}
              </span>
              <span className="text-xs text-[#6B7280] font-mono bg-[#F9F9F7] border border-[#E5E5E0] px-2 py-0.5 rounded-md">
                {station.platformsCount} Operational Platforms
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CrowdStatusBadge
              status={station.crowdStatus}
              occupancy={station.currentOccupancy}
              size="lg"
            />
          </div>
        </div>

        {/* Capacity / Forecast Highlight Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#E5E5E0]">
          <div className="bg-[#F9F9F7] p-3.5 rounded-xl border border-[#E5E5E0]">
            <div className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-wider mb-1">
              Current Live Density
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#1A1A1A] font-mono">
                {station.currentOccupancy}%
              </span>
              <span className="text-xs font-semibold text-[#6B7280]">Concourse &amp; FOBs</span>
            </div>
            <div className="mt-2">
              <CapacityIndicator occupancy={station.currentOccupancy} size="sm" showLabels={false} />
            </div>
          </div>

          <div className="bg-[#F9F9F7] p-3.5 rounded-xl border border-[#E5E5E0]">
            <div className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-wider mb-1">
              15-Min Surge Forecast
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#1A1A1A] font-mono">
                {station.predictedOccupancy}%
              </span>
              <span className="text-xs font-bold text-[#F97316]">
                {station.predictedOccupancy >= station.currentOccupancy ? '▲ Expected Influx' : '▼ Easing Flow'}
              </span>
            </div>
            <div className="mt-2">
              <CapacityIndicator occupancy={station.predictedOccupancy} size="sm" showLabels={false} />
            </div>
          </div>

          <div className="bg-[#F9F9F7] p-3.5 rounded-xl border border-[#E5E5E0]">
            <div className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-wider mb-1">Next Fast Local</div>
            <div className="text-xl font-bold text-[#1A1A1A] font-mono">
              {station.nextTrain}
            </div>
            <div className="text-xs text-[#6B7280] font-medium truncate mt-0.5">
              PF {station.platform} • {station.destination} ({station.delayStatus})
            </div>
          </div>
        </div>
      </div>

      {/* 3. Inflow vs Outflow & Station Advisories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Inflow Rate */}
        <Card className="border-[#E5E5E0] bg-white space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-wider">
              Concourse Inflow Rate
            </span>
            <ArrowDownLeft className="w-4 h-4 text-[#008080]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#1A1A1A]">
            {inflowRate.toLocaleString()} <span className="text-xs font-normal text-[#6B7280]">passengers/min</span>
          </div>
          <p className="text-[11px] text-[#6B7280]">
            Ticketing gates &amp; connecting FOB ingress flow.
          </p>
        </Card>

        {/* Outflow Rate */}
        <Card className="border-[#E5E5E0] bg-white space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-wider">
              Platform Clearance Outflow
            </span>
            <ArrowUpRight className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#1A1A1A]">
            {outflowRate.toLocaleString()} <span className="text-xs font-normal text-[#6B7280]">passengers/min</span>
          </div>
          <p className="text-[11px] text-[#6B7280]">
            Train boarding clearance &amp; exit stairways.
          </p>
        </Card>

        {/* Net Concourse Accumulation */}
        <Card className={cn(
          'space-y-1.5',
          netAccumulation > 0 ? 'border-[#F87171]/40 bg-[#F87171]/5' : 'border-[#E5E5E0] bg-white'
        )}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#F87171] font-bold uppercase tracking-wider">
              Net Accumulation
            </span>
            <TrendingUp className="w-4 h-4 text-[#F87171]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#1A1A1A]">
            +{netAccumulation.toLocaleString()} <span className="text-xs font-normal text-[#6B7280]">net/min</span>
          </div>
          <p className="text-[11px] text-[#6B7280]">
            Platform crowd pressure is {netAccumulation > 0 ? 'increasing' : 'stable'}.
          </p>
        </Card>
      </div>

      {/* 4. 15-Minute Crowd Prediction Chronological Curve (Recharts) */}
      <Card className="border-[#E5E5E0] bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#1A1A1A]">
              15-Minute AI Crowd Trajectory Curve
            </h3>
            <p className="text-xs text-[#6B7280]">
              Past 30 min actual telemetry vs 15 min predictive lookahead for {station.name}.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#008080]" />
              <span className="text-[#6B7280] font-medium">Actual Telemetry</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-[#F97316]" />
              <span className="text-[#6B7280] font-medium">15m Forecast</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#008080" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#008080" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E0" vertical={false} />
              <XAxis dataKey="time" stroke="#9E9E9E" fontSize={11} tickLine={false} />
              <YAxis stroke="#9E9E9E" fontSize={11} domain={[0, 100]} unit="%" tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E5E5E0',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}
              />
              <ReferenceLine y={85} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Critical (85%)', fill: '#EF4444', fontSize: 10 }} />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#008080"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#actualGradient)"
                name="Actual Load %"
              />
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="#F97316"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#predictedGradient)"
                name="Forecast %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 5. Station Operational Advisory Banner */}
      <Card className="border-[#E5E5E0] bg-[#F9F9F7] space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#D97706]" />
          <h3 className="text-sm font-bold text-[#1A1A1A]">
            Station Control Advisory &amp; Crowd Protocols
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-white p-3 rounded-xl border border-[#E5E5E0]">
            <strong className="text-[#1A1A1A] font-bold block mb-1">
              FOB Escalator &amp; Stairway Ingress:
            </strong>
            <p className="text-[#6B7280]">
              {station.crowdStatus === 'CRITICAL' || station.crowdStatus === 'HIGH'
                ? 'Regulate Middle FOB turnstiles; divert exiting commuters to North & South skywalks.'
                : 'All FOB ingress and egress corridors operating under normal commuter throughput.'}
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-[#E5E5E0]">
            <strong className="text-[#1A1A1A] font-bold block mb-1">
              Rake Dispatch Recommendation:
            </strong>
            <p className="text-[#6B7280]">
              {station.predictedOccupancy >= 80
                ? 'Suggest dispatching additional 15-car rake originating from Dadar/Bandra siding.'
                : 'Scheduled 12-car rake frequency sufficient for projected commuter density.'}
            </p>
          </div>
        </div>
      </Card>

      {/* 6. Multi-Modal Signal Telemetry (CCTV, ETVM, UTS, Device Density) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#008080]" />
            <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A]">
              Multi-Modal Crowd Telemetry Signals
            </h2>
          </div>
          <span className="text-[11px] text-[#9E9E9E] font-mono">Live Sensor Fusion</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. CCTV Optical Flow */}
          <Card className="border-[#E5E5E0] bg-white space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#008080]/10 text-[#008080] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-[#008080]/10 text-[#008080] border border-[#008080]/30 rounded">
                Active
              </span>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] font-medium">1. CCTV Optical Flow</div>
              <div className="text-xl font-bold font-mono text-[#1A1A1A] mt-0.5">
                {station.cctvSignalConfidence}% Confidence
              </div>
              <p className="text-[11px] text-[#9E9E9E] mt-1">
                Computer vision pedestrian head detection across 24 platform cameras.
              </p>
            </div>
          </Card>

          {/* 2. ETVM Ticketing Kiosks */}
          <Card className="border-[#E5E5E0] bg-white space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/30 rounded">
                Telemetry
              </span>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] font-medium">2. ATVM Ticketing Rate</div>
              <div className="text-xl font-bold font-mono text-[#1A1A1A] mt-0.5">
                {station.etvmTicketingVelocity} tix / min
              </div>
              <p className="text-[11px] text-[#9E9E9E] mt-1">
                Physical ATVM dispensing rate across station booking concourses.
              </p>
            </div>
          </Card>

          {/* 3. UTS Mobile Sessions */}
          <Card className="border-[#E5E5E0] bg-white space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-[#4F46E5]/10 text-[#4F46E5] border border-[#4F46E5]/30 rounded">
                Geofenced
              </span>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] font-medium">3. UTS Mobile Activity</div>
              <div className="text-xl font-bold font-mono text-[#1A1A1A] mt-0.5">
                {station.utsActiveSessions.toLocaleString()} Active
              </div>
              <p className="text-[11px] text-[#9E9E9E] mt-1">
                Active digital ticketing sessions inside the 500m station geofence radius.
              </p>
            </div>
          </Card>

          {/* 4. Experimental Anonymous Device-Density Signal */}
          <Card className="border-[#E5E5E0] bg-white space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#D97706]/10 text-[#D97706] flex items-center justify-center">
                <Radio className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/30 rounded">
                Experimental
              </span>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] font-medium">
                4. Device Density Index
              </div>
              <div className="text-xl font-bold font-mono text-[#1A1A1A] mt-0.5">
                {station.deviceDensityIndex} / 100 Idx
              </div>
              <p className="text-[11px] text-[#9E9E9E] mt-1">
                Experimental anonymous device-density signal as a supporting indicator.
              </p>
            </div>
          </Card>
        </div>

        {/* Technical Disclaimer Note */}
        <div className="bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl p-3 flex items-start gap-2.5 text-xs text-[#1A1A1A]">
          <Info className="w-4 h-4 text-[#008080] shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[#6B7280]">
            <strong className="text-[#1A1A1A]">Technical Architecture Note:</strong> The device-density signal is an experimental, non-individualized aggregated metric used strictly as a supporting indicator in combination with CCTV optical flow and ETVM/UTS ticketing velocity.
          </p>
        </div>
      </div>

      {/* 7. Platform Occupancy Breakdown (Cards and Table View) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Train className="w-4 h-4 text-[#008080]" />
            <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A]">
              Live Platform Occupancy &amp; Schedule
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#9E9E9E] font-mono">
              {station.platforms?.length || 4} Track Lines
            </span>
          </div>
        </div>

        {/* Platform Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(station.platforms || [
            { platformNumber: 1, line: 'WESTERN', currentCrowd: 'HIGH', occupancyPercentage: 86, nextTrainTime: getMumbaiNextTrainTime(3), nextTrainDestination: 'Borivali Fast', isFastTrainOnly: true },
            { platformNumber: 2, line: 'WESTERN', currentCrowd: 'MEDIUM', occupancyPercentage: 68, nextTrainTime: getMumbaiNextTrainTime(6), nextTrainDestination: 'Bandra Slow' },
            { platformNumber: 3, line: 'WESTERN', currentCrowd: 'HIGH', occupancyPercentage: 82, nextTrainTime: getMumbaiNextTrainTime(4), nextTrainDestination: 'Churchgate' },
            { platformNumber: 4, line: 'WESTERN', currentCrowd: 'LOW', occupancyPercentage: 42, nextTrainTime: getMumbaiNextTrainTime(8), nextTrainDestination: 'Virar Fast' }
          ]).map((p) => (
            <Card key={p.platformNumber} className="space-y-3 border-[#E5E5E0] bg-white">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[#1A1A1A] bg-[#F3F4F1] px-2.5 py-1 rounded-md text-xs border border-[#E5E5E0]">
                  Platform {p.platformNumber}
                </span>
                <CrowdStatusBadge status={p.currentCrowd} occupancy={p.occupancyPercentage} size="sm" />
              </div>

              <div>
                <div className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-wider">Next Service</div>
                <div className="font-bold text-[#1A1A1A] text-sm truncate" title={p.nextTrainDestination}>
                  {p.nextTrainDestination}
                </div>
                <div className="flex items-center justify-between text-xs text-[#6B7280] mt-1">
                  <span className="font-mono">{p.nextTrainTime}</span>
                  <StationBadge line={p.line} size="sm" />
                </div>
              </div>

              <div className="pt-2 border-t border-[#E5E5E0]">
                <CapacityIndicator occupancy={p.occupancyPercentage} size="sm" />
              </div>
            </Card>
          ))}
        </div>

        {/* Platform Occupancy Table Format */}
        <div className="bg-white rounded-2xl border border-[#E5E5E0] overflow-hidden shadow-sm">
          <div className="p-3 bg-[#F9F9F7] border-b border-[#E5E5E0] flex items-center justify-between">
            <span className="text-xs font-bold text-[#1A1A1A]">Platform Telemetry Matrix</span>
            <span className="text-[10px] font-mono text-[#9E9E9E]">Real-Time Feed</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9F7] border-b border-[#E5E5E0] text-[#9E9E9E] font-mono text-[10px] uppercase">
                <tr>
                  <th className="p-3">Platform</th>
                  <th className="p-3">Line</th>
                  <th className="p-3">Live Occupancy</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Next Scheduled Train</th>
                  <th className="p-3">Departure Time</th>
                  <th className="p-3">Service Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E0] font-medium text-[#1A1A1A]">
                {(station.platforms || [
                  { platformNumber: 1, line: 'WESTERN', currentCrowd: 'HIGH', occupancyPercentage: 86, nextTrainTime: getMumbaiNextTrainTime(3), nextTrainDestination: 'Borivali Fast', isFastTrainOnly: true },
                  { platformNumber: 2, line: 'WESTERN', currentCrowd: 'MEDIUM', occupancyPercentage: 68, nextTrainTime: getMumbaiNextTrainTime(6), nextTrainDestination: 'Bandra Slow' },
                  { platformNumber: 3, line: 'WESTERN', currentCrowd: 'HIGH', occupancyPercentage: 82, nextTrainTime: getMumbaiNextTrainTime(4), nextTrainDestination: 'Churchgate' },
                  { platformNumber: 4, line: 'WESTERN', currentCrowd: 'LOW', occupancyPercentage: 42, nextTrainTime: getMumbaiNextTrainTime(8), nextTrainDestination: 'Virar Fast' }
                ]).map((p) => (
                  <tr key={p.platformNumber} className="hover:bg-[#F3F4F1] transition-colors">
                    <td className="p-3 font-mono font-bold">PF {p.platformNumber}</td>
                    <td className="p-3">
                      <StationBadge line={p.line} size="sm" />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{p.occupancyPercentage}%</span>
                        <div className="w-20 hidden sm:block">
                          <CapacityIndicator occupancy={p.occupancyPercentage} size="sm" showLabels={false} />
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <CrowdStatusBadge status={p.currentCrowd} occupancy={p.occupancyPercentage} size="sm" />
                    </td>
                    <td className="p-3 font-bold">{p.nextTrainDestination}</td>
                    <td className="p-3 font-mono">{p.nextTrainTime}</td>
                    <td className="p-3">
                      <span className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase',
                        p.isFastTrainOnly ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-[#008080]/10 text-[#008080]'
                      )}>
                        {p.isFastTrainOnly ? 'Fast Local' : 'Slow Local'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};


