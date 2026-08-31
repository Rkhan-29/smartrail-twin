import React from 'react';
import { UserRole } from '../../types';
import {
  Home,
  MapPin,
  Compass,
  TrendingUp,
  ShieldAlert,
  BookOpen,
  LogIn,
  Sliders,
  Radio,
  Train,
  Sparkles,
  Layers,
  LayoutDashboard
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavItem {
  label: string;
  route: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  alertCount?: number;
}

interface SidebarProps {
  currentRole: UserRole;
  activeRoute: string;
  onRouteChange: (route: string) => void;
  selectedStationId?: string;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  activeRoute,
  onRouteChange,
  selectedStationId = 'dadar',
  className
}) => {
  const passengerNavItems: NavItem[] = [
    { label: 'Station Overview', route: '/home', icon: LayoutDashboard },
    { label: 'Network Map', route: '/map', icon: Compass },
    { label: `Platform Details`, route: `/station/${selectedStationId}`, icon: MapPin },
    { label: '15-Min Forecast', route: '/predictions', icon: TrendingUp }
  ];

  const controlRoomNavItems: NavItem[] = [
    { label: 'OCC Operations', route: '/control-room', icon: Sliders, badge: 'Live' },
    { label: 'Live Crowd Map', route: '/map', icon: Compass },
    { label: 'Surge Dispatcher', route: '/control-room', icon: ShieldAlert, alertCount: 3 },
    { label: 'AI Forecasting', route: '/predictions', icon: TrendingUp }
  ];

  const systemNavItems: NavItem[] = [
    { label: 'Methodology & AI Signals', route: '/methodology', icon: BookOpen },
    { label: 'Demo Role Switcher', route: '/login', icon: LogIn }
  ];

  const currentNav = currentRole === 'passenger' ? passengerNavItems : controlRoomNavItems;

  return (
    <aside
      id="app-desktop-sidebar"
      className={cn(
        'w-64 bg-white border-r border-[#E5E5E0] p-4 flex flex-col justify-between shrink-0 min-h-[calc(100vh-61px)] select-none',
        className
      )}
    >
      <div className="space-y-6">
        {/* Role Mode Tag & Switcher */}
        <div className="bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl p-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[#9E9E9E] font-medium text-[11px]">ACTIVE ROLE</span>
            <span
              className={cn(
                'font-bold px-2 py-0.5 rounded text-[10px] tracking-wider uppercase font-mono',
                currentRole === 'passenger'
                  ? 'bg-[#008080]/10 text-[#008080] border border-[#008080]/30'
                  : 'bg-[#1A1A1A] text-white'
              )}
            >
              {currentRole === 'passenger' ? 'Passenger' : 'Control Room'}
            </span>
          </div>
          <p className="text-xs font-semibold text-[#1A1A1A]">
            {currentRole === 'passenger'
              ? 'Live Suburban Commuter Guide'
              : 'Station Operations Console'}
          </p>
        </div>

        {/* Primary Monitoring Navigation */}
        <div className="space-y-1">
          <p className="text-[10px] tracking-widest text-[#9E9E9E] font-bold px-3 uppercase mb-1.5">
            {currentRole === 'passenger' ? 'Live Monitoring' : 'Operations Command'}
          </p>
          {currentNav.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeRoute === item.route ||
              (item.route.startsWith('/station') && activeRoute.startsWith('/station'));

            return (
              <button
                key={item.label}
                id={`sidebar-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => onRouteChange(item.route)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group text-left',
                  isActive
                    ? 'bg-[#F3F4F1] text-[#008080] font-bold'
                    : 'text-[#6B7280] hover:bg-[#F3F4F1] hover:text-[#1A1A1A]'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-colors',
                      isActive ? 'text-[#008080]' : 'text-[#9E9E9E] group-hover:text-[#1A1A1A]'
                    )}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 bg-[#008080]/10 text-[#008080] rounded">
                    {item.badge}
                  </span>
                )}

                {item.alertCount && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#EF4444] text-white rounded-full">
                    {item.alertCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* System & Architecture */}
        <div className="space-y-1 pt-2 border-t border-[#E5E5E0]">
          <p className="text-[10px] tracking-widest text-[#9E9E9E] font-bold px-3 uppercase mb-1.5">
            System &amp; Verification
          </p>
          {systemNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeRoute === item.route;

            return (
              <button
                key={item.label}
                id={`sidebar-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => onRouteChange(item.route)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left',
                  isActive
                    ? 'bg-[#F3F4F1] text-[#008080] font-bold'
                    : 'text-[#6B7280] hover:bg-[#F3F4F1] hover:text-[#1A1A1A]'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-[#008080]' : 'text-[#9E9E9E]')} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom System Status Widget matching reference */}
      <div className="bg-[#F9F9F7] p-3.5 rounded-xl border border-[#E5E5E0] space-y-2 mt-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#1A1A1A]">System Status</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#008080] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#008080]"></span>
          </span>
        </div>
        <p className="text-[10px] text-[#6B7280] leading-relaxed">
          AI Vision &amp; Device Density active across 128 stations
        </p>
        <div className="pt-1 flex items-center justify-between text-[9px] text-[#9E9E9E] font-mono border-t border-[#E5E5E0]/60">
          <span>Mumbai Suburban</span>
          <span>SIH 2026</span>
        </div>
      </div>
    </aside>
  );
};

