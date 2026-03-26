import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Plus, X, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from '@/components/ui/empty';
import { useTransactions } from '@/context/TransactionsContext';
import { CategoryIcon } from '@/components/CategoryIcon';
import { api, type ApiAccount } from '@/lib/api';

const PRESET_COLORS = [
  '#6366F1', '#EC4899', '#10B981', '#F59E0B',
  '#3B82F6', '#EF4444', '#8B5CF6', '#14B8A6',
  '#F97316', '#FFDD2D',
];

// ─── Edit Account Modal ────────────────────────────────────────────────────────
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
          <h2 className="text-lg font-semibold text-text-primary">Редактировать счёт</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center">
            <X size={16} className="text-text-secondary" />
          </button>
        </div>
        {error && <div className="px-4 py-2 rounded-xl bg-error/10 border border-error/25 text-sm text-error">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="text-text-secondary text-sm mb-1 block">Название</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Например: Тинькофф"
              className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none text-text-primary" />
          </div>
          <div>
            <label className="text-text-secondary text-sm mb-1 block">Начальный баланс (₽)</label>
            <input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0"
              className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none font-mono text-text-primary" />
          </div>
          <div>
            <label className="text-text-secondary text-sm mb-2 block">Цвет</label>
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
          className="w-full py-3 rounded-xl bg-primary text-[#08090F] font-semibold hover:bg-primary/80 transition-colors disabled:opacity-50">
          {loading ? 'Сохраняем...' : 'Сохранить'}
        </button>
      </motion.div>
    </div>
  );
}

type DashboardPeriod = 'day' | 'week' | 'month' | 'year';

const PERIOD_LABEL: Record<DashboardPeriod, string> = {
  day: 'сегодня',
  week: 'за неделю',
  month: 'за месяц',
  year: 'за год',
};

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

function TransactionSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-[20px] border border-white/[0.05]">
      <div className="w-10 h-10 rounded-[14px] bg-bg-tertiary animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-bg-tertiary rounded-full animate-pulse w-2/3" />
        <div className="h-2.5 bg-bg-tertiary rounded-full animate-pulse w-1/3" />
      </div>
      <div className="h-3 bg-bg-tertiary rounded-full animate-pulse w-16" />
    </div>
  );
}

