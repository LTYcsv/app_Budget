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

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 12,
    background: 'var(--surface-2)', border: '1px solid var(--nav-border)',
    outline: 'none', color: 'inherit', fontSize: 14,
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="chek-card w-full max-w-lg"
        style={{ padding: 20 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="display" style={{ fontSize: 17 }}>Редактировать счёт</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center">
            <X size={16} className="text-text-secondary" />
          </button>
        </div>
        {error && <div className="px-4 py-2 rounded-xl bg-error/10 border border-error/25 text-sm text-error mb-3">{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>Название</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Например: Тинькофф" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>Начальный баланс (₽)</label>
            <input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0" style={{ ...inputStyle, fontVariantNumeric: 'tabular-nums' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 8 }}>Цвет</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: c, border: color === c ? '2px solid white' : '2px solid transparent', transform: color === c ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.15s', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
        </div>
        <button onClick={handleSave} disabled={loading}
          className="tx-submit-btn tx-submit-btn--income"
          style={{ marginTop: 16 }}>
          {loading ? 'Сохраняем...' : 'Сохранить'}
        </button>
        <div className="glow-line" />
      </motion.div>
    </div>
  );
}

type DashboardPeriod = 'day' | 'week' | 'month' | 'year';

const PERIOD_LABEL: Record<DashboardPeriod, string> = {
  day: 'сегодня', week: 'за неделю', month: 'за месяц', year: 'за год',
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

function SectionLabel({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>
        {title}
      </span>
      {action}
    </div>
  );
}

function TransactionSkeleton() {
  return (
    <div className="chek-flat" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
      <div className="w-10 h-10 rounded-[14px] bg-bg-tertiary animate-pulse flex-shrink-0" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
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
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 4px' }}
      className="scrollbar-hide">
      {accounts.map(account => (
        <button key={account.id} onClick={() => onEdit(account)}
          className="chek-flat"
          style={{ flexShrink: 0, width: 140, padding: '14px', textAlign: 'left', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: account.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>счёт</span>
          </div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {account.name}
          </p>
          <p className="num" style={{ fontSize: 15, lineHeight: 1 }}>
            {Number(account.current_balance).toLocaleString('ru-RU')} ₽
          </p>
        </button>
      ))}
      <Link to="/accounts"
        style={{ flexShrink: 0, width: 140, borderRadius: 20, border: '1px dashed var(--nav-border)', padding: '14px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(91,158,240,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={15} style={{ color: 'var(--nav-accent, #5B9EF0)' }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)' }}>Добавить</span>
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
    <div className="max-w-lg mx-auto px-4 pt-4 pb-10" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Balance hero ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="chek-card" style={{ padding: '22px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', marginBottom: 8 }}>
          Общий баланс
        </p>
        <p className="num" style={{ fontSize: 48, lineHeight: 1 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-dim)', marginRight: 4 }}>₽</span>
          <AnimatedCounter value={totalBalance} />
        </p>
        {netChange !== 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12,
            padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700,
            background: netChange > 0 ? 'rgba(74,222,128,0.12)' : 'rgba(255,68,68,0.12)',
            color: netChange > 0 ? '#4ADE80' : '#FF4444',
          }}>
            <span>{netChange > 0 ? '↑' : '↓'}</span>
            {netChange > 0 ? '+' : ''}{netChange.toLocaleString('ru-RU')} ₽ {PERIOD_LABEL[selectedPeriod]}
          </div>
        )}
        <div className="glow-line" />
      </motion.div>

      {/* ── Accounts ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <SectionLabel title="Счета" action={
          <Link to="/accounts" style={{ fontSize: 12, fontWeight: 600, color: 'var(--nav-accent, #5B9EF0)', textDecoration: 'none' }}>
            Все →
          </Link>
        } />
        {accountsLoading ? (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 4px' }} className="scrollbar-hide">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse" style={{ flexShrink: 0, width: 140, height: 96, borderRadius: 20, background: 'var(--surface-2)' }} />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <Link to="/accounts" style={{ textDecoration: 'none' }}>
            <div style={{ borderRadius: 20, border: '1px dashed var(--nav-border)', padding: '20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(91,158,240,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Plus size={18} style={{ color: 'var(--nav-accent, #5B9EF0)' }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>Добавить первый счёт</p>
                <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Нажмите, чтобы начать</p>
              </div>
            </div>
          </Link>
        ) : (
          <AccountsHorizontal accounts={accounts} onEdit={setEditAccount} />
        )}
      </motion.div>

      {/* ── Period selector ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        style={{ display: 'flex', gap: 8 }}>
        {(['day', 'week', 'month', 'year'] as DashboardPeriod[]).map(period => (
          <button key={period} onClick={() => setSelectedPeriod(period)}
            style={{
              padding: '6px 16px', borderRadius: 100, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s',
              background: selectedPeriod === period ? 'var(--nav-accent, #5B9EF0)' : 'var(--nav-surface)',
              color: selectedPeriod === period ? '#fff' : 'var(--text-dim)',
              border: selectedPeriod === period ? 'none' : '1px solid var(--nav-border)',
            }}>
            {period === 'day' && 'День'}
            {period === 'week' && 'Нед'}
            {period === 'month' && 'Мес'}
            {period === 'year' && 'Год'}
          </button>
        ))}
      </motion.div>

      {/* ── Income / Expense ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="chek-flat" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(74,222,128,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUpRight size={15} style={{ color: '#4ADE80' }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)' }}>Доход</span>
          </div>
          <p className="num" style={{ fontSize: 19, color: '#4ADE80', lineHeight: 1.2 }}>
            ₽<AnimatedCounter value={income} />
          </p>
          <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>{PERIOD_LABEL[selectedPeriod]}</p>
        </div>
        <div className="chek-flat" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowDownRight size={15} style={{ color: '#FF4444' }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)' }}>Расход</span>
          </div>
          <p className="num" style={{ fontSize: 19, color: '#FF4444', lineHeight: 1.2 }}>
            ₽<AnimatedCounter value={expense} />
          </p>
          <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>{PERIOD_LABEL[selectedPeriod]}</p>
        </div>
      </motion.div>

      {/* ── Transactions ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <SectionLabel title="Операции" action={
          <Link to="/transactions" style={{ fontSize: 12, fontWeight: 600, color: 'var(--nav-accent, #5B9EF0)', textDecoration: 'none' }}>
            Все →
          </Link>
        } />

        {error ? (
          <div className="chek-flat" style={{ padding: 16, fontSize: 14, color: '#FF4444' }}>{error}</div>
        ) : isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(4)].map((_, i) => <TransactionSkeleton key={i} />)}
          </div>
        ) : recentTransactions.length === 0 ? (
          <Empty className="chek-flat" style={{ border: 'none' }}>
            <EmptyHeader>
              <EmptyMedia variant="icon"><List /></EmptyMedia>
              <EmptyTitle>Операций пока нет</EmptyTitle>
              <EmptyDescription>Добавьте первую операцию, чтобы здесь появился список.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent />
          </Empty>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentTransactions.map((tx, i) => {
              const prev = recentTransactions[i - 1];
              const showDateHeader = i === 0 || prev.date !== tx.date;
              return (
                <div key={tx.id}>
                  {showDateHeader && (
                    <div style={{ padding: '8px 4px 6px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>
                        {formatSectionDate(tx.date)}
                      </span>
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.04 }}
                    className="chek-flat"
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 14, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                      <CategoryIcon icon={tx.icon} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                        {tx.category}{tx.time ? ` · ${tx.time.slice(0, 5)}` : ` · ${formatRelativeDate(tx.date)}`}
                      </p>
                    </div>
                    <span className="num" style={{ fontSize: 14, color: tx.type === 'income' ? '#4ADE80' : '#FF4444', whiteSpace: 'nowrap' }}>
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
