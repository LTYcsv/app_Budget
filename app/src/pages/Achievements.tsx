import { motion } from 'framer-motion';
import type { ComponentType } from 'react';
import {
  Trophy,
  Check,
  Lock,
  List,
} from 'lucide-react';
import { StreakIndicator } from '@/components/StreakIndicator';
import { ProgressBar } from '@/components/ProgressBar';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from '@/components/ui/empty';

type Achievement = {
  id: number;
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedDate?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xp: number;
  progress?: number;
  maxProgress?: number;
};

const achievements: Achievement[] = [];

const rarityColors = {
  common: { bg: 'bg-bg-tertiary', border: 'border-text-muted/30', text: 'text-text-secondary' },
  rare: { bg: 'bg-primary/10', border: 'border-primary/50', text: 'text-primary-light' },
  epic: { bg: 'bg-secondary/10', border: 'border-secondary/50', text: 'text-secondary' },
  legendary: { bg: 'bg-warning/10', border: 'border-warning/50', text: 'text-warning' },
};

export function Achievements() {
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalXP = achievements.filter(a => a.unlocked).reduce((acc, a) => acc + a.xp, 0);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 border border-warning/30 mb-4">
          <Trophy size={16} className="text-warning" />
          <span className="text-sm text-warning">Достижения</span>
        </div>
        <h1 className="text-2xl font-bold">Твои награды</h1>
        <p className="text-text-secondary text-sm mt-1">
          {unlockedCount} из {achievements.length} разблокировано
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        <div className="bg-bg-secondary rounded-2xl p-4 text-center border border-white/5">
          <p className="text-2xl font-bold font-mono tabular-nums text-warning">{unlockedCount}</p>
          <p className="text-text-tertiary text-xs">Получено</p>
        </div>
        <div className="bg-bg-secondary rounded-2xl p-4 text-center border border-white/5">
          <p className="text-2xl font-bold font-mono tabular-nums text-primary-light">{totalXP}</p>
          <p className="text-text-tertiary text-xs">XP заработано</p>
        </div>
        <div className="bg-bg-secondary rounded-2xl p-4 text-center border border-white/5">
          <p className="text-2xl font-bold font-mono tabular-nums text-secondary">{achievements.length - unlockedCount}</p>
          <p className="text-text-tertiary text-xs">Осталось</p>
        </div>
      </motion.div>

      {/* Streak card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-bg-secondary rounded-2xl p-4 border border-white/5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-text-secondary text-sm">Текущий streak</p>
            <StreakIndicator days={0} size="lg" className="mt-2" />
          </div>
          <div className="text-right">
            <p className="text-text-tertiary text-xs">Рекорд</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-warning">0 🔥</p>
          </div>
        </div>
        
        {achievements.length === 0 ? (
          <Empty className="border border-white/5 bg-bg-secondary">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <List />
              </EmptyMedia>
              <EmptyTitle>Серия пока не начата</EmptyTitle>
              <EmptyDescription>Добавьте операции, чтобы начать streak.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent />
          </Empty>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 28 }).map((_, i) => {
              const isActive = i < 24;
              const isToday = i === 24;
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-lg flex items-center justify-center text-xs ${
                    isActive
                      ? 'bg-warning/20 text-warning border border-warning/30'
                      : isToday
                      ? 'bg-primary/20 text-primary border border-primary/30 border-dashed'
                      : 'bg-bg-tertiary text-text-muted'
                  }`}
                >
                  {isActive ? '🔥' : isToday ? '+' : i + 1}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Achievements list */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <h3 className="font-semibold">Все достижения</h3>
        
        {achievements.length === 0 ? (
          <Empty className="border border-white/5 bg-bg-secondary">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <List />
              </EmptyMedia>
              <EmptyTitle>Достижений пока нет</EmptyTitle>
              <EmptyDescription>Появятся после первых действий в приложении.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent />
          </Empty>
        ) : (
          <div className="space-y-3">
            {achievements.map((ach, i) => {
              const colors = rarityColors[ach.rarity as keyof typeof rarityColors];
              const Icon = ach.icon;
              
              return (
                <motion.div
                  key={ach.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className={`relative p-4 rounded-2xl border-2 transition-all ${
                    ach.unlocked
                      ? `${colors.bg} ${colors.border}`
                      : 'bg-bg-secondary border-white/5 opacity-70'
                  }`}
                >
                  {!ach.unlocked && (
                    <div className="absolute top-4 right-4">
                      <Lock size={16} className="text-text-muted" />
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        ach.unlocked ? colors.bg : 'bg-bg-tertiary'
                      }`}
                    >
                      <Icon
                        size={24}
                        className={ach.unlocked ? colors.text : 'text-text-muted'}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{ach.title}</h4>
                        {ach.unlocked && (
                          <Check size={14} className="text-success" />
                        )}
                      </div>
                      <p className="text-text-secondary text-sm">{ach.description}</p>
                      
                      {ach.unlocked ? (
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-text-tertiary">
                            {ach.unlockedDate}
                          </span>
                          <span className="px-2 py-0.5 bg-primary/20 rounded-full text-primary text-xs">
                            +{ach.xp} XP
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-text-tertiary">Прогресс</span>
                            <span className="text-text-secondary">
                              {ach.progress} / {ach.maxProgress}
                            </span>
                          </div>
                          <ProgressBar
                            value={ach.progress || 0}
                            max={ach.maxProgress || 1}
                            color="primary"
                            size="sm"
                            showValue={false}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
