import React from 'react';
import { UserRole } from '../../types';
import { LayoutDashboard, Compass, MapPin, TrendingUp, Sliders } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MobileBottomNavProps {
  currentRole: UserRole;
  activeRoute: string;
  onRouteChange: (route: string) => void;
  selectedStationId?: string;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentRole,
  activeRoute,
  onRouteChange,
  selectedStationId = 'dadar'
}) => {
  const navItems = [
    { label: 'Overview', route: '/home', icon: LayoutDashboard },
    { label: 'Map', route: '/map', icon: Compass },
    { label: 'Platform', route: `/station/${selectedStationId}`, icon: MapPin },
    { label: 'Forecast', route: '/predictions', icon: TrendingUp },
    { label: 'OCC', route: '/control-room', icon: Sliders }
  ];

  return (
    <nav
      id="mobile-bottom-navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#E5E5E0] px-2 py-1.5 shadow-lg flex items-center justify-around"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          activeRoute === item.route ||
          (item.route.startsWith('/station') && activeRoute.startsWith('/station'));

        return (
          <button
            key={item.label}
            id={`mobile-nav-${item.label.toLowerCase()}`}
            onClick={() => onRouteChange(item.route)}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium transition-all min-w-[56px]',
              isActive
                ? 'text-[#008080] font-bold bg-[#F3F4F1]'
                : 'text-[#6B7280] hover:text-[#1A1A1A]'
            )}
          >
            <Icon className={cn('w-4 h-4 mb-0.5', isActive ? 'text-[#008080]' : 'text-[#9E9E9E]')} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

