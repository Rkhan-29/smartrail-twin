import React, { useState, useEffect, useRef } from 'react';
import { UserRole } from '../../types';
import { MOCK_STATIONS } from '../../data/mockData';
import { Train, ShieldAlert, Clock, Search, Activity, User, Radio, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeRoute: string;
  onRouteChange: (route: string) => void;
  onSearchClick?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  criticalAlertsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  onRouteChange,
  searchQuery = '',
  onSearchChange,
  criticalAlertsCount = 2
}) => {
  const [time, setTime] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter matching stations for search dropdown
  const matchingStations = searchQuery.trim().length > 0
    ? MOCK_STATIONS.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.marathiName && s.marathiName.includes(searchQuery)) ||
        s.line.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  const handleSelectSearchResult = (stationId: string) => {
    onRouteChange(`/station/${stationId}`);
    setIsSearchOpen(false);
    onSearchChange?.('');
  };

  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-40 bg-white border-b border-[#E5E5E0] px-4 sm:px-6 py-2.5 transition-all"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand Identity matching Stitch design */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onRouteChange(currentRole === 'passenger' ? '/home' : '/control-room')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
            id="brand-logo-button"
          >
            <div className="w-8 h-8 rounded-lg bg-[#008080] text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <Train className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm leading-tight text-[#008080]">
                  Smartrail Twin
                </span>
              </div>
              <p className="text-[10px] text-[#9E9E9E] font-medium leading-none hidden sm:block">
                Mumbai Suburban Crowd System
              </p>
            </div>
          </button>

          {/* Quick Line Status Indicators */}
          <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-[#E5E5E0]">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#008080]/10 border border-[#008080]/30 text-[11px] font-bold text-[#008080]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#008080] animate-pulse" />
              <span>WR: Normal Flow</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F87171]/10 border border-[#F87171]/30 text-[11px] font-bold text-[#F87171]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F87171] animate-pulse" />
              <span>CR: Peak Congestion</span>
            </div>
          </div>
        </div>

        {/* Center: Search Field */}
        <div className="flex-1 max-w-md mx-2 hidden md:block relative">
          <div className="relative">
            <Search className="w-4 h-4 text-[#9E9E9E] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="header-station-search-input"
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => {
                onSearchChange?.(e.target.value);
                setIsSearchOpen(true);
              }}
              placeholder="Search station (e.g. Dadar, Andheri, CSMT, Borivali)..."
              className="w-full pl-9.5 pr-4 py-1.5 bg-[#F3F4F1] hover:bg-[#EBECE8] focus:bg-white text-xs sm:text-sm text-[#1A1A1A] placeholder-[#9E9E9E] rounded-full border border-[#E5E5E0] focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10 transition-all outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  onSearchChange?.('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9E9E9E] hover:text-[#1A1A1A]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Search Dropdown */}
          {isSearchOpen && matchingStations.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-[#E5E5E0] shadow-xl overflow-hidden z-50 divide-y divide-[#E5E5E0]">
              <div className="p-2 bg-[#F9F9F7] text-[10px] uppercase font-bold text-[#9E9E9E] flex items-center justify-between">
                <span>Matching Stations ({matchingStations.length})</span>
                <span className="font-mono">Select to View Details</span>
              </div>
              {matchingStations.map((station) => (
                <button
                  key={station.id}
                  onClick={() => handleSelectSearchResult(station.id)}
                  className="w-full p-2.5 flex items-center justify-between hover:bg-[#F3F4F1] transition-colors text-left group"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      station.currentOccupancy >= 85 ? 'bg-[#EF4444]' : station.currentOccupancy >= 70 ? 'bg-[#F97316]' : station.currentOccupancy >= 50 ? 'bg-[#F59E0B]' : 'bg-[#10B981]'
                    )} />
                    <div>
                      <div className="text-xs font-bold text-[#1A1A1A] group-hover:text-[#008080]">
                        {station.name} {station.marathiName && <span className="text-[10px] text-[#9E9E9E]">({station.marathiName})</span>}
                      </div>
                      <div className="text-[10px] text-[#6B7280]">
                        {station.line} Line • PF {station.platform} • Next: {station.nextTrain}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-xs font-mono font-bold px-2 py-0.5 rounded',
                      station.currentOccupancy >= 85 ? 'bg-[#EF4444]/10 text-[#EF4444]' : station.currentOccupancy >= 70 ? 'bg-[#F97316]/10 text-[#F97316]' : 'bg-[#10B981]/10 text-[#10B981]'
                    )}>
                      {station.currentOccupancy}%
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#9E9E9E] group-hover:text-[#008080] transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Live Time, Alerts Pill, & Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Sync Clock */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#F9F9F7] border border-[#E5E5E0] px-2.5 py-1 rounded-lg text-xs font-mono text-[#1A1A1A]">
            <Clock className="w-3.5 h-3.5 text-[#008080]" />
            <span className="font-semibold">{time || '08:42:00 PM'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#008080] animate-ping" />
          </div>

          {/* Active Alerts Button */}
          <button
            onClick={() => onRouteChange('/control-room')}
            id="header-alerts-button"
            className="relative flex items-center gap-1.5 bg-white border border-[#E5E5E0] hover:border-[#EF4444] text-[#1A1A1A] px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
            title={`${criticalAlertsCount} active crowd surge alerts`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-[#EF4444]" />
            <span className="hidden sm:inline font-bold text-[11px] text-[#1A1A1A]">Alerts</span>
            <span className="bg-[#EF4444] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {criticalAlertsCount}
            </span>
          </button>

          {/* Role Mode Switcher (Passenger vs Control Room) */}
          <div className="bg-[#F3F4F1] p-0.5 rounded-xl border border-[#E5E5E0] flex items-center">
            <button
              id="role-passenger-toggle"
              onClick={() => {
                onRoleChange('passenger');
                onRouteChange('/home');
              }}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all',
                currentRole === 'passenger'
                  ? 'bg-white text-[#008080] shadow-xs'
                  : 'text-[#6B7280] hover:text-[#1A1A1A]'
              )}
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Passenger</span>
            </button>
            <button
              id="role-controlroom-toggle"
              onClick={() => {
                onRoleChange('control_room');
                onRouteChange('/control-room');
              }}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all',
                currentRole === 'control_room'
                  ? 'bg-[#1A1A1A] text-white shadow-xs'
                  : 'text-[#6B7280] hover:text-[#1A1A1A]'
              )}
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">OCC Console</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

