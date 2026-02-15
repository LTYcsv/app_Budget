import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakIndicatorProps {
  days: number;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StreakIndicator({
  days,
  animated = true,
  size = 'md',
  className = '',
}: StreakIndicatorProps) {
  const sizes = {
    sm: { icon: 16, text: 'text-sm', padding: 'px-2 py-1' },
    md: { icon: 20, text: 'text-base', padding: 'px-3 py-1.5' },
    lg: { icon: 24, text: 'text-lg', padding: 'px-4 py-2' },
  };

  const { icon, text, padding } = sizes[size];

  return (
    <motion.div
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-warning/10 border border-warning/30',
        padding,
        className
      )}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      <motion.div
        animate={animated ? {
          scale: [1, 1.15, 1],
        } : {}}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Flame
          size={icon}
          className="text-warning"
          fill="currentColor"
          fillOpacity={0.3}
        />
      </motion.div>
      <span className={cn('font-bold font-mono tabular-nums text-warning', text)}>
        {days} {getDaysLabel(days)}
      </span>
    </motion.div>
  );
}

function getDaysLabel(days: number): string {
  const lastDigit = days % 10;
  const lastTwoDigits = days % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'дней';
  }
  if (lastDigit === 1) {
    return 'день';
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'дня';
  }
  return 'дней';
}
