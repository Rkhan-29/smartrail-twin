import React from 'react';
import { DelayStatus } from '../../types';
import { cn } from '../../lib/utils';

interface TrainStatusBadgeProps {
  delayStatus: DelayStatus;
  delayMinutes?: number;
  isFast?: boolean;
  acLocal?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const TrainStatusBadge: React.FC<TrainStatusBadgeProps> = ({
  delayStatus,
  delayMinutes = 0,
  isFast,
  acLocal,
  size = 'md',
  className
}) => {
  const isDelayed = delayStatus === 'Delayed' || delayMinutes > 0;

  return (
    <div className={cn('inline-flex items-center gap-1.5 flex-wrap', className)}>
      {/* Speed / Type Tag */}
      {isFast !== undefined && (
        <span
          className={cn(
            'inline-flex items-center font-bold uppercase rounded px-1.5 py-0.5 text-[10px] tracking-wider border',
            isFast
              ? 'bg-[#F87171]/10 text-[#F87171] border-[#F87171]/30'
              : 'bg-[#F3F4F1] text-[#6B7280] border-[#E5E5E0]'
          )}
        >
          {isFast ? 'Fast' : 'Slow'}
        </span>
      )}

      {/* AC Local Tag */}
      {acLocal && (
        <span className="inline-flex items-center font-bold uppercase rounded px-1.5 py-0.5 text-[10px] bg-[#008080]/10 text-[#008080] border border-[#008080]/30 tracking-wider">
          AC
        </span>
      )}

      {/* Delay Status Pill */}
      <span
        className={cn(
          'inline-flex items-center rounded font-semibold border shadow-2xs whitespace-nowrap',
          isDelayed
            ? 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
            : 'bg-emerald-50 text-[#059669] border-emerald-200',
          size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
        )}
      >
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full mr-1.5',
            isDelayed ? 'bg-[#D97706]' : 'bg-[#059669]'
          )}
        />
        {isDelayed ? `Delayed ${delayMinutes || 8}m` : 'On Time'}
      </span>
    </div>
  );
};