// ─── Accounts Horizontal Scroll ───────────────────────────────────────────────
function AccountsHorizontal({ accounts, onEdit }: { accounts: ApiAccount[]; onEdit: (a: ApiAccount) => void }) {
  return (
    <div className="flex gap-2.5 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
      {accounts.map(account => (
        <button
          key={account.id}
          onClick={() => onEdit(account)}
          className="flex-shrink-0 w-[140px] bg-bg-secondary rounded-[20px] border border-white/[0.06] p-3.5 text-left hover:border-white/[0.12] transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: account.color }}
            />
            <span className="text-[10px] font-semibold text-text-primary/30 uppercase tracking-wider">счёт</span>
          </div>
          <p className="text-xs font-semibold text-text-primary/60 mb-1.5 truncate">{account.name}</p>
          <p className="text-[15px] font-extrabold tracking-tight text-text-primary tabular-nums leading-none">
            {Number(account.current_balance).toLocaleString('ru-RU')} ₽
          </p>
        </button>
      ))}
      <Link
        to="/accounts"
        className="flex-shrink-0 w-[140px] rounded-[20px] border border-dashed border-white/10 p-3.5 flex flex-col items-center justify-center gap-2 hover:border-white/20 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-[#5B9EF0]/10 flex items-center justify-center">
          <Plus size={15} className="text-[#5B9EF0]" />
        </div>
        <span className="text-[11px] font-semibold text-text-primary/30">Добавить</span>
      </Link>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>('month');
  const { transactions, isLoading, error } = useTransactions();
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [editAccount, setEditAccount] = useState<ApiAccount | null>(null);

  useEffect(() => {
    let retries = 0;
    const load = () => {
      api.getAccounts()
        .then(data => { setAccounts(data); setAccountsLoading(false); })
        .catch(() => { if (retries < 5) { retries++; setTimeout(load, 1500 * retries); } else setAccountsLoading(false); });
    };
    load();
  }, []);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    if (selectedPeriod === 'week') start.setDate(start.getDate() - 6);
    if (selectedPeriod === 'month') start.setDate(start.getDate() - 29);
    if (selectedPeriod === 'year') start.setDate(start.getDate() - 364);
    return transactions.filter(tx => { const d = new Date(`${tx.date}T00:00:00`); return d >= start && d <= end; });
  }, [selectedPeriod, transactions]);

  const income = useMemo(
    () => filteredTransactions.filter(tx => tx.type === 'income').reduce((s, tx) => s + Number(tx.amount), 0),
    [filteredTransactions],
  );
  const expense = useMemo(
    () => filteredTransactions.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0),
    [filteredTransactions],
  );
  const recentTransactions = useMemo(
    () => [...filteredTransactions].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)).slice(0, 10),
    [filteredTransactions],
  );

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.current_balance), 0);
  const netChange = income - expense;

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-10 space-y-5">

      {/* ── Balance ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="text-center py-2"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-primary/35 mb-2">
          Общий баланс
        </p>
        <p className="text-[48px] leading-none font-extrabold tracking-tight text-text-primary tabular-nums">
          <span className="text-[28px] font-bold text-text-primary/45 mr-1">₽</span>
          <AnimatedCounter value={totalBalance} />
        </p>
        {netChange !== 0 && (
          <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-[11px] font-bold ${
            netChange > 0 ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
          }`}>
            <span>{netChange > 0 ? '↑' : '↓'}</span>
            {netChange > 0 ? '+' : ''}{netChange.toLocaleString('ru-RU')} ₽ {PERIOD_LABEL[selectedPeriod]}
          </div>
        )}
      </motion.div>

      {/* ── Accounts ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-primary/40">Счета</span>
          <Link to="/accounts" className="text-xs font-semibold text-[#5B9EF0]">Все →</Link>
        </div>
        {accountsLoading ? (
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[140px] h-[96px] bg-bg-secondary rounded-[20px] animate-pulse" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <Link to="/accounts">
            <div className="rounded-[20px] border border-dashed border-white/10 p-5 flex items-center gap-4 hover:border-white/20 transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#5B9EF0]/10 flex items-center justify-center flex-shrink-0">
                <Plus size={18} className="text-[#5B9EF0]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Добавить первый счёт</p>
                <p className="text-xs text-text-primary/40 mt-0.5">Нажмите, чтобы начать</p>
              </div>
            </div>
          </Link>
        ) : (
          <AccountsHorizontal accounts={accounts} onEdit={setEditAccount} />
        )}
      </motion.div>

      {/* ── Period selector ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex gap-2"
      >
        {(['day', 'week', 'month', 'year'] as DashboardPeriod[]).map(period => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              selectedPeriod === period
                ? 'bg-[#5B9EF0] text-[#08090F]'
                : 'bg-bg-secondary text-text-primary/50 hover:text-text-primary border border-white/[0.06]'
            }`}
          >
            {period === 'day' && 'День'}
            {period === 'week' && 'Нед'}
            {period === 'month' && 'Мес'}
            {period === 'year' && 'Год'}
          </button>
        ))}
      </motion.div>

      {/* ── Income / Expense ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-2.5"
      >
        <div className="bg-bg-secondary rounded-[20px] border border-white/[0.06] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-[10px] bg-success/10 flex items-center justify-center">
              <ArrowUpRight size={15} className="text-success" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-primary/35">Доход</span>
          </div>
          <p className="text-[19px] font-extrabold tracking-tight text-success tabular-nums leading-tight">
            ₽<AnimatedCounter value={income} />
          </p>
          <p className="text-[10px] text-text-primary/30 mt-1">{PERIOD_LABEL[selectedPeriod]}</p>
        </div>
        <div className="bg-bg-secondary rounded-[20px] border border-white/[0.06] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-[10px] bg-error/10 flex items-center justify-center">
              <ArrowDownRight size={15} className="text-error" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-primary/35">Расход</span>
          </div>
          <p className="text-[19px] font-extrabold tracking-tight text-error tabular-nums leading-tight">
            ₽<AnimatedCounter value={expense} />
          </p>
          <p className="text-[10px] text-text-primary/30 mt-1">{PERIOD_LABEL[selectedPeriod]}</p>
        </div>
      </motion.div>

      {/* ── Transactions ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-primary/40">Операции</span>
          <Link to="/transactions" className="text-xs font-semibold text-[#5B9EF0]">Все →</Link>
        </div>

        {error ? (
          <div className="p-4 text-sm text-error bg-bg-secondary rounded-[20px] border border-error/20">{error}</div>
        ) : isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <TransactionSkeleton key={i} />)}</div>
        ) : recentTransactions.length === 0 ? (
          <Empty className="border border-white/[0.05] bg-bg-secondary rounded-[20px]">
            <EmptyHeader>
              <EmptyMedia variant="icon"><List /></EmptyMedia>
              <EmptyTitle>Операций пока нет</EmptyTitle>
              <EmptyDescription>Добавьте первую операцию, чтобы здесь появился список.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent />
          </Empty>
        ) : (
          <div className="space-y-1.5">
            {recentTransactions.map((tx, i) => {
              const prev = recentTransactions[i - 1];
              const showDateHeader = i === 0 || prev.date !== tx.date;
              return (
                <div key={tx.id}>
                  {showDateHeader && (
                    <div className="px-1 pt-3 pb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-primary/30">
                        {formatSectionDate(tx.date)}
                      </span>
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.04 }}
                    className="flex items-center gap-3 px-3 py-3 bg-bg-secondary rounded-[20px] border border-white/[0.05] hover:border-white/10 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-[14px] bg-bg-primary flex items-center justify-center text-[20px] flex-shrink-0">
                      <CategoryIcon icon={tx.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate text-text-primary">{tx.name}</p>
                      <p className="text-[11px] text-text-primary/35 mt-0.5">
                        {tx.category}
                        {tx.time ? ` · ${tx.time.slice(0, 5)}` : ` · ${formatRelativeDate(tx.date)}`}
                      </p>
                    </div>
                    <span className={`text-sm font-extrabold tabular-nums tracking-tight whitespace-nowrap ${
                      tx.type === 'income' ? 'text-success' : 'text-error'
                    }`}>
                      {tx.type === 'income' ? '+' : '−'}{Number(tx.amount).toLocaleString('ru-RU')} ₽
                    </span>
                  </motion.div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── Edit Account Modal ── */}
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
