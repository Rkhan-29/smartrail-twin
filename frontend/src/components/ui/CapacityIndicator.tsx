import React from 'react';
import { CrowdStatus } from '../../types';
import { cn } from '../../lib/utils';

interface CapacityIndicatorProps {
  occupancy: number; // 0 to 100
  predictedOccupancy?: number;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CapacityIndicator: React.FC<CapacityIndicatorProps> = ({
  occupancy,
  predictedOccupancy,
  showLabels = true,
  size = 'md',
  className
}) => {
  const getCrowdColor = (val: number): { bar: string; text: string; status: CrowdStatus } => {
    if (val < 50) return { bar: 'bg-[#059669]', text: 'text-[#059669]', status: 'LOW' };
    if (val < 75) return { bar: 'bg-amber-400', text: 'text-[#D97706]', status: 'MEDIUM' };
    if (val < 90) return { bar: 'bg-orange-500', text: 'text-[#F97316]', status: 'HIGH' };
    return { bar: 'bg-red-500', text: 'text-[#EF4444]', status: 'CRITICAL' };
  };

  const currentConfig = getCrowdColor(occupancy);
  const clampedVal = Math.min(100, Math.max(0, occupancy));

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#6B7280] font-medium flex items-center gap-1.5">
            <span>Capacity</span>
            <span className={cn('font-bold font-mono', currentConfig.text)}>
              {clampedVal}%
            </span>
          </span>
          {predictedOccupancy !== undefined && (
            <span className="text-[11px] text-[#9E9E9E] font-mono flex items-center gap-1">
              <span>Pred. 15m:</span>
              <span className={cn('font-bold', getCrowdColor(predictedOccupancy).text)}>
                {predictedOccupancy}%
              </span>
            </span>
          )}
        </div>
      )}

      {/* Progress Bar with background track */}
      <div className={cn('w-full bg-[#F3F4F1] rounded-full overflow-hidden relative border border-[#E5E5E0]/60', heightClasses[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', currentConfig.bar)}
          style={{ width: `${clampedVal}%` }}
        />
        
        {/* Optional predicted marker pointer */}
        {predictedOccupancy !== undefined && (
          <div
            className="absolute top-0 bottom-0 w-1 bg-[#1A1A1A] rounded-full shadow-xs -ml-0.5"
            style={{ left: `${Math.min(100, Math.max(0, predictedOccupancy))}%` }}
            title={`Predicted occupancy: ${predictedOccupancy}%`}
          />
        )}
      </div>

      {/* Scale guide dots for md/lg */}
      {size !== 'sm' && (
        <div className="flex justify-between text-[10px] text-[#9E9E9E] font-mono px-0.5">
          <span>0%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      )}
    </div>
  );
};

