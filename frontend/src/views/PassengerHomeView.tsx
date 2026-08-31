import React, { useState, useEffect } from 'react';
import { Station, Train } from '../types';
import { MOCK_STATIONS } from '../data/mockData';
import { ApiService, RecommendationItem } from '../services/api';
import { Card } from '../components/ui/Card';
import { StationCard } from '../components/ui/StationCard';
import { TrainCard } from '../components/ui/TrainCard';
import { CrowdStatusBadge } from '../components/ui/CrowdStatusBadge';
import { StationBadge } from '../components/ui/StationBadge';
import { CapacityIndicator } from '../components/ui/CapacityIndicator';
import {
  Search,
  Sparkles,
  MapPin,
  TrendingUp,
  Clock,
  Radio,
  ArrowRight,
  ShieldCheck,
  Zap,
  Train as TrainIcon,
  Compass,
  CheckCircle2,
  Sliders,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface PassengerHomeViewProps {
  selectedStation: Station;
  onSelectStation: (station: Station) => void;
  onRouteChange: (route: string) => void;
}

export const PassengerHomeView: React.FC<PassengerHomeViewProps> = ({
  selectedStation,
  onSelectStation,
  onRouteChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLineFilter, setSelectedLineFilter] = useState<'ALL' | 'WESTERN' | 'CENTRAL' | 'HARBOUR'>('ALL');
  const [stationsList, setStationsList] = useState<Station[]>(MOCK_STATIONS);
  const [trainsList, setTrainsList] = useState<Train[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackendLive, setIsBackendLive] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch real backend data
  const loadData = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [stationsRes, recsRes, trainsRes] = await Promise.all([
        ApiService.getStations({ line: selectedLineFilter !== 'ALL' ? selectedLineFilter : undefined }),
        ApiService.getRecommendations(),
        ApiService.getTrains({ line: selectedLineFilter !== 'ALL' ? selectedLineFilter : undefined })
      ]);
      setStationsList(stationsRes.stations);
      setRecommendations(recsRes.recommendations);
      setTrainsList(trainsRes.trains);
      setIsBackendLive(stationsRes.isFromBackend || trainsRes.isFromBackend);
    } catch (err: any) {
      console.warn('Error loading backend data for PassengerHomeView:', err);
      setFetchError('Using cached station data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedLineFilter]);

  const filteredStations = stationsList.filter((station) => {
    const matchesSearch =
      station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (station.marathiName && station.marathiName.includes(searchQuery));

    if (selectedLineFilter === 'WESTERN') {
      return matchesSearch && (station.lines.includes('WESTERN') || station.line === 'WESTERN');
    }
    if (selectedLineFilter === 'CENTRAL') {
      return matchesSearch && (station.lines.includes('CENTRAL') || station.line === 'CENTRAL');
    }
    if (selectedLineFilter === 'HARBOUR') {
      return matchesSearch && (station.lines.includes('HARBOUR') || station.line === 'HARBOUR');
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Hero Welcome Banner (Clean Utility, Minimal) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E5E0] shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#008080]/10 text-[#008080] border border-[#008080]/30 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#008080]" />
                <span>Smart Mumbai Suburban Crowd AI</span>
              </div>
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold",
                isBackendLive ? "bg-[#10B981]/10 text-[#059669] border border-[#10B981]/30" : "bg-[#F59E0B]/10 text-[#D97706] border border-[#F59E0B]/30"
              )}>
                <span className={cn("w-2 h-2 rounded-full", isBackendLive ? "bg-[#10B981] animate-pulse" : "bg-[#F59E0B]")} />
                {isBackendLive ? "Backend API Connected (Express /api)" : "Standby Mode"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight">
              Live Suburban Crowd Flow &amp; 15-Min Forecast
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
              Predictive platform crowd density, coach occupancy, and surge forecasts across Western &amp; Central suburban corridors before boarding.
            </p>
          </div>

          {/* Quick Search Box */}
          <div className="w-full lg:w-96 bg-[#F9F9F7] p-3.5 rounded-xl border border-[#E5E5E0] space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="home-quick-station-search" className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest block">
                Quick Station Search
              </label>
              {isLoading && <span className="text-[10px] text-[#008080] font-mono animate-pulse">Syncing...</span>}
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-[#9E9E9E] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="home-quick-station-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type Dadar, Andheri, CSMT, Borivali..."
                className="w-full pl-9 pr-3 py-2 bg-white text-xs sm:text-sm text-[#1A1A1A] rounded-lg border border-[#E5E5E0] focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10 outline-none placeholder-[#9E9E9E]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Featured Station Focus: Dadar Junction */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#008080]" />
            <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A]">Station Live Focus</h2>
          </div>
          <button
            onClick={() => onRouteChange(`/station/${selectedStation.id}`)}
            className="text-xs font-bold text-[#008080] hover:underline flex items-center gap-1"
          >
            <span>Full Platform Breakdown</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Spotlight Card */}
          <Card className="lg:col-span-2 border-[#E5E5E0] bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E0]">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-2xl font-black text-[#1A1A1A] tracking-tight">
                    {selectedStation.name}
                  </h3>
                  {selectedStation.marathiName && (
                    <span className="text-base text-[#9E9E9E] font-medium">
                      ({selectedStation.marathiName})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <StationBadge
                    line={selectedStation.line}
                    lines={selectedStation.lines}
                    isInterchange={selectedStation.isInterchange}
                  />
                  <span className="text-xs text-[#6B7280] font-mono">
                    {selectedStation.platformsCount} Platforms Active
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CrowdStatusBadge
                  status={selectedStation.crowdStatus}
                  occupancy={selectedStation.currentOccupancy}
                  size="lg"
                />
              </div>
            </div>

            {/* Occupancy and Prediction Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
              <div className="bg-[#F9F9F7] rounded-xl p-3 border border-[#E5E5E0]">
                <div className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-wider mb-1">Current Crowd</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-[#1A1A1A] font-mono">
                    {selectedStation.currentOccupancy}%
                  </span>
                  <span className="text-[11px] text-[#6B7280] font-medium">Occupancy</span>
                </div>
                <div className="mt-2">
                  <CapacityIndicator occupancy={selectedStation.currentOccupancy} size="sm" showLabels={false} />
                </div>
              </div>

              <div className="bg-[#F9F9F7] rounded-xl p-3 border border-[#E5E5E0]">
                <div className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-wider mb-1">
                  15-Min Prediction
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-[#1A1A1A] font-mono">
                    {selectedStation.predictedOccupancy}%
                  </span>
                  <span className="text-[11px] font-bold text-[#F97316]">
                    +{selectedStation.predictedOccupancy - selectedStation.currentOccupancy}% Surge
                  </span>
                </div>
                <div className="mt-2">
                  <CapacityIndicator occupancy={selectedStation.predictedOccupancy} size="sm" showLabels={false} />
                </div>
              </div>

              <div className="bg-[#F9F9F7] rounded-xl p-3 border border-[#E5E5E0]">
                <div className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-wider mb-1">Next Fast Local</div>
                <div className="text-lg font-bold text-[#1A1A1A] font-mono">
                  {selectedStation.nextTrain}
                </div>
                <div className="text-xs text-[#6B7280] font-medium truncate mt-0.5">
                  PF {selectedStation.platform} • {selectedStation.destination}
                </div>
              </div>
            </div>

            {/* AI Signal Readout Banner */}
            <div className="bg-[#F9F9F7] rounded-xl p-3 border border-[#E5E5E0] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#008080]" />
                <span className="text-[#6B7280] font-medium">
                  CCTV Vision AI Confidence: <strong className="text-[#1A1A1A]">{selectedStation.cctvSignalConfidence}%</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#008080]" />
                <span className="text-[#6B7280] font-medium">
                  Anonymous Device Density Index: <strong className="text-[#1A1A1A]">{selectedStation.deviceDensityIndex}/100</strong>
                </span>
              </div>
              <button
                onClick={() => onRouteChange('/methodology')}
                className="text-[11px] text-[#008080] hover:underline font-bold"
              >
                How AI works →
              </button>
            </div>
          </Card>

          {/* Quick Platform Overview Card */}
          <Card className="flex flex-col justify-between bg-white border-[#E5E5E0]">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E5E5E0]">
                <h4 className="font-bold text-[#1A1A1A] text-sm">Platform Occupancy</h4>
                <span className="text-[10px] font-mono uppercase text-[#9E9E9E]">Dadar Jn</span>
              </div>

              <div className="space-y-2">
                {(selectedStation.platforms || []).slice(0, 4).map((p) => (
                  <div
                    key={p.platformNumber}
                    className="flex items-center justify-between p-2 rounded-xl bg-[#F9F9F7] border border-[#E5E5E0] text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#1A1A1A] bg-white px-1.5 py-0.5 rounded border border-[#E5E5E0] text-[10px]">
                        PF {p.platformNumber}
                      </span>
                      <div className="truncate max-w-[110px]">
                        <span className="font-semibold text-[#1A1A1A] block truncate text-xs">
                          {p.nextTrainDestination}
                        </span>
                        <span className="text-[10px] text-[#9E9E9E] font-mono">
                          {p.nextTrainTime}
                        </span>
                      </div>
                    </div>
                    <CrowdStatusBadge status={p.currentCrowd} occupancy={p.occupancyPercentage} size="sm" />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onRouteChange(`/station/${selectedStation.id}`)}
              className="mt-3 w-full py-2 bg-[#1A1A1A] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <span>View All 8 Platforms</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Card>
        </div>
      </div>

      {/* Network Live Stations Explorer */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A]">Live Suburban Network</h2>
            <p className="text-xs text-[#9E9E9E]">
              Monitoring {filteredStations.length} key stations across Western &amp; Central suburban lines
            </p>
          </div>

          {/* Line Filter Tabs */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E5E5E0] text-xs font-bold">
            <button
              onClick={() => setSelectedLineFilter('ALL')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all',
                selectedLineFilter === 'ALL'
                  ? 'bg-[#1A1A1A] text-white shadow-xs'
                  : 'text-[#6B7280] hover:bg-[#F3F4F1]'
              )}
            >
              All Lines
            </button>
            <button
              onClick={() => setSelectedLineFilter('WESTERN')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5',
                selectedLineFilter === 'WESTERN'
                  ? 'bg-[#008080] text-white shadow-xs'
                  : 'text-[#008080] hover:bg-[#F3F4F1]'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#008080]" />
              <span>Western</span>
            </button>
            <button
              onClick={() => setSelectedLineFilter('CENTRAL')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5',
                selectedLineFilter === 'CENTRAL'
                  ? 'bg-[#F87171] text-white shadow-xs'
                  : 'text-[#F87171] hover:bg-[#F3F4F1]'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#F87171]" />
              <span>Central</span>
            </button>
            <button
              onClick={() => setSelectedLineFilter('HARBOUR')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5',
                selectedLineFilter === 'HARBOUR'
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'text-[#2563EB] hover:bg-[#F3F4F1]'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
              <span>Harbour</span>
            </button>
          </div>
        </div>

        {/* Station Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStations.slice(0, 9).map((station) => (
            <StationCard
              key={station.id}
              station={station}
              isSelected={station.id === selectedStation.id}
              onSelect={(stn) => {
                onSelectStation(stn);
                onRouteChange(`/station/${stn.id}`);
              }}
            />
          ))}
        </div>

        {filteredStations.length > 9 && (
          <div className="text-center pt-2">
            <button
              onClick={() => onRouteChange('/map')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-[#F3F4F1] text-[#1A1A1A] font-bold text-xs border border-[#E5E5E0] shadow-xs transition-colors"
            >
              <Compass className="w-4 h-4 text-[#008080]" />
              <span>Explore All {filteredStations.length} Stations on Interactive Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Live Trains in Transit */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrainIcon className="w-4 h-4 text-[#008080]" />
            <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A]">Active Locals in Transit</h2>
          </div>
          <span className="text-[11px] text-[#9E9E9E] font-mono">Live GPS Telemetry</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trainsList.map((train) => (
            <TrainCard key={train.id} train={train} />
          ))}
          {trainsList.length === 0 && !isLoading && (
            <div className="col-span-full py-8 text-center text-sm text-[#6B7280]">
              No active locals found matching the selected filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

