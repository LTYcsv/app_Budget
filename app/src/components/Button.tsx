import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  icon?: ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  disabled = false,
  type = 'button',
  icon,
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-gradient-to-r from-primary to-secondary text-white shadow-glow hover:shadow-glow-lg hover:brightness-110',
    secondary:
      'bg-transparent border-2 border-primary/50 text-primary-light hover:border-primary hover:bg-primary/10',
    ghost:
      'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
    icon: 'bg-bg-secondary text-text-primary hover:bg-bg-tertiary p-0',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        baseStyles,
        variant === 'icon' ? iconSizes[size] : sizes[size],
        variants[variant],
        className
      )}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {variant !== 'icon' && children}
    </motion.button>
  );
}
