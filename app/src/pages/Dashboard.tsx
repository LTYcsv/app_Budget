import { useEffect, useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowUpRight, ArrowDownRight, List, CreditCard, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { StreakIndicator } from '@/components/StreakIndicator';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from '@/components/ui/empty';
import { useTransactions } from '@/context/TransactionsContext';
import { CategoryIcon } from '@/components/CategoryIcon';
import { api, type ApiGamification, type ApiAccount } from '@/lib/api';

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

// ─── Account Card ──────────────────────────────────────────────────────────────
function AccountCarouselCard({ account, isActive }: { account: ApiAccount; isActive: boolean }) {
  const balance = Number(account.current_balance);
  return (
    <motion.div
      animate={{ scale: isActive ? 1 : 0.9, opacity: isActive ? 1 : 0.55 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative flex-shrink-0 w-56 h-32 rounded-2xl overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${account.color}DD 0%, ${account.color}88 100%)` }}
    >
      {/* decorative blobs */}
      <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full opacity-25 blur-sm" style={{ background: account.color }} />
      <div className="absolute -bottom-3 -left-3 w-16 h-16 rounded-full opacity-15 blur-sm" style={{ background: account.color }} />

      <div className="relative p-4 h-full flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
              <CreditCard size={12} className="text-white" />
            </div>
            <span className="text-white/90 text-xs font-medium truncate max-w-[100px]">{account.name}</span>
          </div>
          <div className="flex gap-0.5">
            {[0,1,2,3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-white/40" />)}
          </div>
        </div>
        <div>
          <p className="text-white/55 text-[10px] mb-0.5">Баланс</p>
          <p className="text-white font-bold font-mono text-lg leading-tight">
            {balance.toLocaleString('ru-RU')} ₽
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function AddAccountCarouselCard() {
  return (
    <Link
      to="/accounts"
      className="flex-shrink-0 w-56 h-32 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-1.5 hover:border-primary/40 transition-colors group"
    >
      <div className="w-8 h-8 rounded-xl bg-white/5 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
        <Plus size={16} className="text-text-tertiary group-hover:text-primary transition-colors" />
      </div>
      <p className="text-text-tertiary text-xs group-hover:text-text-secondary transition-colors">Добавить счёт</p>
    </Link>
  );
}

// ─── Accounts Carousel ─────────────────────────────────────────────────────────
function AccountsCarousel({ accounts }: { accounts: ApiAccount[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.current_balance), 0);
  const totalItems = accounts.length + 1; // +1 for "add" card

  const scrollToIdx = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.children[idx] as HTMLElement;
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    setActiveIdx(idx);
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let closest = 0, minDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const c = child as HTMLElement;
      const dist = Math.abs((c.offsetLeft + c.offsetWidth / 2) - center);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    setActiveIdx(closest);
  };

  return (
    <div className="space-y-3">
      {/* Total balance row */}
      <div className="flex items-end justify-between px-1">
        <div>
          <p className="text-text-secondary text-xs mb-0.5">Общий баланс</p>
          <p className="text-3xl font-bold font-mono">
            {totalBalance.toLocaleString('ru-RU')} <span className="text-text-secondary text-xl">₽</span>
          </p>
        </div>
        {accounts.length > 1 && (
          <div className="flex items-center gap-1 mb-1">
            <button
              onClick={() => scrollToIdx(Math.max(0, activeIdx - 1))}
              disabled={activeIdx === 0}
              className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-25"
            >
              <ChevronLeft size={14} className="text-text-secondary" />
            </button>
            <button
              onClick={() => scrollToIdx(Math.min(totalItems - 1, activeIdx + 1))}
              disabled={activeIdx >= totalItems - 1}
              className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-25"
            >
              <ChevronRight size={14} className="text-text-secondary" />
            </button>
          </div>
        )}
      </div>

      {/* Scrollable cards */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {accounts.map((account, i) => (
          <div key={account.id} className="snap-center" onClick={() => scrollToIdx(i)}>
            <AccountCarouselCard account={account} isActive={i === activeIdx} />
          </div>
        ))}
        <div className="snap-center">
          <AddAccountCarouselCard />
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1.5">
        {Array.from({ length: totalItems }).map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToIdx(i)}
            className={`rounded-full transition-all duration-300 ${i === activeIdx ? 'w-5 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-white/15 hover:bg-white/30'}`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>('month');
  const { transactions, isLoading, error } = useTransactions();
  const [gamification, setGamification] = useState<ApiGamification | null>(null);
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  useEffect(() => {
    api.getGamification().then(setGamification).catch(() => {});
    api.getAccounts()
      .then(setAccounts)
      .catch(() => {})
      .finally(() => setAccountsLoading(false));
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

  const income = useMemo(() =>
    filteredTransactions.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + Number(tx.amount), 0),
  [filteredTransactions]);

  const expense = useMemo(() =>
    filteredTransactions.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + Number(tx.amount), 0),
  [filteredTransactions]);

  const recentTransactions = useMemo(() =>
    [...filteredTransactions].sort((a, b) => {
      const dateDiff = b.date.localeCompare(a.date);
      return dateDiff !== 0 ? dateDiff : b.time.localeCompare(a.time);
    }).slice(0, 10),
  [filteredTransactions]);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

      {/* Streak + Счета */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <StreakIndicator days={gamification?.streak_current ?? 0} size="md" />
        <Link to="/accounts" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-secondary border border-white/5 hover:border-primary/30 transition-colors">
          <CreditCard size={13} className="text-primary-light" />
          <span className="text-xs text-text-secondary">Счета</span>
        </Link>
      </motion.div>

      {/* Balance card — с каруселью если есть счета */}
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
        {accountsLoading ? (
          <div className="rounded-3xl bg-bg-secondary border border-white/5 h-44 animate-pulse" />
        ) : accounts.length === 0 ? (
          // Пустой стейт — красивая карточка
          <Link to="/accounts">
            <div className="relative overflow-hidden rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-primary/15 via-bg-secondary to-secondary/15 hover:border-primary/20 transition-colors group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/10 rounded-full blur-3xl" />
              <div className="relative">
                <p className="text-text-secondary text-sm mb-0.5">Общий баланс</p>
                <p className="text-5xl font-bold font-mono mb-5">₽0</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                  <Plus size={14} className="text-primary-light" />
                  <span className="text-sm text-primary-light font-medium">Добавить первый счёт</span>
                </div>
              </div>
            </div>
          </Link>
        ) : (
          // Карусель счетов
          <div className="rounded-3xl p-5 border border-white/5 bg-gradient-to-br from-bg-secondary to-bg-secondary/80">
            <AccountsCarousel accounts={accounts} />
          </div>
        )}
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
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    className="flex items-center gap-3 p-3 bg-bg-secondary rounded-2xl border border-white/5 hover:border-primary/30 transition-colors"
                  >
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
            <TrendingUp size={18} className="text-secondary" />
          </div>
          <div>
            <p className="font-medium text-sm">Копилки</p>
            <p className="text-text-tertiary text-xs">Мои цели</p>
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
