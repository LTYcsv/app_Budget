import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Bell, Shield, CreditCard, HelpCircle, LogOut,
  ChevronRight, Globe, Share2, Sun, Moon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { StreakIndicator } from '@/components/StreakIndicator';
import { api, type ApiGamification, type ApiAchievement, type AchievementRarity } from '@/lib/api';
import { toast } from 'sonner';
import { useTransactions } from '@/context/TransactionsContext';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

// ─── Theme hook ────────────────────────────────────────────────────────────────
function useTheme() {
  const [isLight, setIsLight] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'light';
  });

  useEffect(() => {
    if (isLight) {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLight]);

  // Применяем сохранённую тему при первом рендере
  useEffect(() => {
    if (localStorage.getItem('theme') === 'light') {
      document.documentElement.classList.add('light');
    }
  }, []);

  return { isLight, toggle: () => setIsLight(v => !v) };
}

const rarityColors: Record<AchievementRarity, { bg: string; border: string; shadow: string }> = {
  common:    { bg: 'bg-bg-tertiary',   border: 'border-white/10', shadow: '' },
  rare:      { bg: 'bg-primary/10',    border: 'border-primary/40', shadow: 'shadow-[0_0_12px_rgba(99,102,241,0.15)]' },
  epic:      { bg: 'bg-secondary/10',  border: 'border-secondary/40', shadow: 'shadow-[0_0_12px_rgba(236,72,153,0.15)]' },
  legendary: { bg: 'bg-warning/10',    border: 'border-warning/40', shadow: 'shadow-[0_0_12px_rgba(245,158,11,0.2)]' },
};

