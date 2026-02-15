import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Bell,
  Shield,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronRight,
  Moon,
  Globe,
  Share2,
  Zap,
  List,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ProgressBar } from '@/components/ProgressBar';
import { StreakIndicator } from '@/components/StreakIndicator';
import { AchievementBadge } from '@/components/AchievementBadge';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from '@/components/ui/empty';

const user = {
  name: 'Пользователь',
  email: '',
  avatar: '🙂',
  level: 0,
  xp: 0,
  xpToNext: 100,
  streak: 0,
  joinedDate: '—',
};

const achievements: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
  unlocked: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}> = [];

const menuItems = [
  { icon: CreditCard, label: 'Мои счета', badge: null },
  { icon: Bell, label: 'Уведомления', badge: null },
  { icon: Shield, label: 'Безопасность', badge: null },
  { icon: Globe, label: 'Язык', badge: 'Русский' },
  { icon: Moon, label: 'Тема', badge: 'Тёмная' },
  { icon: HelpCircle, label: 'Помощь', badge: null },
  { icon: Share2, label: 'Пригласить друзей', badge: null },
];

export function Profile() {
  const [showAchievements, setShowAchievements] = useState(false);
  const unlockedAchievements = achievements.filter(a => a.unlocked).length;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* User card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/20 via-bg-secondary to-secondary/20 rounded-3xl p-6 border border-white/5"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-bg-tertiary flex items-center justify-center text-4xl">
            {user.avatar}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{user.name}</h1>
            {user.email ? (
              <p className="text-text-secondary text-sm">{user.email}</p>
            ) : (
              <p className="text-text-secondary text-sm">—</p>
            )}
            <p className="text-text-tertiary text-xs mt-1">В FinFlow с {user.joinedDate}</p>
          </div>
          <button className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center hover:bg-primary/20 transition-colors">
            <Settings size={18} className="text-text-secondary" />
          </button>
        </div>

        {/* Level progress */}
        <div className="bg-bg-primary/50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">Уровень {user.level}</p>
                <p className="text-text-tertiary text-xs">Финансовый ниндзя</p>
              </div>
            </div>
            <span className="text-primary-light font-mono tabular-nums font-semibold">
              {user.xp} XP
            </span>
          </div>
          <ProgressBar
            value={user.xp}
            max={user.xpToNext}
            color="gradient"
            showValue={false}
          />
          <p className="text-text-tertiary text-xs mt-2">
            До следующего уровня: {user.xpToNext - user.xp} XP
          </p>
        </div>
      </motion.div>

      {/* Streak card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between bg-bg-secondary rounded-2xl p-4 border border-white/5"
      >
        <div>
          <p className="text-text-secondary text-sm mb-1">Твой streak</p>
          <StreakIndicator days={user.streak} size="lg" />
        </div>
        <div className="text-right">
          <p className="text-text-tertiary text-xs">Лучший результат</p>
          <p className="font-bold font-mono tabular-nums text-warning">0 дней 🔥</p>
        </div>
      </motion.div>

      {/* Achievements preview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-bg-secondary rounded-2xl p-4 border border-white/5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Достижения</h3>
          <button
            onClick={() => setShowAchievements(true)}
            className="text-sm text-primary-light hover:text-primary transition-colors"
          >
            Все →
          </button>
        </div>
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
          <>
            <div className="grid grid-cols-3 gap-2">
              {achievements.slice(0, 3).map((ach, i) => (
                <AchievementBadge key={i} {...ach} />
              ))}
            </div>
            <p className="text-text-tertiary text-xs text-center mt-3">
              Разблокировано {unlockedAchievements} из {achievements.length}
            </p>
          </>
        )}
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-3 gap-3"
      >
        <div className="bg-bg-secondary rounded-2xl p-3 text-center border border-white/5">
          <p className="text-2xl font-bold font-mono tabular-nums text-primary-light">0</p>
          <p className="text-text-tertiary text-xs">Операций</p>
        </div>
        <div className="bg-bg-secondary rounded-2xl p-3 text-center border border-white/5">
          <p className="text-2xl font-bold font-mono tabular-nums text-success">₽0</p>
          <p className="text-text-tertiary text-xs">Сэкономлено</p>
        </div>
        <div className="bg-bg-secondary rounded-2xl p-3 text-center border border-white/5">
          <p className="text-2xl font-bold font-mono tabular-nums text-secondary">0</p>
          <p className="text-text-tertiary text-xs">Целей</p>
        </div>
      </motion.div>

      {/* Menu */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-2"
      >
        {menuItems.map((item) => (
          <button
            key={item.label}
            className="w-full flex items-center gap-3 p-4 bg-bg-secondary rounded-2xl border border-white/5 hover:border-primary/30 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center">
              <item.icon size={18} className="text-text-secondary" />
            </div>
            <span className="flex-1 text-left font-medium">{item.label}</span>
            {item.badge && (
              <span className="text-text-tertiary text-sm">{item.badge}</span>
            )}
            <ChevronRight size={18} className="text-text-tertiary" />
          </button>
        ))}
      </motion.div>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <button className="w-full flex items-center justify-center gap-2 p-4 text-error hover:bg-error/10 rounded-2xl transition-colors">
          <LogOut size={18} />
          Выйти
        </button>
      </motion.div>

      {/* Version */}
      <p className="text-center text-text-muted text-xs">
        FinFlow v1.0.0
      </p>

      {/* Achievements Modal */}
      {showAchievements && (
        <AchievementsModal onClose={() => setShowAchievements(false)} />
      )}
    </div>
  );
}

function AchievementsModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="absolute inset-x-0 bottom-0 max-w-lg mx-auto bg-bg-secondary rounded-t-3xl max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-bg-secondary p-4 border-b border-white/5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Все достижения</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-4">
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
            <div className="grid grid-cols-2 gap-3">
              {achievements.map((ach, i) => (
                <AchievementBadge key={i} {...ach} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
