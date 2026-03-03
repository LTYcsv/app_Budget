import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Check, Lock } from 'lucide-react';
import { StreakIndicator } from '@/components/StreakIndicator';
import { api, type ApiGamification, type ApiAchievement, type AchievementRarity } from '@/lib/api';

const rarityColors: Record<AchievementRarity, { bg: string; border: string; text: string }> = {
  common:    { bg: 'bg-bg-tertiary',    border: 'border-white/10',      text: 'text-text-secondary' },
  rare:      { bg: 'bg-primary/10',    border: 'border-primary/50',    text: 'text-primary-light' },
  epic:      { bg: 'bg-secondary/10',  border: 'border-secondary/50',  text: 'text-secondary' },
  legendary: { bg: 'bg-warning/10',    border: 'border-warning/50',    text: 'text-warning' },
};

function AchievementCard({ ach, index }: { ach: ApiAchievement; index: number }) {
  const colors = rarityColors[ach.rarity];
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * index }}
      className={`relative p-4 rounded-2xl border-2 transition-all ${
        ach.unlocked ? `${colors.bg} ${colors.border}` : 'bg-bg-secondary border-white/5 opacity-60'
      }`}
    >
      {!ach.unlocked && (
        <div className="absolute top-4 right-4"><Lock size={16} className="text-text-muted" /></div>
      )}
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${ach.unlocked ? colors.bg : 'bg-bg-tertiary'}`}>
          {ach.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{ach.title}</h4>
            {ach.unlocked && <Check size={14} className="text-success" />}
          </div>
          <p className="text-text-secondary text-sm">{ach.description}</p>
          {ach.unlocked && ach.unlocked_at && (
            <p className="text-xs text-text-tertiary mt-1">
              {new Date(ach.unlocked_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function Achievements() {
  const [data, setData] = useState<ApiGamification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getGamification().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const streakCurrent = data?.streak_current ?? 0;
  const streakBest = data?.streak_best ?? 0;
  const achievements = data?.achievements ?? [];
  const unlockedCount = data?.achievements_unlocked ?? 0;
  const totalCount = data?.achievements_total ?? 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 border border-warning/30 mb-4">
          <Trophy size={16} className="text-warning" />
          <span className="text-sm text-warning">Достижения</span>
        </div>
        <h1 className="text-2xl font-bold">Твои награды</h1>
        <p className="text-text-secondary text-sm mt-1">{unlockedCount} из {totalCount} разблокировано</p>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 gap-3">
        <div className="bg-bg-secondary rounded-2xl p-4 text-center border border-white/5">
          <p className="text-2xl font-bold font-mono tabular-nums text-warning">{unlockedCount}</p>
          <p className="text-text-tertiary text-xs">Получено</p>
        </div>
        <div className="bg-bg-secondary rounded-2xl p-4 text-center border border-white/5">
          <p className="text-2xl font-bold font-mono tabular-nums text-secondary">{totalCount - unlockedCount}</p>
          <p className="text-text-tertiary text-xs">Осталось</p>
        </div>
      </motion.div>

      {/* Streak card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-bg-secondary rounded-2xl p-4 border border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-secondary text-sm">Текущий streak</p>
            <StreakIndicator days={streakCurrent} size="lg" className="mt-2" />
          </div>
          <div className="text-right">
            <p className="text-text-tertiary text-xs">Рекорд</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-warning">{streakBest} 🔥</p>
          </div>
        </div>
      </motion.div>

      {/* Achievements list */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
        <h3 className="font-semibold">Все достижения</h3>
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-bg-secondary rounded-2xl p-4 border border-white/5 animate-pulse">
              <div className="h-12 w-full bg-white/5 rounded-xl" />
            </div>
          ))
        ) : (
          achievements.map((ach, i) => <AchievementCard key={ach.id} ach={ach} index={i} />)
        )}
      </motion.div>
    </div>
  );
}
