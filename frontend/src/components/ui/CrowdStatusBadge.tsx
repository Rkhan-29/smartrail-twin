import React from 'react';
import { CrowdStatus } from '../../types';
import { cn } from '../../lib/utils';

interface CrowdStatusBadgeProps {
  status: CrowdStatus;
  occupancy?: number;
  showDot?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CrowdStatusBadge: React.FC<CrowdStatusBadgeProps> = ({
  status,
  occupancy,
  showDot = true,
  size = 'md',
  className
}) => {
  const config = {
    LOW: {
      label: 'Low Crowd',
      bg: 'bg-emerald-50 text-[#059669] border-emerald-200',
      dot: 'bg-[#059669]',
      bar: 'bg-[#059669]'
    },
    MEDIUM: {
      label: 'Medium Traffic',
      bg: 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]',
      dot: 'bg-[#D97706]',
      bar: 'bg-amber-400'
    },
    HIGH: {
      label: 'High Crowd',
      bg: 'bg-orange-50 text-[#F97316] border-orange-200',
      dot: 'bg-[#F97316]',
      bar: 'bg-orange-500'
    },
    CRITICAL: {
      label: 'Critical Surge',
      bg: 'bg-rose-50 text-[#EF4444] border-rose-200',
      dot: 'bg-[#EF4444] animate-pulse',
      bar: 'bg-rose-600'
    }
  };

  const current = config[status] || config.MEDIUM;

  const sizeClasses = {
    sm: 'text-[11px] px-2.5 py-0.5 gap-1.5 font-bold uppercase tracking-wider',
    md: 'text-xs px-3 py-1 gap-2 font-bold uppercase tracking-wide',
    lg: 'text-xs sm:text-sm px-4 py-1.5 gap-2.5 font-bold uppercase tracking-wide'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border shadow-2xs whitespace-nowrap transition-colors',
        current.bg,
        sizeClasses[size],
        className
      )}
    >
      {showDot && (
        <span className={cn('rounded-full shrink-0', current.dot, size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
      )}
      <span>{current.label}</span>
      {occupancy !== undefined && (
        <span className="opacity-90 font-mono text-[11px] ml-0.5">
          ({occupancy}%)
        </span>
      )}
    </span>
  );
};

