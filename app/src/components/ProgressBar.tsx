import { motion } from 'framer-motion';
import { useInView } from '@/hooks/useInView';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'linear' | 'circular';
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'accent' | 'success' | 'gradient';
  className?: string;
  showValue?: boolean;
  label?: string;
}

export function ProgressBar({
  value,
  max = 100,
  variant = 'linear',
  size = 'md',
  color = 'gradient',
  className = '',
  showValue = true,
  label,
}: ProgressBarProps) {
  const [ref, isInView] = useInView<HTMLDivElement>();
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colors = {
    primary: 'bg-primary',
    accent: 'bg-accent',
    success: 'bg-success',
    gradient: 'bg-gradient-to-r from-primary via-secondary to-accent',
  };

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  if (variant === 'circular') {
    const circumference = 2 * Math.PI * 36;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div ref={ref} className={cn('relative inline-flex items-center justify-center', className)}>
        <svg className="transform -rotate-90 w-20 h-20">
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="#252542"
            strokeWidth="8"
          />
          <motion.circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={isInView ? { strokeDashoffset } : { strokeDashoffset: circumference }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold font-mono tabular-nums text-text-primary">{Math.round(percentage)}%</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm text-text-secondary">{label}</span>}
          {showValue && (
            <span className="text-sm font-semibold font-mono tabular-nums text-text-primary">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-bg-tertiary rounded-full overflow-hidden', sizes[size])}>
        <motion.div
          className={cn('h-full rounded-full', colors[color])}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${percentage}%` } : { width: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
