import React, { useState, useMemo, useEffect } from 'react';
import { Station, RailwayLine, CrowdStatus } from '../types';
import { MOCK_STATIONS, MOCK_NETWORK_STATS } from '../data/mockData';
import { ApiService, HeatmapStationPoint } from '../services/api';
import { RailwayMap } from '../components/map/RailwayMap';
import { Card } from '../components/ui/Card';
import { CrowdStatusBadge } from '../components/ui/CrowdStatusBadge';
import { StationBadge } from '../components/ui/StationBadge';
import { CapacityIndicator } from '../components/ui/CapacityIndicator';
import {
  MapPin,
  Search,
  Sparkles,
  Radio,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Sliders,
  RotateCcw,
  AlertTriangle,
  Layers,
  Train,
  CheckCircle2,
  Clock,
  Zap,
  Compass,
  RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';

interface MapViewProps {
  selectedStation: Station;
  onSelectStation: (station: Station) => void;
  onRouteChange: (route: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  selectedStation,
  onSelectStation,
  onRouteChange
}) => {
  const [activeLineFilter, setActiveLineFilter] = useState<'ALL' | 'WESTERN' | 'CENTRAL' | 'HARBOUR' | 'CRITICAL'>('ALL');
  const [viewMode, setViewMode] = useState<'CURRENT' | 'FORECAST'>('CURRENT');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Real backend dataset
  const [stationsList, setStationsList] = useState<Station[]>(MOCK_STATIONS);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadMapData = async () => {
    setIsSyncing(true);
    try {
      const [stationsRes, heatmapRes] = await Promise.all([
        ApiService.getStations(),
        ApiService.getNetworkHeatmap()
      ]);
      setStationsList(stationsRes.stations);
      setIsBackendConnected(stationsRes.isFromBackend || heatmapRes.isFromBackend);
    } catch (err) {
      console.warn('Failed to load map data from backend:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadMapData();
    const interval = setInterval(loadMapData, 20000);
    return () => clearInterval(interval);
  }, []);

  // Compute summary metrics dynamically
  const summaryMetrics = useMemo(() => {
    const total = stationsList.length;
    const westernCount = stationsList.filter(s => s.line === 'WESTERN' || s.lines.includes('WESTERN')).length;
    const centralCount = stationsList.filter(s => s.line === 'CENTRAL' || s.lines.includes('CENTRAL')).length;
    const harbourCount = stationsList.filter(s => s.line === 'HARBOUR' || s.lines.includes('HARBOUR')).length;

    // Stations above 80% (Current vs Forecasted)
    const above80Current = stationsList.filter(s => s.currentOccupancy >= 80).length;
    const above80Forecast = stationsList.filter(s => s.predictedOccupancy >= 80).length;

    // Peak station current
    const sortedCurrent = [...stationsList].sort((a, b) => b.currentOccupancy - a.currentOccupancy);
    const highestCurrent = sortedCurrent[0] || MOCK_STATIONS[0];

    // Peak station forecast
    const sortedForecast = [...stationsList].sort((a, b) => b.predictedOccupancy - a.predictedOccupancy);
    const highestForecast = sortedForecast[0] || MOCK_STATIONS[0];

    return {
      total,
      westernCount,
      centralCount,
      harbourCount,
      above80Current,
      above80Forecast,
      highestCurrent,
      highestForecast
    };
  }, [stationsList]);

  // Filtered station list for side drawer search
  const filteredStationList = useMemo(() => {
    return stationsList.filter((s) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          s.name.toLowerCase().includes(q) ||
          (s.marathiName && s.marathiName.includes(q)) ||
          s.line.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (activeLineFilter === 'WESTERN') return s.lines.includes('WESTERN') || s.line === 'WESTERN';
      if (activeLineFilter === 'CENTRAL') return s.lines.includes('CENTRAL') || s.line === 'CENTRAL';
      if (activeLineFilter === 'HARBOUR') return s.lines.includes('HARBOUR') || s.line === 'HARBOUR';
      if (activeLineFilter === 'CRITICAL') {
        const occ = viewMode === 'FORECAST' ? s.predictedOccupancy : s.currentOccupancy;
        return occ >= 70;
      }
      return true;
    });
  }, [stationsList, searchQuery, activeLineFilter, viewMode]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      {/* Top Header & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#E5E5E0] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#008080]/10 flex items-center justify-center text-[#008080]">
              <Compass className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-black text-[#1A1A1A]">
              Railway Network Heatmap
            </h1>
            <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 bg-[#008080]/10 text-[#008080] border border-[#008080]/30 rounded">
              Live GIS Telemetry
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            Real-time geospatial crowd density tracking across Western, Central, and Harbour Suburban lines with 15-minute predictive surge overlays.
          </p>
        </div>

        {/* Live System Signal Health */}
        <div className="flex items-center gap-2 text-xs self-start sm:self-auto">
          <div className="bg-[#F9F9F7] px-3 py-1.5 rounded-xl border border-[#E5E5E0] flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#008080] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#008080]"></span>
            </span>
            <span className="text-[#1A1A1A] font-semibold text-xs">Signal Sync:</span>
            <span className="text-[#008080] font-mono font-bold text-xs">{MOCK_NETWORK_STATS.lastSignalSync}</span>
          </div>
        </div>
      </div>

      {/* Summary KPI Panel on the Network Map */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Total Monitored */}
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E5E0] shadow-xs space-y-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#9E9E9E]">
            Stations Monitored
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-[#1A1A1A] font-mono">
              {summaryMetrics.total}
            </span>
            <span className="text-[10px] text-[#6B7280] font-medium">
              (WR: {summaryMetrics.westernCount} | CR: {summaryMetrics.centralCount} | HR: {summaryMetrics.harbourCount})
            </span>
          </div>
        </div>

        {/* Stations >80% */}
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E5E0] shadow-xs space-y-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#F87171]">
            {viewMode === 'FORECAST' ? 'Forecasted >80% (15m)' : 'Current >80% Capacity'}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-[#EF4444] font-mono">
              {viewMode === 'FORECAST' ? summaryMetrics.above80Forecast : summaryMetrics.above80Current} Stations
            </span>
            <span className="text-[10px] font-mono font-bold text-[#F97316]">
              {viewMode === 'FORECAST' ? '(+3 Surge)' : 'Live'}
            </span>
          </div>
        </div>

        {/* Highest Current Crowd Station */}
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E5E0] shadow-xs space-y-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#9E9E9E]">
            Peak Live Station
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold text-[#1A1A1A] truncate">
              {summaryMetrics.highestCurrent?.name}
            </span>
            <span className="text-sm font-mono font-extrabold text-[#EF4444]">
              {summaryMetrics.highestCurrent?.currentOccupancy}%
            </span>
          </div>
        </div>

        {/* Highest Predicted Crowd Station */}
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E5E0] shadow-xs space-y-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#9E9E9E]">
            Peak 15m Forecast
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold text-[#1A1A1A] truncate">
              {summaryMetrics.highestForecast?.name}
            </span>
            <span className="text-sm font-mono font-extrabold text-[#F97316]">
              {summaryMetrics.highestForecast?.predictedOccupancy}%
            </span>
          </div>
        </div>

        {/* Network Status */}
        <div className="col-span-2 md:col-span-1 bg-white p-3.5 rounded-xl border border-[#E5E5E0] shadow-xs space-y-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#9E9E9E]">
            Network Health
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
            <span className="text-xs font-bold text-[#1A1A1A]">
              {MOCK_NETWORK_STATS.systemHealth}
            </span>
          </div>
        </div>
      </div>

      {/* Top Filter & Visualization Control Section */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E5E5E0] shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Line Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs font-semibold">
            <span className="text-[11px] text-[#9E9E9E] uppercase font-bold mr-1">Line:</span>
            <button
              onClick={() => setActiveLineFilter('ALL')}
              className={cn(
                'px-3 py-1.5 rounded-xl transition-all',
                activeLineFilter === 'ALL'
                  ? 'bg-[#1A1A1A] text-white shadow-xs'
                  : 'bg-[#F9F9F7] text-[#6B7280] hover:bg-[#F3F4F1] border border-[#E5E5E0]'
              )}
            >
              All Lines ({MOCK_STATIONS.length})
            </button>
            <button
              onClick={() => setActiveLineFilter('WESTERN')}
              className={cn(
                'px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all',
                activeLineFilter === 'WESTERN'
                  ? 'bg-[#008080] text-white shadow-xs'
                  : 'bg-[#F9F9F7] text-[#008080] hover:bg-[#008080]/10 border border-[#008080]/30'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-[#008080]" />
              <span>Western ({summaryMetrics.westernCount})</span>
            </button>
            <button
              onClick={() => setActiveLineFilter('CENTRAL')}
              className={cn(
                'px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all',
                activeLineFilter === 'CENTRAL'
                  ? 'bg-[#E11D48] text-white shadow-xs'
                  : 'bg-[#F9F9F7] text-[#E11D48] hover:bg-[#E11D48]/10 border border-[#E11D48]/30'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-[#E11D48]" />
              <span>Central ({summaryMetrics.centralCount})</span>
            </button>
            <button
              onClick={() => setActiveLineFilter('HARBOUR')}
              className={cn(
                'px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all',
                activeLineFilter === 'HARBOUR'
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-[#F9F9F7] text-[#2563EB] hover:bg-[#2563EB]/10 border border-[#2563EB]/30'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
              <span>Harbour ({summaryMetrics.harbourCount})</span>
            </button>
            <button
              onClick={() => setActiveLineFilter('CRITICAL')}
              className={cn(
                'px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all',
                activeLineFilter === 'CRITICAL'
                  ? 'bg-[#F97316] text-white shadow-xs'
                  : 'bg-[#F9F9F7] text-[#F97316] hover:bg-[#F97316]/10 border border-[#F97316]/30'
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Surge Only (&gt;70%)</span>
            </button>
          </div>

          {/* Right: Visualization Mode Toggle & Search Box */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* View Mode Toggle: Current vs 15-Min Forecast */}
            <div className="flex items-center p-1 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl text-xs font-bold">
              <button
                onClick={() => setViewMode('CURRENT')}
                className={cn(
                  'px-3 py-1.5 rounded-lg transition-all',
                  viewMode === 'CURRENT'
                    ? 'bg-white text-[#1A1A1A] shadow-xs'
                    : 'text-[#6B7280] hover:text-[#1A1A1A]'
                )}
              >
                Current Crowd
              </button>
              <button
                onClick={() => setViewMode('FORECAST')}
                className={cn(
                  'px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all',
                  viewMode === 'FORECAST'
                    ? 'bg-[#F97316] text-white shadow-xs'
                    : 'text-[#6B7280] hover:text-[#1A1A1A]'
                )}
              >
                <Sparkles className="w-3 h-3" />
                <span>15-Min Forecast</span>
              </button>
            </div>

            {/* Station Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-none">
              <Search className="w-3.5 h-3.5 text-[#9E9E9E] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search station..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl text-xs text-[#1A1A1A] placeholder-[#9E9E9E] focus:outline-none focus:border-[#008080] focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#9E9E9E] hover:text-[#1A1A1A]"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Legend Bar Required by Design (Low Crowd, Medium Traffic, High Crowd, Peak Congestion) */}
        <div className="pt-2.5 border-t border-[#E5E5E0] flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[11px] font-bold text-[#9E9E9E] uppercase">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#10B981] border border-white shadow-2xs" />
              <span className="text-[#1A1A1A] font-medium text-[11px]">Low Crowd (&lt;50%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#F59E0B] border border-white shadow-2xs" />
              <span className="text-[#1A1A1A] font-medium text-[11px]">Medium Traffic (50–70%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#F97316] border border-white shadow-2xs" />
              <span className="text-[#1A1A1A] font-medium text-[11px]">High Crowd (70–85%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#EF4444] border border-white shadow-2xs" />
              <span className="text-[#1A1A1A] font-medium text-[11px]">Peak Congestion (&gt;85%)</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#6B7280]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-[#008080] rounded" />
              <span>Western</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-[#E11D48] rounded" />
              <span>Central</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-[#2563EB] rounded" />
              <span>Harbour</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A]" />
              <span>Interchange</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Map + Station Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main Map Canvas Area */}
        <div className="lg:col-span-8 xl:col-span-9">
          <RailwayMap
            height="650px"
            selectedStationId={selectedStation.id}
            onSelectStation={onSelectStation}
            viewMode={viewMode}
            lineFilter={activeLineFilter}
            searchQuery={searchQuery}
          />
        </div>

        {/* Station Inspector & Quick Switcher Drawer */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          {/* Station Inspector Card */}
          <Card className="border-[#E5E5E0] bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E0]">
              <span className="text-[11px] font-bold text-[#9E9E9E] uppercase tracking-wider">
                Station Inspector
              </span>
              <CrowdStatusBadge status={selectedStation.crowdStatus} size="sm" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-[#1A1A1A]">
                  {selectedStation.name}
                </h3>
                {selectedStation.marathiName && (
                  <span className="text-xs text-[#9E9E9E]">
                    ({selectedStation.marathiName})
                  </span>
                )}
              </div>
              <div className="mt-1.5">
                <StationBadge
                  line={selectedStation.line}
                  lines={selectedStation.lines}
                  isInterchange={selectedStation.isInterchange}
                />
              </div>
            </div>

            {/* Occupancy and 15m Predictive Forecast */}
            <div className="space-y-2.5 bg-[#F9F9F7] p-3.5 rounded-xl border border-[#E5E5E0]">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-[#6B7280]">Live vs 15m Forecast</span>
                <span className="text-[10px] font-mono font-bold text-[#F97316] bg-[#F97316]/10 px-2 py-0.5 rounded border border-[#F97316]/30">
                  +{selectedStation.predictedOccupancy - selectedStation.currentOccupancy}% Surge
                </span>
              </div>
              <CapacityIndicator
                occupancy={selectedStation.currentOccupancy}
                predictedOccupancy={selectedStation.predictedOccupancy}
              />
            </div>

            {/* Next Scheduled Train Information */}
            <div className="bg-[#F9F9F7] p-3 rounded-xl border border-[#E5E5E0] space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[#9E9E9E] font-medium uppercase text-[10px] tracking-wider">
                <span>Next Departure</span>
                <span className={cn(
                  'font-bold px-1.5 py-0.2 rounded font-mono',
                  selectedStation.delayStatus === 'On Time' ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#EF4444]/10 text-[#EF4444]'
                )}>
                  {selectedStation.delayStatus}
                </span>
              </div>
              <div className="font-bold text-[#1A1A1A] text-sm">
                {selectedStation.destination}
              </div>
              <div className="flex items-center justify-between text-[#6B7280]">
                <span className="font-mono font-semibold">Platform {selectedStation.platform} of {selectedStation.platformsCount}</span>
                <span className="font-mono font-bold text-[#1A1A1A]">{selectedStation.nextTrain}</span>
              </div>
            </div>

            {/* Multi-modal AI Signals */}
            <div className="space-y-2 text-xs text-[#6B7280] bg-[#F9F9F7] p-3 rounded-xl border border-[#E5E5E0]">
              <div className="text-[10px] uppercase font-bold text-[#9E9E9E] tracking-wider mb-1">
                Telemetry Confidence
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#008080]" />
                  <span>CCTV Optical Flow:</span>
                </span>
                <strong className="font-mono text-[#1A1A1A]">{selectedStation.cctvSignalConfidence}% Conf.</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-[#008080]" />
                  <span>Device Density Index:</span>
                </span>
                <strong className="font-mono text-[#1A1A1A]">{selectedStation.deviceDensityIndex}/100</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#008080]" />
                  <span>UTS Geofenced Sessions:</span>
                </span>
                <strong className="font-mono text-[#1A1A1A]">{selectedStation.utsActiveSessions} active</strong>
              </div>
            </div>

            {/* Link to Station Analytics */}
            <button
              onClick={() => onRouteChange(`/station/${selectedStation.id}`)}
              className="w-full py-2.5 bg-[#008080] hover:bg-[#007070] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <span>Detailed Platform Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Card>

          {/* Quick Station Browser List */}
          <Card className="space-y-2 border-[#E5E5E0] bg-white">
            <div className="flex items-center justify-between pb-1">
              <h4 className="font-bold text-[#9E9E9E] text-xs uppercase tracking-wider">
                Quick Jumps ({filteredStationList.length})
              </h4>
              <span className="text-[10px] text-[#6B7280]">Click to Inspect</span>
            </div>

            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {filteredStationList.slice(0, 15).map((stn) => {
                const occ = viewMode === 'FORECAST' ? stn.predictedOccupancy : stn.currentOccupancy;
                const isSelected = stn.id === selectedStation.id;

                return (
                  <button
                    key={stn.id}
                    onClick={() => onSelectStation(stn)}
                    className={cn(
                      'w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition-all text-left',
                      isSelected
                        ? 'bg-[#008080]/10 text-[#008080] font-bold border border-[#008080]/30'
                        : 'hover:bg-[#F3F4F1] text-[#1A1A1A]'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        occ >= 85 ? 'bg-[#EF4444]' : occ >= 70 ? 'bg-[#F97316]' : occ >= 50 ? 'bg-[#F59E0B]' : 'bg-[#10B981]'
                      )} />
                      <span className="truncate">{stn.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className={cn(
                        'font-bold',
                        occ >= 85 ? 'text-[#EF4444]' : occ >= 70 ? 'text-[#F97316]' : 'text-[#6B7280]'
                      )}>
                        {occ}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
