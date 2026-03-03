import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Bell, Shield, CreditCard, HelpCircle, LogOut,
  ChevronRight, Moon, Globe, Share2, List,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { StreakIndicator } from '@/components/StreakIndicator';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from '@/components/ui/empty';
import { api, type ApiGamification, type ApiAchievement, type AchievementRarity } from '@/lib/api';
import { useTransactions } from '@/context/TransactionsContext';
import { Link } from 'react-router-dom';

const rarityColors: Record<AchievementRarity, { bg: string; border: string }> = {
  common:    { bg: 'bg-bg-tertiary',   border: 'border-white/10' },
  rare:      { bg: 'bg-primary/10',   border: 'border-primary/40' },
  epic:      { bg: 'bg-secondary/10', border: 'border-secondary/40' },
  legendary: { bg: 'bg-warning/10',   border: 'border-warning/40' },
};

function MiniAchievementBadge({ ach }: { ach: ApiAchievement }) {
  const colors = rarityColors[ach.rarity];
  return (
    <div className={`flex flex-col items-center p-3 rounded-2xl border-2 ${ach.unlocked ? `${colors.bg} ${colors.border}` : 'bg-bg-tertiary border-white/5 opacity-50'}`}>
      <span className="text-2xl mb-1">{ach.icon}</span>
      <p className="text-xs font-medium text-center leading-tight truncate w-full text-center">{ach.title}</p>
    </div>
  );
}

const menuItems: Array<{ icon: LucideIcon; label: string; badge: string | null }> = [
  { icon: CreditCard, label: 'Мои счета', badge: null },
  { icon: Bell, label: 'Уведомления', badge: null },
  { icon: Shield, label: 'Безопасность', badge: null },
  { icon: Globe, label: 'Язык', badge: 'Русский' },
  { icon: Moon, label: 'Тема', badge: 'Тёмная' },
  { icon: HelpCircle, label: 'Помощь', badge: null },
  { icon: Share2, label: 'Пригласить друзей', badge: null },
];

export function Profile() {
  const [gamification, setGamification] = useState<ApiGamification | null>(null);
  const { transactions } = useTransactions();

  useEffect(() => {
    api.getGamification().then(setGamification).catch(() => {});
  }, []);

  const streakCurrent = gamification?.streak_current ?? 0;
  const streakBest = gamification?.streak_best ?? 0;
  const achievements = gamification?.achievements ?? [];
  const unlockedCount = gamification?.achievements_unlocked ?? 0;
  const totalCount = gamification?.achievements_total ?? 0;
  const txCount = transactions.length;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* User card */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/20 via-bg-secondary to-secondary/20 rounded-3xl p-6 border border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-bg-tertiary flex items-center justify-center text-4xl">🙂</div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Пользователь</h1>
            <p className="text-text-secondary text-sm">—</p>
          </div>
          <button className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center hover:bg-primary/20 transition-colors">
            <Settings size={18} className="text-text-secondary" />
          </button>
        </div>
      </motion.div>

      {/* Streak card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex items-center justify-between bg-bg-secondary rounded-2xl p-4 border border-white/5">
        <div>
          <p className="text-text-secondary text-sm mb-1">Твой streak</p>
          <StreakIndicator days={streakCurrent} size="lg" />
        </div>
        <div className="text-right">
          <p className="text-text-tertiary text-xs">Лучший результат</p>
          <p className="font-bold font-mono tabular-nums text-warning">{streakBest} дней 🔥</p>
        </div>
      </motion.div>

      {/* Achievements preview */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-bg-secondary rounded-2xl p-4 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Достижения</h3>
          <Link to="/achievements" className="text-sm text-primary-light hover:text-primary transition-colors">Все →</Link>
        </div>
        {achievements.length === 0 ? (
          <Empty className="border border-white/5 bg-bg-secondary">
            <EmptyHeader>
              <EmptyMedia variant="icon"><List /></EmptyMedia>
              <EmptyTitle>Достижений пока нет</EmptyTitle>
              <EmptyDescription>Появятся после первых действий в приложении.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent />
          </Empty>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2">
              {achievements.filter(a => a.unlocked).slice(0, 4).map((ach) => (
                <MiniAchievementBadge key={ach.id} ach={ach} />
              ))}
            </div>
            <p className="text-text-tertiary text-xs text-center mt-3">
              Разблокировано {unlockedCount} из {totalCount}
            </p>
          </>
        )}
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-2 gap-3">
        <div className="bg-bg-secondary rounded-2xl p-3 text-center border border-white/5">
          <p className="text-2xl font-bold font-mono tabular-nums text-primary-light">{txCount}</p>
          <p className="text-text-tertiary text-xs">Операций</p>
        </div>
        <div className="bg-bg-secondary rounded-2xl p-3 text-center border border-white/5">
          <p className="text-2xl font-bold font-mono tabular-nums text-warning">{unlockedCount}</p>
          <p className="text-text-tertiary text-xs">Достижений</p>
        </div>
      </motion.div>

      {/* Menu */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-2">
        {menuItems.map((item) => (
          <button key={item.label} className="w-full flex items-center gap-3 p-4 bg-bg-secondary rounded-2xl border border-white/5 hover:border-primary/30 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center">
              <item.icon size={18} className="text-text-secondary" />
            </div>
            <span className="flex-1 text-left font-medium">{item.label}</span>
            {item.badge && <span className="text-text-tertiary text-sm">{item.badge}</span>}
            <ChevronRight size={18} className="text-text-tertiary" />
          </button>
        ))}
      </motion.div>

      {/* Logout */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <button className="w-full flex items-center justify-center gap-2 p-4 text-error hover:bg-error/10 rounded-2xl transition-colors">
          <LogOut size={18} />Выйти
        </button>
      </motion.div>

      <p className="text-center text-text-muted text-xs">FinFlow v1.0.0</p>
    </div>
  );
}
