import React from 'react';
import { AlertSeverity } from '../../types';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AlertBadgeProps {
  severity: AlertSeverity;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const AlertBadge: React.FC<AlertBadgeProps> = ({
  severity,
  showIcon = true,
  size = 'md',
  className
}) => {
  const config = {
    critical: {
      label: 'Critical Alert',
      icon: AlertCircle,
      classes: 'bg-red-50 text-[#EF4444] border-red-200'
    },
    warning: {
      label: 'Warning',
      icon: AlertTriangle,
      classes: 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
    },
    info: {
      label: 'Notice',
      icon: Info,
      classes: 'bg-[#008080]/10 text-[#008080] border-[#008080]/30'
    }
  };

  const current = config[severity] || config.info;
  const Icon = current.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center font-bold uppercase rounded border shadow-2xs whitespace-nowrap tracking-wider',
        current.classes,
        size === 'sm' ? 'text-[10px] px-2 py-0.5 gap-1' : 'text-[11px] px-2.5 py-1 gap-1.5',
        className
      )}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      <span>{current.label}</span>
    </span>
  );
};

