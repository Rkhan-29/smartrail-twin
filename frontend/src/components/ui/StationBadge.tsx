import React from 'react';
import { RailwayLine } from '../../types';
import { cn } from '../../lib/utils';

interface StationBadgeProps {
  line: RailwayLine;
  lines?: RailwayLine[];
  isInterchange?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const StationBadge: React.FC<StationBadgeProps> = ({
  line,
  lines,
  isInterchange,
  size = 'md',
  className
}) => {
  const isDual = isInterchange || (lines && lines.length > 1) || line === 'INTERCHANGE';

  if (isDual) {
    return (
      <div className={cn('inline-flex items-center gap-1.5 flex-wrap', className)}>
        <span
          className={cn(
            'inline-flex items-center font-bold uppercase rounded border tracking-wider',
            'bg-[#F87171]/10 text-[#F87171] border-[#F87171]/30',
            size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-3 py-1'
          )}
        >
          CENTRAL
        </span>
        <span
          className={cn(
            'inline-flex items-center font-bold uppercase rounded border tracking-wider',
            'bg-[#008080]/10 text-[#008080] border-[#008080]/30',
            size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-3 py-1'
          )}
        >
          WESTERN
        </span>
      </div>
    );
  }

  const lineStyles = {
    CENTRAL: {
      label: 'CENTRAL',
      className: 'bg-[#F87171]/10 text-[#F87171] border-[#F87171]/30'
    },
    WESTERN: {
      label: 'WESTERN',
      className: 'bg-[#008080]/10 text-[#008080] border-[#008080]/30'
    },
    HARBOUR: {
      label: 'HARBOUR',
      className: 'bg-blue-500/10 text-blue-600 border-blue-500/30'
    },
    INTERCHANGE: {
      label: 'INTERCHANGE',
      className: 'bg-amber-500/10 text-amber-700 border-amber-500/30'
    }
  };

  const current = lineStyles[line] || lineStyles.WESTERN;

  return (
    <span
      className={cn(
        'inline-flex items-center font-bold uppercase rounded border tracking-wider whitespace-nowrap',
        current.className,
        size === 'sm' ? 'text-[10px] px-2.5 py-0.5' : 'text-[11px] px-3 py-1',
        className
      )}
    >
      {current.label}
    </span>
  );
};

