import React from 'react';
import { Train } from '../../types';
import { Card } from './Card';
import { CrowdStatusBadge } from './CrowdStatusBadge';
import { StationBadge } from './StationBadge';
import { TrainStatusBadge } from './TrainStatusBadge';
import { Train as TrainIcon, Navigation, Clock, Gauge } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TrainCardProps {
  train: Train;
  onClick?: (train: Train) => void;
  className?: string;
}

export const TrainCard: React.FC<TrainCardProps> = ({
  train,
  onClick,
  className
}) => {
  return (
    <Card
      variant="default"
      hoverEffect
      id={`train-card-${train.id}`}
      onClick={() => onClick?.(train)}
      className={cn('group cursor-pointer transition-all duration-200 hover:border-[#008080]', className)}
    >
      {/* Header: Train Number, Line, Status */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-[#1A1A1A] text-xs bg-[#F3F4F1] px-2 py-0.5 rounded border border-[#E5E5E0]">
              #{train.trainNumber}
            </span>
            <h4 className="font-bold text-[#1A1A1A] text-sm group-hover:text-[#008080] transition-colors">
              {train.trainName}
            </h4>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <StationBadge line={train.line} size="sm" />
            <TrainStatusBadge
              delayStatus={train.delayStatus}
              delayMinutes={train.delayMinutes}
              isFast={train.isFast}
              acLocal={train.acLocal}
              size="sm"
            />
          </div>
        </div>

        <CrowdStatusBadge
          status={train.crowdLevel}
          occupancy={train.occupancyPercentage}
          size="sm"
        />
      </div>

      {/* Route Journey Strip */}
      <div className="bg-[#F9F9F7] rounded-xl p-3 my-2 border border-[#E5E5E0]">
        <div className="flex items-center justify-between text-xs text-[#1A1A1A] font-semibold mb-2">
          <span className="truncate max-w-[120px]">{train.source}</span>
          <div className="flex-1 mx-3 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#9E9E9E]" />
            <div className="flex-1 h-0.5 bg-[#E5E5E0] relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#008080] ring-2 ring-white" />
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]" />
          </div>
          <span className="truncate max-w-[120px] text-right">{train.destination}</span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
          <div className="flex items-center gap-1">
            <Navigation className="w-3 h-3 text-[#008080]" />
            <span>At: <strong className="text-[#1A1A1A]">{train.currentStation}</strong></span>
          </div>
          <div className="flex items-center gap-1">
            <span>Next: <strong className="text-[#1A1A1A]">{train.nextStation}</strong></span>
          </div>
        </div>
      </div>

      {/* Footer Info: Platform, Speed, Coaches, ETA */}
      <div className="flex items-center justify-between pt-2.5 text-xs text-[#6B7280] border-t border-[#E5E5E0]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-medium text-[#1A1A1A]">
            <TrainIcon className="w-3.5 h-3.5 text-[#9E9E9E]" />
            <span>PF {train.platform}</span>
          </span>
          <span className="flex items-center gap-1 text-[#9E9E9E] font-mono text-[11px]">
            <Gauge className="w-3 h-3 text-[#9E9E9E]" />
            <span>{train.speedKmH} km/h</span>
          </span>
          <span className="text-[11px] text-[#9E9E9E] font-mono">
            {train.coaches} Car
          </span>
        </div>

        <div className="flex items-center gap-1 font-mono font-bold text-[#1A1A1A]">
          <Clock className="w-3.5 h-3.5 text-[#008080]" />
          <span>ETA {train.eta}</span>
        </div>
      </div>
    </Card>
  );
};

