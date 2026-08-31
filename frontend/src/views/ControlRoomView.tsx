import React, { useState, useEffect } from 'react';
import { Station, Alert, CrowdStatus, NetworkOverviewStats } from '../types';
import { MOCK_STATIONS, MOCK_ALERTS, MOCK_NETWORK_STATS } from '../data/mockData';
import { ApiService } from '../services/api';
import { Card } from '../components/ui/Card';
import { CrowdStatusBadge } from '../components/ui/CrowdStatusBadge';
import { StationBadge } from '../components/ui/StationBadge';
import { AlertBadge } from '../components/ui/AlertBadge';
import {
  Activity,
  ShieldAlert,
  Train,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Search,
  Filter,
  ArrowUpRight,
  Radio,
  Clock,
  RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ControlRoomViewProps {
  selectedStation: Station;
  onSelectStation: (station: Station) => void;
  onRouteChange: (route: string) => void;
}

export const ControlRoomView: React.FC<ControlRoomViewProps> = ({
  selectedStation,
  onSelectStation,
  onRouteChange
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [lineFilter, setLineFilter] = useState<'ALL' | 'WESTERN' | 'CENTRAL' | 'SURGE'>('ALL');
  const [alertFilter, setAlertFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');
  
  // Real backend states
  const [stationsList, setStationsList] = useState<Station[]>(MOCK_STATIONS);
  const [networkStats, setNetworkStats] = useState<NetworkOverviewStats>(MOCK_NETWORK_STATS);
  const [alertsList, setAlertsList] = useState<Alert[]>(MOCK_ALERTS);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchOCCData = async () => {
    setIsSyncing(true);
    try {
      const [statsRes, stationsRes, alertsRes] = await Promise.all([
        ApiService.getNetworkOverview(),
        ApiService.getStations(),
        ApiService.getAlerts()
      ]);
      setNetworkStats(statsRes.stats);
      setStationsList(stationsRes.stations);
      setAlertsList(alertsRes.alerts);
      setIsBackendConnected(statsRes.isFromBackend || stationsRes.isFromBackend);
    } catch (err) {
      console.warn('Failed to load OCC data from backend:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchOCCData();
    const interval = setInterval(fetchOCCData, 15000); // 15s live polling
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledgeAlert = async (id: string) => {
    // Optimistic local update
    setAlertsList((prev) =>
      prev.map((a) => (a.id === id ? { ...a, resolved: true } : a))
    );
    // Real backend API call
    await ApiService.acknowledgeAlert(id);
  };

  const filteredStations = stationsList.filter((stn) => {
    const matchesSearch =
      stn.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (stn.marathiName && stn.marathiName.includes(searchFilter));
    const matchesLine =
      lineFilter === 'ALL'
        ? true
        : lineFilter === 'WESTERN'
        ? stn.lines.includes('WESTERN') || stn.line === 'WESTERN'
        : lineFilter === 'CENTRAL'
        ? stn.lines.includes('CENTRAL') || stn.line === 'CENTRAL'
        : stn.crowdStatus === 'CRITICAL' || stn.crowdStatus === 'HIGH';
    return matchesSearch && matchesLine;
  });

  const filteredAlerts = alertsList.filter((a) => {
    if (alertFilter === 'CRITICAL') return a.severity === 'critical';
    if (alertFilter === 'WARNING') return a.severity === 'warning';
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Control Room Header & Overall Network Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5E5E0] shadow-sm">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] animate-ping" />
            <h1 className="text-xl sm:text-2xl font-black text-[#1A1A1A] tracking-tight">
              Operations Control Center (OCC) Dashboard
            </h1>
            <span className={cn(
              "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full",
              isBackendConnected ? "bg-[#10B981]/10 text-[#059669] border border-[#10B981]/30" : "bg-[#F59E0B]/10 text-[#D97706] border border-[#F59E0B]/30"
            )}>
              {isBackendConnected ? "● Live REST Backend" : "○ Fallback Mode"}
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            Network-wide real-time crowd telemetry, 15-minute predictive surge alerts, and station triage.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#008080]/10 text-[#008080] border border-[#008080]/30 text-xs font-mono font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>{networkStats.lastSignalSync}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A1A1A] text-white text-xs font-mono font-bold">
            <Activity className="w-3.5 h-3.5 text-[#008080]" />
            <span>Health: {networkStats.systemHealth}</span>
          </div>
          <button
            onClick={fetchOCCData}
            title="Refresh from Backend"
            className="p-1.5 rounded-xl bg-[#F9F9F7] hover:bg-[#EBECE8] border border-[#E5E5E0] text-[#1A1A1A] transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4 text-[#6B7280]", isSyncing && "animate-spin text-[#008080]")} />
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards (Network Crowd, 15-Min Prediction & Station Breakdown) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monitored Stations */}
        <Card className="border-[#E5E5E0] bg-white space-y-1">
          <div className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-wider">
            Total Monitored Stations
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-[#1A1A1A]">
            {networkStats.totalStationsMonitored}
          </div>
          <div className="text-[11px] text-[#008080] font-bold">
            Western (21) + Central (24)
          </div>
        </Card>

        {/* Current Overall Crowd Level */}
        <Card className="border-[#E5E5E0] bg-white space-y-1">
          <div className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-wider">
            Current Network Crowd
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-[#1A1A1A]">
            {networkStats.averageOccupancy}%
          </div>
          <div className="text-[11px] text-[#D97706] font-bold">
            Peak Evening Ingress
          </div>
        </Card>

        {/* 15-Minute Predicted Crowd Level */}
        <Card className="border-[#008080]/30 bg-[#008080]/5 space-y-1">
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-[#008080] font-bold uppercase tracking-wider">
              15-Min Predicted Crowd
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#008080]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-[#008080]">
            78%
          </div>
          <div className="text-[11px] text-[#008080] font-bold">
            +7% Forecasted Network Rise
          </div>
        </Card>

        {/* Active Local Trains */}
        <Card className="border-[#E5E5E0] bg-white space-y-1">
          <div className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-wider">
            Active Suburban Trains
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-[#1A1A1A]">
            {networkStats.activeTrains}
          </div>
          <div className="text-[11px] text-[#6B7280]">
            12 &amp; 15-Car Rakes in Motion
          </div>
        </Card>
      </div>

      {/* 3. Station Status Counts Pill Breakdown (Normal / Moderate / High / Critical) */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E5E0] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
            Network Crowd Distribution Tally ({networkStats.totalStationsMonitored} Stations Monitored)
          </h3>
          <span className="text-[11px] text-[#9E9E9E] font-mono">Live Ingress Buckets</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Normal */}
          <div className="bg-[#10B981]/10 border border-[#10B981]/30 p-3 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase text-[#059669]">Normal (&lt;50%)</div>
              <div className="text-2xl font-black font-mono text-[#059669]">
                {networkStats.normalStationsCount}
              </div>
            </div>
            <span className="w-3 h-3 rounded-full bg-[#10B981]" />
          </div>

          {/* Moderate */}
          <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 p-3 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase text-[#D97706]">Moderate (50-70%)</div>
              <div className="text-2xl font-black font-mono text-[#D97706]">
                {networkStats.moderateStationsCount}
              </div>
            </div>
            <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
          </div>

          {/* High */}
          <div className="bg-[#F97316]/10 border border-[#F97316]/30 p-3 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase text-[#EA580C]">High (70-85%)</div>
              <div className="text-2xl font-black font-mono text-[#EA580C]">
                {networkStats.highCrowdStationsCount}
              </div>
            </div>
            <span className="w-3 h-3 rounded-full bg-[#F97316]" />
          </div>

          {/* Critical */}
          <div className="bg-[#E11D48]/10 border border-[#E11D48]/30 p-3 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase text-[#BE123C]">Critical (&gt;85%)</div>
              <div className="text-2xl font-black font-mono text-[#BE123C]">
                {networkStats.criticalStationsCount}
              </div>
            </div>
            <span className="w-3 h-3 rounded-full bg-[#E11D48] animate-ping" />
          </div>
        </div>
      </div>

      {/* 4. Live Operational Alerts Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
            <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A]">
              Live Crowd Surge Alerts &amp; Advisories
            </h2>
          </div>

          {/* Alert Filters */}
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <button
              onClick={() => setAlertFilter('ALL')}
              className={cn(
                'px-2.5 py-1 rounded-lg transition-all',
                alertFilter === 'ALL'
                  ? 'bg-[#1A1A1A] text-white shadow-xs'
                  : 'bg-white text-[#6B7280] border border-[#E5E5E0] hover:bg-[#F9F9F7]'
              )}
            >
              All ({alertsList.length})
            </button>
            <button
              onClick={() => setAlertFilter('CRITICAL')}
              className={cn(
                'px-2.5 py-1 rounded-lg transition-all',
                alertFilter === 'CRITICAL'
                  ? 'bg-[#E11D48] text-white shadow-xs'
                  : 'bg-white text-[#E11D48] border border-[#E11D48]/30 hover:bg-[#E11D48]/10'
              )}
            >
              Critical
            </button>
            <button
              onClick={() => setAlertFilter('WARNING')}
              className={cn(
                'px-2.5 py-1 rounded-lg transition-all',
                alertFilter === 'WARNING'
                  ? 'bg-[#F59E0B] text-white shadow-xs'
                  : 'bg-white text-[#D97706] border border-[#F59E0B]/30 hover:bg-[#F59E0B]/10'
              )}
            >
              Warning
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAlerts.map((alert) => (
            <Card
              key={alert.id}
              className={cn(
                'space-y-2.5 transition-all bg-white',
                alert.resolved
                  ? 'opacity-60 border-[#E5E5E0]'
                  : alert.severity === 'critical'
                  ? 'border-[#F87171]/50 bg-[#F87171]/5'
                  : 'border-[#E5E5E0]'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertBadge severity={alert.severity} size="sm" />
                  <span className="text-xs font-bold text-[#1A1A1A]">
                    {alert.stationName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#9E9E9E] font-mono">
                    {alert.timestamp}
                  </span>
                  {alert.resolved ? (
                    <span className="text-[10px] font-bold text-[#059669] bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/30">
                      Acknowledged
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      className="text-[10px] font-bold text-[#008080] hover:underline"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#1A1A1A] text-sm">{alert.title}</h4>
                <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
                  {alert.description}
                </p>
              </div>

              {alert.actionRecommended && (
                <div className="bg-[#F9F9F7] p-2.5 rounded-xl border border-[#E5E5E0] text-xs text-[#1A1A1A]">
                  <strong className="text-[#008080] font-bold">
                    Advisory Action:
                  </strong>{' '}
                  {alert.actionRecommended}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* 5. Critical Station Triage Table with Search & Filter */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A]">
              Station Crowd Triage Matrix
            </h2>
            <p className="text-xs text-[#6B7280]">
              Showing {filteredStations.length} of {MOCK_STATIONS.length} stations
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" />
              <input
                type="text"
                placeholder="Search station..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-[#E5E5E0] rounded-xl text-xs text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#008080]"
              />
            </div>

            {/* Line Filter Buttons */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E5E5E0] text-xs font-semibold">
              <button
                onClick={() => setLineFilter('ALL')}
                className={cn(
                  'px-2 py-0.5 rounded-lg transition-all',
                  lineFilter === 'ALL' ? 'bg-[#1A1A1A] text-white' : 'text-[#6B7280] hover:bg-[#F9F9F7]'
                )}
              >
                All
              </button>
              <button
                onClick={() => setLineFilter('WESTERN')}
                className={cn(
                  'px-2 py-0.5 rounded-lg transition-all',
                  lineFilter === 'WESTERN' ? 'bg-[#008080] text-white' : 'text-[#6B7280] hover:bg-[#F9F9F7]'
                )}
              >
                Western
              </button>
              <button
                onClick={() => setLineFilter('CENTRAL')}
                className={cn(
                  'px-2 py-0.5 rounded-lg transition-all',
                  lineFilter === 'CENTRAL' ? 'bg-[#E11D48] text-white' : 'text-[#6B7280] hover:bg-[#F9F9F7]'
                )}
              >
                Central
              </button>
              <button
                onClick={() => setLineFilter('SURGE')}
                className={cn(
                  'px-2 py-0.5 rounded-lg transition-all',
                  lineFilter === 'SURGE' ? 'bg-[#F97316] text-white' : 'text-[#6B7280] hover:bg-[#F9F9F7]'
                )}
              >
                Surge
              </button>
            </div>

            <button
              onClick={() => onRouteChange('/map')}
              className="text-xs font-bold text-[#008080] hover:underline flex items-center gap-1 ml-2"
            >
              <span>Map View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <Card className="p-0 overflow-hidden border-[#E5E5E0] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9F7] border-b border-[#E5E5E0] text-[#9E9E9E] uppercase tracking-wider font-mono text-[10px]">
                <tr>
                  <th className="p-3">Station Name</th>
                  <th className="p-3">Line</th>
                  <th className="p-3">Live Crowd</th>
                  <th className="p-3">15m Forecast</th>
                  <th className="p-3">Shift (+15m)</th>
                  <th className="p-3">CCTV Conf</th>
                  <th className="p-3">Device Idx</th>
                  <th className="p-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E0] font-medium">
                {filteredStations.slice(0, 10).map((stn) => {
                  const shift = stn.predictedOccupancy - stn.currentOccupancy;
                  return (
                    <tr key={stn.id} className="hover:bg-[#F3F4F1] transition-colors">
                      <td className="p-3 font-bold text-[#1A1A1A]">
                        {stn.name}
                        {stn.isInterchange && (
                          <span className="ml-1.5 text-[10px] bg-[#008080]/10 text-[#008080] border border-[#008080]/30 px-1.5 py-0.2 rounded font-mono font-normal">
                            Interchange
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <StationBadge line={stn.line} size="sm" />
                      </td>
                      <td className="p-3">
                        <CrowdStatusBadge status={stn.crowdStatus} occupancy={stn.currentOccupancy} size="sm" />
                      </td>
                      <td className="p-3 font-mono font-bold text-[#1A1A1A]">
                        {stn.predictedOccupancy}%
                      </td>
                      <td className="p-3 font-mono">
                        <span className={cn(
                          'text-[11px] font-bold',
                          shift > 0 ? 'text-[#F97316]' : 'text-[#008080]'
                        )}>
                          {shift > 0 ? `+${shift}%` : `${shift}%`}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[#6B7280]">
                        {stn.cctvSignalConfidence}%
                      </td>
                      <td className="p-3 font-mono text-[#6B7280]">
                        {stn.deviceDensityIndex}/100
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            onSelectStation(stn);
                            onRouteChange(`/station/${stn.id}`);
                          }}
                          className="px-2.5 py-1 bg-[#F9F9F7] hover:bg-[#008080]/10 hover:text-[#008080] text-[#1A1A1A] border border-[#E5E5E0] rounded-lg text-[11px] font-bold transition-colors"
                        >
                          Analyze →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};


