import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AchievementBadgeProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  unlocked: boolean;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  className?: string;
}

export function AchievementBadge({
  icon: Icon,
  title,
  description,
  unlocked,
  rarity = 'common',
  className = '',
}: AchievementBadgeProps) {
  const rarityStyles = {
    common: {
      bg: 'bg-bg-tertiary',
      border: 'border-text-muted/30',
      glow: '',
      icon: 'text-text-secondary',
    },
    rare: {
      bg: 'bg-primary/10',
      border: 'border-primary/50',
      glow: 'shadow-glow',
      icon: 'text-primary-light',
    },
    epic: {
      bg: 'bg-secondary/10',
      border: 'border-secondary/50',
      glow: 'shadow-[0_4px_20px_rgba(236,72,153,0.4)]',
      icon: 'text-secondary',
    },
    legendary: {
      bg: 'bg-gradient-to-br from-warning/20 to-accent/20',
      border: 'border-warning/50',
      glow: 'shadow-[0_4px_30px_rgba(245,158,11,0.5)]',
      icon: 'text-warning',
    },
  };

  const styles = rarityStyles[rarity];

  return (
    <motion.div
      className={cn(
        'relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-300',
        styles.bg,
        styles.border,
        unlocked && styles.glow,
        !unlocked && 'opacity-60 grayscale',
        className
      )}
      whileHover={unlocked ? { scale: 1.05, y: -4 } : {}}
      whileTap={unlocked ? { scale: 0.98 } : {}}
    >
      {!unlocked && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-bg-primary/50">
          <Lock size={20} className="text-text-muted" />
        </div>
      )}
      
      <motion.div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center mb-2',
          unlocked ? 'bg-white/10' : 'bg-bg-tertiary'
        )}
        animate={unlocked && rarity === 'legendary' ? {
          rotate: [0, 5, -5, 0],
        } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Icon size={24} className={styles.icon} />
      </motion.div>
      
      <h4 className={cn(
        'text-sm font-semibold text-center',
        unlocked ? 'text-text-primary' : 'text-text-muted'
      )}>
        {title}
      </h4>
      
      {description && unlocked && (
        <p className="text-xs text-text-tertiary text-center mt-1">
          {description}
        </p>
      )}
    </motion.div>
  );
}
