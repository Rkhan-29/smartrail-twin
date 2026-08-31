import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'interactive' | 'utility';
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  hoverEffect = false,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-white border border-[#E5E5E0] shadow-sm',
    elevated: 'bg-white border border-[#E5E5E0] shadow-sm',
    bordered: 'bg-white border border-[#E5E5E0]',
    interactive: 'bg-white border border-[#E5E5E0] hover:border-[#008080] hover:shadow-md cursor-pointer transition-all duration-200',
    utility: 'bg-[#F9F9F7] border border-[#E5E5E0]'
  };

  return (
    <div
      className={cn(
        'rounded-2xl p-5 sm:p-6',
        variantStyles[variant],
        hoverEffect && 'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

