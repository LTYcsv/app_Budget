import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { StreakIndicator } from '@/components/StreakIndicator';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from '@/components/ui/empty';
import { useTransactions } from '@/context/TransactionsContext';
import { CategoryIcon } from '@/components/CategoryIcon';
import { api, type ApiGamification } from '@/lib/api';

type DashboardPeriod = 'day' | 'week' | 'month' | 'year';

const quickStatsMeta = [
  { label: 'Доход', key: 'income', icon: ArrowUpRight, color: 'text-success', bg: 'bg-success/10' },
  { label: 'Расход', key: 'expense', icon: ArrowDownRight, color: 'text-error', bg: 'bg-error/10' },
] as const;

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Сегодня';
  if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function formatSectionDate(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Сегодня';
  if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>('month');
  const { transactions, isLoading, error } = useTransactions();
  const [gamification, setGamification] = useState<ApiGamification | null>(null);

  useEffect(() => {
    api.getGamification().then(setGamification).catch(() => {});
  }, []);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    if (selectedPeriod === 'week') start.setDate(start.getDate() - 6);
    if (selectedPeriod === 'month') start.setDate(start.getDate() - 29);
    if (selectedPeriod === 'year') start.setDate(start.getDate() - 364);
    return transactions.filter((tx) => {
      const txDate = new Date(`${tx.date}T00:00:00`);
      return txDate >= start && txDate <= end;
    });
  }, [selectedPeriod, transactions]);

  const income = useMemo(() => filteredTransactions.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + Number(tx.amount), 0), [filteredTransactions]);
  const expense = useMemo(() => filteredTransactions.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + Number(tx.amount), 0), [filteredTransactions]);
  const total = useMemo(() => income - expense, [income, expense]);

  const recentTransactions = useMemo(() =>
    [...filteredTransactions].sort((a, b) => {
      const dateDiff = b.date.localeCompare(a.date);
      return dateDiff !== 0 ? dateDiff : b.time.localeCompare(a.time);
    }).slice(0, 10),
  [filteredTransactions]);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Streak banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <StreakIndicator days={gamification?.streak_current ?? 0} size="md" />
        <Link to="/achievements" className="text-sm text-primary-light hover:text-primary transition-colors">
          Мои достижения →
        </Link>
      </motion.div>

      {/* Main balance card */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="relative overflow-hidden">
        <div className="bg-gradient-to-br from-primary/20 via-bg-secondary to-secondary/20 rounded-3xl p-6 border border-white/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
          <div className="relative">
            <p className="text-text-secondary text-sm mb-1">Общий баланс</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold font-mono">₽<AnimatedCounter value={total} /></span>
              <span className="flex items-center gap-1 text-success text-sm font-medium">
                <TrendingUp size={14} />+0%
              </span>
            </div>
            <div className="mt-4 h-16">
              <svg className="w-full h-full" viewBox="0 0 300 60" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="dashboardGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
                <path d="M0,50 Q30,45 60,40 T120,35 T180,38 T240,25 T300,20 L300,60 L0,60 Z" fill="url(#dashboardGradient)" />
                <path d="M0,50 Q30,45 60,40 T120,35 T180,38 T240,25 T300,20" fill="none" stroke="url(#lineGradient)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 gap-3">
        {quickStatsMeta.map((stat) => (
          <div key={stat.key} className="bg-bg-secondary rounded-2xl p-4 border border-white/5">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-2`}>
              <stat.icon size={18} className={stat.color} />
            </div>
            <p className="text-text-tertiary text-xs">{stat.label}</p>
            <p className={`font-mono font-semibold ${stat.color}`}>
              ₽<AnimatedCounter value={stat.key === 'income' ? income : expense} />
            </p>
          </div>
        ))}
      </motion.div>

      {/* Period selector */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex gap-2">
        {(['day', 'week', 'month', 'year'] as DashboardPeriod[]).map((period) => (
          <button key={period} onClick={() => setSelectedPeriod(period)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedPeriod === period ? 'bg-primary text-white' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}>
            {period === 'day' && 'День'}{period === 'week' && 'Неделя'}{period === 'month' && 'Месяц'}{period === 'year' && 'Год'}
          </button>
        ))}
      </motion.div>

      {/* Recent transactions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Последние операции</h3>
          <Link to="/transactions" className="text-sm text-primary-light hover:text-primary transition-colors">Все →</Link>
        </div>
        {error ? (
          <div className="p-4 text-sm text-error bg-bg-secondary rounded-2xl border border-error/20">{error}</div>
        ) : !isLoading && recentTransactions.length === 0 ? (
          <Empty className="border border-white/5 bg-bg-secondary">
            <EmptyHeader>
              <EmptyMedia variant="icon"><List /></EmptyMedia>
              <EmptyTitle>Операций пока нет</EmptyTitle>
              <EmptyDescription>Добавьте первую операцию, чтобы здесь появился список.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent />
          </Empty>
        ) : isLoading ? (
          <div className="p-4 text-sm text-text-secondary bg-bg-secondary rounded-2xl border border-white/5">Загружаем данные...</div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((tx, i) => {
              const prev = recentTransactions[i - 1];
              const showDateHeader = i === 0 || prev.date !== tx.date;
              return (
                <div key={tx.id} className="space-y-2">
                  {showDateHeader && (
                    <div className="px-1"><span className="text-xs font-medium text-text-tertiary">{formatSectionDate(tx.date)}</span></div>
                  )}
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }}
                    className="flex items-center gap-3 p-3 bg-bg-secondary rounded-2xl border border-white/5 hover:border-primary/30 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center text-xl">
                      <CategoryIcon icon={tx.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{tx.name}</p>
                      <p className="text-text-tertiary text-xs">{tx.category} • {formatRelativeDate(tx.date)}</p>
                    </div>
                    <span className={`font-mono font-semibold ${tx.type === 'income' ? 'text-success' : 'text-text-primary'}`}>
                      {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('ru-RU')} ₽
                    </span>
                  </motion.div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Quick actions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="grid grid-cols-2 gap-3">
        <Link to="/goals" className="flex items-center gap-3 p-4 bg-bg-secondary rounded-2xl border border-white/5 hover:border-primary/30 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
            <Wallet size={18} className="text-secondary" />
          </div>
          <div>
            <p className="font-medium text-sm">Мои цели</p>
            <p className="text-text-tertiary text-xs">0 активных</p>
          </div>
        </Link>
        <Link to="/analytics" className="flex items-center gap-3 p-4 bg-bg-secondary rounded-2xl border border-white/5 hover:border-primary/30 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
            <TrendingUp size={18} className="text-accent" />
          </div>
          <div>
            <p className="font-medium text-sm">Аналитика</p>
            <p className="text-text-tertiary text-xs">Нет данных</p>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
