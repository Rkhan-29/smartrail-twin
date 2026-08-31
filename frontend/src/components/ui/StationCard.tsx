import React from 'react';
import { Station } from '../../types';
import { Card } from './Card';
import { CrowdStatusBadge } from './CrowdStatusBadge';
import { StationBadge } from './StationBadge';
import { CapacityIndicator } from './CapacityIndicator';
import { Clock, Train as TrainIcon, ArrowRight, ShieldCheck, Radio } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StationCardProps {
  station: Station;
  isSelected?: boolean;
  onSelect?: (station: Station) => void;
  className?: string;
}

export const StationCard: React.FC<StationCardProps> = ({
  station,
  isSelected = false,
  onSelect,
  className
}) => {
  return (
    <Card
      variant="default"
      hoverEffect
      id={`station-card-${station.id}`}
      onClick={() => onSelect?.(station)}
      className={cn(
        'group cursor-pointer transition-all duration-200 relative overflow-hidden',
        isSelected ? 'ring-2 ring-[#008080] border-[#008080] bg-[#008080]/5' : 'hover:border-[#008080]',
        className
      )}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-[#1A1A1A] text-base group-hover:text-[#008080] transition-colors">
              {station.name}
            </h3>
            {station.marathiName && (
              <span className="text-xs text-[#9E9E9E] font-normal">
                ({station.marathiName})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StationBadge
              line={station.line}
              lines={station.lines}
              isInterchange={station.isInterchange}
              size="sm"
            />
            <span className="text-[11px] text-[#9E9E9E] font-mono">
              PF 1–{station.platformsCount}
            </span>
          </div>
        </div>

        <CrowdStatusBadge
          status={station.crowdStatus}
          occupancy={station.currentOccupancy}
          size="sm"
        />
      </div>

      {/* Capacity Indicator Progress */}
      <div className="my-3 py-1">
        <CapacityIndicator
          occupancy={station.currentOccupancy}
          predictedOccupancy={station.predictedOccupancy}
          size="sm"
        />
      </div>

      {/* Next Train & Platform Details */}
      <div className="grid grid-cols-2 gap-2 bg-[#F9F9F7] rounded-xl p-2.5 border border-[#E5E5E0] text-xs">
        <div className="space-y-0.5">
          <div className="text-[10px] text-[#9E9E9E] uppercase tracking-wider flex items-center gap-1 font-bold">
            <TrainIcon className="w-3 h-3 text-[#9E9E9E]" />
            <span>Next Local</span>
          </div>
          <div className="font-semibold text-[#1A1A1A] truncate text-xs" title={station.destination}>
            {station.destination}
          </div>
        </div>

        <div className="space-y-0.5 text-right">
          <div className="text-[10px] text-[#9E9E9E] uppercase tracking-wider flex items-center justify-end gap-1 font-bold">
            <Clock className="w-3 h-3 text-[#9E9E9E]" />
            <span>PF {station.platform}</span>
          </div>
          <div className="font-mono font-bold text-[#1A1A1A] flex items-center justify-end gap-1 text-xs">
            <span>{station.nextTrain}</span>
            <span
              className={cn(
                'text-[9px] px-1 py-0.2 rounded font-bold uppercase tracking-wider',
                station.delayStatus === 'On Time'
                  ? 'text-[#059669] bg-emerald-50'
                  : 'text-[#D97706] bg-[#FEF3C7]'
              )}
            >
              {station.delayStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Footer / AI Signal indicators */}
      <div className="mt-3 pt-2.5 border-t border-[#E5E5E0] flex items-center justify-between text-[11px] text-[#6B7280]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[#1A1A1A]" title="CCTV Optical Density Confidence">
            <ShieldCheck className="w-3.5 h-3.5 text-[#008080]" />
            <span className="font-mono text-[10px]">{station.cctvSignalConfidence}% AI</span>
          </span>
          <span className="flex items-center gap-1 text-[#9E9E9E]" title="Experimental Anonymous Device-Density Signal">
            <Radio className="w-3 h-3 text-[#9E9E9E]" />
            <span className="font-mono text-[10px]">Idx {station.deviceDensityIndex}</span>
          </span>
        </div>

        <div className="flex items-center gap-1 text-[#008080] font-bold text-xs group-hover:translate-x-0.5 transition-transform">
          <span>Platform Live</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </Card>
  );
};