function MiniAchievementBadge({ ach }: { ach: ApiAchievement }) {
  const c = rarityColors[ach.rarity];
  return (
    <div className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${ach.unlocked ? `${c.bg} ${c.border} ${c.shadow}` : 'bg-bg-tertiary border-white/5 opacity-50'}`}>
      <span className="text-2xl mb-1">{ach.icon}</span>
      <p className="text-[10px] font-semibold text-center leading-tight w-full truncate text-text-primary">{ach.title}</p>
    </div>
  );
}

const menuItems: Array<{ icon: LucideIcon; label: string; badge?: string; iconBg: string; iconColor: string; }> = [
  { icon: CreditCard, label: 'Мои счета',        iconBg: 'bg-primary/10',    iconColor: 'text-primary' },
  { icon: Bell,       label: 'Уведомления',       iconBg: 'bg-warning/10',    iconColor: 'text-warning' },
  { icon: Shield,     label: 'Безопасность',      iconBg: 'bg-success/10',    iconColor: 'text-success' },
  { icon: Globe,      label: 'Язык',    badge: 'Русский', iconBg: 'bg-accent/10', iconColor: 'text-accent' },
  { icon: HelpCircle, label: 'Помощь',            iconBg: 'bg-primary/10',    iconColor: 'text-primary-light' },
  { icon: Share2,     label: 'Пригласить друзей', iconBg: 'bg-secondary/10',  iconColor: 'text-secondary' },
];

function formatDate(iso: string): string {
  const normalized = iso.endsWith('Z') ? iso : iso + 'Z';
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getInitials(email: string | null): string {
  if (!email) return '?';
  return email[0].toUpperCase();
}

export function Profile() {
  const [gamification, setGamification] = useState<ApiGamification | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const { transactions } = useTransactions();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { isLight, toggle } = useTheme();

  useEffect(() => {
    api.getGamification().then(setGamification).catch((err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Не удалось загрузить данные профиля');
    });
    api.getMe().then((user) => {
      setUserEmail(user.email);
      setMemberSince(formatDate(user.created_at));
    }).catch(() => {});
  }, []);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const streakCurrent = gamification?.streak_current ?? 0;
  const streakBest    = gamification?.streak_best ?? 0;
  const achievements  = gamification?.achievements ?? [];
  const unlockedCount = gamification?.achievements_unlocked ?? 0;
  const totalCount    = gamification?.achievements_total ?? 0;
  const txCount       = transactions.length;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

      {/* ─── Hero card ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6"
        style={{
          background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',
          boxShadow: '0 16px 48px rgba(99,102,241,0.35)',
        }}
      >
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-20 bg-white" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10 bg-white" />

        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.3)' }}>
            <span className="text-white font-black text-2xl">{getInitials(userEmail)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-lg truncate">{userEmail ?? '...'}</h1>
            <p className="text-white/60 text-sm mt-0.5">{memberSince ? `С нами с ${memberSince}` : '—'}</p>
          </div>
          <button className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
            <Settings size={18} className="text-white" />
          </button>
        </div>

        <div className="relative flex gap-3 mt-5">
          {[
            { value: txCount, label: 'Операций' },
            { value: unlockedCount, label: 'Достижений' },
            { value: streakCurrent, label: 'Дней streak' },
          ].map(stat => (
            <div key={stat.label} className="flex-1 rounded-2xl px-4 py-3 text-center"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
              <p className="text-white font-bold text-xl">{stat.value}</p>
              <p className="text-white/60 text-xs">{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ─── Streak ─────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex items-center justify-between bg-bg-secondary rounded-2xl p-4 border border-white/5">
        <div>
          <p className="text-text-muted text-xs font-medium mb-1">Текущий streak</p>
          <StreakIndicator days={streakCurrent} size="lg" />
        </div>
        <div className="text-right">
          <p className="text-text-muted text-xs">Лучший результат</p>
          <p className="font-bold tabular-nums mt-0.5 text-warning">{streakBest} дней 🔥</p>
        </div>
      </motion.div>

      {/* ─── Achievements ───────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-bg-secondary rounded-2xl p-4 border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm text-text-primary">Достижения</h3>
          <Link to="/achievements" className="text-xs font-semibold text-primary-light">Все →</Link>
        </div>
        {achievements.filter(a => a.unlocked).length === 0 ? (
          <p className="text-center text-sm py-4 text-text-muted">Разблокировано 0 из {totalCount}</p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2">
              {achievements.filter(a => a.unlocked).slice(0, 4).map(ach => (
                <MiniAchievementBadge key={ach.id} ach={ach} />
              ))}
            </div>
            <p className="text-text-muted text-xs text-center mt-3">Разблокировано {unlockedCount} из {totalCount}</p>
          </>
        )}
      </motion.div>

      {/* ─── Menu ───────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-bg-secondary rounded-2xl overflow-hidden border border-white/5">
        {menuItems.map((item, idx) => (
          <button key={item.label}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors"
            style={{ borderBottom: idx < menuItems.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.iconBg}`}>
              <item.icon size={17} className={item.iconColor} />
            </div>
            <span className="flex-1 text-left text-sm font-semibold text-text-primary">{item.label}</span>
            {item.badge && <span className="text-xs text-text-muted mr-1">{item.badge}</span>}
            <ChevronRight size={16} className="text-text-muted" />
          </button>
        ))}

        {/* Переключатель темы */}
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/10">
            {isLight ? <Moon size={17} className="text-primary" /> : <Sun size={17} className="text-primary" />}
          </div>
          <span className="flex-1 text-left text-sm font-semibold text-text-primary">Тема</span>
          {/* Toggle pill */}
          <div
            className="relative w-12 h-6 rounded-full transition-colors duration-300 mr-1"
            style={{ background: isLight ? '#6366F1' : 'rgba(255,255,255,0.1)' }}
          >
            <motion.div
              className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
              animate={{ x: isLight ? 26 : 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </div>
          <span className="text-xs text-text-muted w-14 text-left">{isLight ? 'Светлая' : 'Тёмная'}</span>
        </button>
      </motion.div>

      {/* ─── Logout ─────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-bg-secondary rounded-2xl overflow-hidden border border-white/5">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-error/5 transition-colors">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-error/10">
            <LogOut size={17} className="text-error" />
          </div>
          <span className="flex-1 text-left text-sm font-semibold text-error">Выйти из аккаунта</span>
          <ChevronRight size={16} className="text-error opacity-50" />
        </button>
      </motion.div>

      <p className="text-center text-xs pb-2 text-text-muted">чек v1.0.0</p>
    </div>
  );
}
