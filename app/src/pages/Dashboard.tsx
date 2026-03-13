import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, ArrowUpRight, ArrowDownRight, List, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { StreakIndicator } from '@/components/StreakIndicator';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from '@/components/ui/empty';
import { useTransactions } from '@/context/TransactionsContext';
import { CategoryIcon } from '@/components/CategoryIcon';
import { api, type ApiGamification, type ApiAccount } from '@/lib/api';

const PRESET_COLORS = [
  '#6366F1', '#EC4899', '#10B981', '#F59E0B',
  '#3B82F6', '#EF4444', '#8B5CF6', '#14B8A6',
  '#F97316', '#FFDD2D',
];

// ─── Edit Account Modal (inline, без Accounts.tsx) ─────────────────────────────
function EditAccountModal({ account, onSave, onClose }: {
  account: ApiAccount;
  onSave: (updated: ApiAccount) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(account.name);
  const [color, setColor] = useState(account.color);
  const [balance, setBalance] = useState(String(Number(account.initial_balance)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) { setError('Введите название'); return; }
    const num = Number(balance);
    if (!Number.isFinite(num)) { setError('Некорректный баланс'); return; }
    setLoading(true);
    try {
      const updated = await api.updateAccount(account.id, { name: name.trim(), color, initial_balance: num });
      onSave(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-bg-secondary rounded-3xl p-5 border border-white/10 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Редактировать счёт</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
        {error && <div className="px-4 py-2 rounded-xl bg-error/10 border border-error/25 text-sm text-error">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="text-text-secondary text-sm mb-1 block">Название</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Например: Тинькофф"
              className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="text-text-secondary text-sm mb-1 block">Начальный баланс (₽)</label>
            <input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0"
              className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none font-mono" />
          </div>
          <div>
            <label className="text-text-secondary text-sm mb-2 block">Цвет карточки</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        <button onClick={handleSave} disabled={loading}
          className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/80 transition-colors disabled:opacity-50">
          {loading ? 'Сохраняем...' : 'Сохранить'}
        </button>
      </motion.div>
    </div>
  );
}

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

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function TransactionSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-2xl border border-white/5">
      <div className="w-10 h-10 rounded-xl bg-bg-tertiary animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-bg-tertiary rounded-full animate-pulse w-2/3" />
        <div className="h-2.5 bg-bg-tertiary rounded-full animate-pulse w-1/3" />
      </div>
      <div className="h-3 bg-bg-tertiary rounded-full animate-pulse w-16" />
    </div>
  );
}

// ─── 3D Account Card ───────────────────────────────────────────────────────────
function AccountCard3D({
  account,
  isActive,
  offset,
  onEdit,
}: {
  account: ApiAccount;
  isActive: boolean;
  offset: number;
  onEdit: (a: ApiAccount) => void;
}) {
  const balance = Number(account.current_balance);

  // Wallet-стек: активная — спереди по центру,
  // следующая (+1) — чуть правее и меньше (виден краешек),
  // все остальные (offset >= 2 или < 0) — спрятаны за следующей
  const getStyle = () => {
    if (offset === 0) {
      // Активная карточка
      return { x: '0%', scale: 1, opacity: 1, zIndex: 20, rotateY: 0 };
    }
    if (offset === 1) {
      // Следующая — краешек справа
      return { x: '78%', scale: 0.88, opacity: 1, zIndex: 15, rotateY: -8 };
    }
    if (offset === -1) {
      // Предыдущая — краешек слева
      return { x: '-78%', scale: 0.88, opacity: 1, zIndex: 15, rotateY: 8 };
    }
    // Все остальные — спрятаны за соседними
    if (offset > 1) {
      return { x: '85%', scale: 0.82, opacity: 0, zIndex: 10, rotateY: -12 };
    }
    return { x: '-85%', scale: 0.82, opacity: 0, zIndex: 10, rotateY: 12 };
  };

  const s = getStyle();

  return (
    <motion.div
      animate={{ x: s.x, scale: s.scale, opacity: s.opacity, rotateY: s.rotateY }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      style={{
        position: 'absolute',
        left: '50%',
        translateX: '-50%',
        width: '82%',
        maxWidth: 300,
        zIndex: s.zIndex,
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        className="relative rounded-3xl overflow-hidden select-none"
        style={{
          height: 168,
          background: `linear-gradient(135deg, ${account.color}EE 0%, ${account.color}99 60%, ${account.color}55 100%)`,
          boxShadow: isActive
            ? `0 24px 60px ${account.color}55, 0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)`
            : `0 8px 24px rgba(0,0,0,0.3)`,
        }}
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20 blur-2xl" style={{ background: 'white' }} />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full opacity-15 blur-xl" style={{ background: account.color }} />
        <div className="absolute top-0 left-0 right-0 h-1/2 rounded-t-3xl opacity-10" style={{ background: 'linear-gradient(180deg, white 0%, transparent 100%)' }} />

        {/* Chip */}
        <div className="absolute top-5 left-5">
          <div className="w-9 h-7 rounded-md border border-white/30 bg-white/10 backdrop-blur-sm grid grid-cols-2 gap-px p-1">
            {[...Array(4)].map((_, i) => <div key={i} className="rounded-sm bg-white/30" />)}
          </div>
        </div>

        {/* Три точки — кнопка редактирования */}
        <button
          onClick={e => { e.stopPropagation(); if (isActive) onEdit(account); }}
          className="absolute top-4 right-4 flex gap-1 p-1.5 rounded-lg hover:bg-white/20 transition-colors group"
          style={{ pointerEvents: isActive ? 'auto' : 'none' }}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/50 group-hover:bg-white transition-colors" />
          ))}
        </button>

        {/* Имя счёта */}
        <div className="absolute top-7 left-16">
          <span className="text-white/80 text-xs font-semibold tracking-wide uppercase">{account.name}</span>
        </div>

        {/* Баланс */}
        <div className="absolute bottom-5 left-5">
          <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Баланс</p>
          <p className="text-white font-bold text-2xl leading-none tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {balance.toLocaleString('ru-RU')} ₽
          </p>
        </div>

        {/* Декоративные полосы */}
        <div className="absolute bottom-5 right-5 flex flex-col gap-0.5 opacity-30">
          <div className="w-10 h-0.5 rounded-full bg-white" />
          <div className="w-7 h-0.5 rounded-full bg-white" />
          <div className="w-9 h-0.5 rounded-full bg-white" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Add Account Card ──────────────────────────────────────────────────────────
function AddAccountCard3D({ offset }: { offset: number }) {
  const getStyle = () => {
    if (offset === 0) return { x: '0%', scale: 1, opacity: 1, zIndex: 20, rotateY: 0 };
    if (offset === 1) return { x: '78%', scale: 0.88, opacity: 1, zIndex: 15, rotateY: -8 };
    if (offset === -1) return { x: '-78%', scale: 0.88, opacity: 1, zIndex: 15, rotateY: 8 };
    if (offset > 1) return { x: '85%', scale: 0.82, opacity: 0, zIndex: 10, rotateY: -12 };
    return { x: '-85%', scale: 0.82, opacity: 0, zIndex: 10, rotateY: 12 };
  };
  const s = getStyle();

  return (
    <motion.div
      animate={{ x: s.x, scale: s.scale, opacity: s.opacity, rotateY: s.rotateY }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      style={{
        position: 'absolute',
        left: '50%',
        translateX: '-50%',
        width: '82%',
        maxWidth: 300,
        zIndex: s.zIndex,
        transformStyle: 'preserve-3d',
      }}
    >
      <Link to="/accounts">
        <div
          className="rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:border-primary/40 transition-colors group"
          style={{ height: 168 }}
        >
          <div className="w-12 h-12 rounded-2xl bg-white/5 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
            <Plus size={20} className="text-text-tertiary group-hover:text-primary transition-colors" />
          </div>
          <p className="text-text-tertiary text-sm group-hover:text-text-secondary transition-colors">
            Добавить счёт
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Accounts Carousel 3D ──────────────────────────────────────────────────────
function AccountsCarousel3D({ accounts, onEdit }: { accounts: ApiAccount[]; onEdit: (a: ApiAccount) => void }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const totalItems = accounts.length + 1; // +1 для "добавить"

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.current_balance), 0);

  const goTo = (idx: number) => {
    setActiveIdx(Math.max(0, Math.min(totalItems - 1, idx)));
  };

  // Свайп
  const dragStartX = useRef(0);
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    dragStartX.current = 'touches' in e ? e.touches[0].clientX : e.clientX;
  };
  const handleDragEnd = (e: React.TouchEvent | React.MouseEvent) => {
    const endX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
    const delta = dragStartX.current - endX;
    if (Math.abs(delta) > 40) {
      goTo(delta > 0 ? activeIdx + 1 : activeIdx - 1);
    }
  };

  return (
    <div className="space-y-5">
      {/* Баланс */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-text-secondary text-xs mb-1 uppercase tracking-widest">Общий баланс</p>
        <p className="text-4xl font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {totalBalance.toLocaleString('ru-RU')}{' '}
          <span className="text-text-secondary text-2xl font-medium">₽</span>
        </p>
      </motion.div>

      {/* 3D карусель */}
      <div
        className="relative select-none"
        style={{ height: 168, perspective: 900, perspectiveOrigin: '50% 50%' }}
        onTouchStart={handleDragStart}
        onTouchEnd={handleDragEnd}
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
      >
        {accounts.map((account, i) => (
          <div key={account.id} onClick={() => goTo(i)}>
            <AccountCard3D
              account={account}
              isActive={i === activeIdx}
              offset={i - activeIdx}
              onEdit={onEdit}
            />
          </div>
        ))}
        <div onClick={() => goTo(accounts.length)}>
          <AddAccountCard3D
            offset={accounts.length - activeIdx}
          />
        </div>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-2 pt-1">
        {Array.from({ length: totalItems }).map((_, i) => (
          <motion.button
            key={i}
            onClick={() => goTo(i)}
            animate={{
              width: i === activeIdx ? 24 : 6,
              opacity: i === activeIdx ? 1 : 0.3,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="h-1.5 rounded-full bg-primary"
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
  const [editAccount, setEditAccount] = useState<ApiAccount | null>(null);

  useEffect(() => {
    api.getGamification().then(setGamification).catch(() => {});

    let retries = 0;
    const loadAccounts = () => {
      api.getAccounts()
        .then(data => { setAccounts(data); setAccountsLoading(false); })
        .catch(() => {
          if (retries < 5) {
            retries++;
            setTimeout(loadAccounts, 1500 * retries);
          } else {
            setAccountsLoading(false);
          }
        });
    };
    loadAccounts();
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

      {/* Streak */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <StreakIndicator days={gamification?.streak_current ?? 0} size="md" />
      </motion.div>

      {/* Карусель счетов — без обёртки */}
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
        {accountsLoading ? (
          <div className="h-52 animate-pulse rounded-3xl bg-bg-secondary border border-white/5" />
        ) : accounts.length === 0 ? (
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
          <AccountsCarousel3D accounts={accounts} onEdit={setEditAccount} />
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
        ) : isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <TransactionSkeleton key={i} />)}
          </div>
        ) : recentTransactions.length === 0 ? (
          <Empty className="border border-white/5 bg-bg-secondary">
            <EmptyHeader>
              <EmptyMedia variant="icon"><List /></EmptyMedia>
              <EmptyTitle>Операций пока нет</EmptyTitle>
              <EmptyDescription>Добавьте первую операцию, чтобы здесь появился список.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent />
          </Empty>
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
                      {tx.type === 'income' ? '+' : '-'}{Number(tx.amount).toLocaleString('ru-RU')} ₽
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
            <p className="text-text-tertiary text-xs">За период</p>
          </div>
        </Link>
      </motion.div>

      {/* Edit account modal */}
      <AnimatePresence>
        {editAccount && (
          <EditAccountModal
            account={editAccount}
            onSave={updated => setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a))}
            onClose={() => setEditAccount(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
