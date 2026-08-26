import React from 'react';
import { IconProps, Icon } from '@phosphor-icons/react';

export interface IconBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: Icon | React.ComponentType<IconProps> | React.ComponentType<any>;
  size?: 'sm' | 'md' | 'lg' | 'xs';
  iconSize?: number;
  weight?: 'duotone' | 'fill' | 'bold' | 'regular' | 'light' | 'thin';
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'ghost' | 'active';
  glow?: boolean;
  children?: React.ReactNode;
}

export const IconBadge: React.FC<IconBadgeProps> = ({
  icon: IconComponent,
  size = 'md',
  iconSize,
  weight = 'duotone',
  variant = 'default',
  glow = false,
  className = '',
  children,
  ...props
}) => {
  // Size classes adhering strictly to: w-8 h-8 or w-10 h-10, rounded-xl
  const sizeClasses = {
    xs: 'w-7 h-7 rounded-lg',
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl'
  }[size];

  const defaultIconSize = {
    xs: 15,
    sm: 18,
    md: 22,
    lg: 26
  }[size];

  const actualIconSize = iconSize ?? defaultIconSize;

  // Variant stylings layered over standardized frosted square badge: bg-white/10, border border-white/15
  const variantClasses = {
    default: 'bg-white/10 dark:bg-white/10 border-white/15 text-slate-700 dark:text-slate-200 backdrop-blur-md',
    primary: 'bg-[#7B61FF]/15 border-[#7B61FF]/30 text-[#7B61FF] dark:text-[#9D8BFF] backdrop-blur-md',
    accent: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-500 dark:text-indigo-400 backdrop-blur-md',
    success: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 backdrop-blur-md',
    warning: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 backdrop-blur-md',
    danger: 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 backdrop-blur-md',
    ghost: 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 backdrop-blur-sm',
    active: 'bg-[#7B61FF] border-white/20 text-white shadow-lg shadow-[#7B61FF]/30'
  }[variant];

  const glowEffect = glow ? 'shadow-[0_0_15px_rgba(123,97,255,0.25)]' : '';

  return (
    <div
      className={`shrink-0 flex items-center justify-center border transition-all duration-200 ${sizeClasses} ${variantClasses} ${glowEffect} ${className}`}
      {...props}
    >
      {IconComponent ? (
        <IconComponent size={actualIconSize} weight={weight} />
      ) : (
        children
      )}
    </div>
  );
};

export default IconBadge;
