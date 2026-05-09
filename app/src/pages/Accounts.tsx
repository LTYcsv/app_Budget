import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Pencil, ArrowLeftRight, X, CreditCard } from 'lucide-react';
import { api, type ApiAccount, type ApiAccountCreate } from '@/lib/api';
import { useTransactions } from '@/context/TransactionsContext';
import { sanitizeDecimalInput } from '@/lib/utils';

const PRESET_COLORS = [
  '#6366F1', '#EC4899', '#10B981', '#F59E0B',
  '#3B82F6', '#EF4444', '#8B5CF6', '#14B8A6',
  '#F97316', '#FFDD2D',
];

const inputStyle = {
  width: '100%', padding: '12px 16px', borderRadius: 12,
  background: 'var(--surface-2)', border: '1px solid var(--nav-border)',
  outline: 'none', color: 'inherit', fontSize: 14,
};

function AccountCard({ account, onEdit, onDelete }: {
  account: ApiAccount;
  onEdit: (a: ApiAccount) => void;
  onDelete: (id: string) => void;
}) {
  const balance = Number(account.current_balance);
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className="chek-flat" style={{ position: 'relative', padding: 16, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderRadius: '20px 0 0 20px', background: account.color }} />
      <div style={{ paddingLeft: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: account.color + '20', flexShrink: 0 }}>
            <CreditCard size={18} style={{ color: account.color }} />
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>{account.name}</p>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
              Начальный: {Number(account.initial_balance).toLocaleString('ru-RU')} ₽
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right', marginRight: 4 }}>
            <p className="num" style={{ fontSize: 15, color: balance >= 0 ? '#4ADE80' : '#FF4444' }}>
              {balance > 0 ? '+' : ''}{balance.toLocaleString('ru-RU')} ₽
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-dim)' }}>Текущий</p>
          </div>
          <button onClick={() => onEdit(account)}
            style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
            <Pencil size={14} style={{ color: 'var(--text-dim)' }} />
          </button>
          <button onClick={() => { if (window.confirm(`Удалить счёт "${account.name}"?`)) onDelete(account.id); }}
            style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
            <Trash2 size={14} style={{ color: '#FF4444' }} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function AccountModal({ initial, onSave, onClose }: {
  initial?: ApiAccount;
  onSave: (payload: ApiAccountCreate) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0]);
  const [balance, setBalance] = useState(initial ? String(Number(initial.initial_balance)) : '0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) { setError('Введите название счёта'); return; }
    const num = Number(balance);
    if (!Number.isFinite(num)) { setError('Некорректный баланс'); return; }
    setLoading(true);
    try {
      await onSave({ name: name.trim(), color, initial_balance: num });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="chek-card w-full max-w-lg" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="display" style={{ fontSize: 17 }}>{initial ? 'Редактировать счёт' : 'Новый счёт'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
        {error && <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.25)', fontSize: 13, color: '#FF4444', marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>Название</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Например: Тинькофф" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>Начальный баланс (₽)</label>
            <input type="text" inputMode="decimal" value={balance} onChange={e => setBalance(sanitizeDecimalInput(e.target.value))} placeholder="0" autoComplete="off" style={{ ...inputStyle, fontVariantNumeric: 'tabular-nums' }} />
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
          className="tx-submit-btn tx-submit-btn--income" style={{ marginTop: 16, opacity: loading ? 0.5 : 1 }}>
          {loading ? 'Сохраняем...' : initial ? 'Сохранить' : 'Создать счёт'}
        </button>
        <div className="glow-line" />
      </motion.div>
    </div>
  );
}

function TransferModal({ accounts, onClose, onDone }: {
  accounts: ApiAccount[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [fromId, setFromId] = useState(accounts[0]?.id ?? '');
  const [toId, setToId] = useState(accounts[1]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refresh, refreshAccounts } = useTransactions();

  const handleTransfer = async () => {
    if (fromId === toId) { setError('Выберите разные счета'); return; }
    const num = Number(amount);
    if (!num || num <= 0) { setError('Введите сумму'); return; }
    setLoading(true);
    try {
      const now = new Date();
      await api.createTransfer({
        from_account_id: fromId,
        to_account_id: toId,
        amount: num,
        note: note.trim() || null,
        date: now.toISOString().split('T')[0],
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      });
      void refresh();
      void refreshAccounts();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка перевода');
      setLoading(false);
    }
  };

  const selectStyle = { ...inputStyle, appearance: 'auto' as const };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4">
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        className="chek-card w-full max-w-lg" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="display" style={{ fontSize: 17 }}>Перевод между счетами</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center"><X size={16} /></button>
        </div>
        {error && <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.25)', fontSize: 13, color: '#FF4444', marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>Откуда</label>
            <select value={fromId} onChange={e => setFromId(e.target.value)} style={selectStyle}>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} — {Number(a.current_balance).toLocaleString('ru-RU')} ₽</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>Куда</label>
            <select value={toId} onChange={e => setToId(e.target.value)} style={selectStyle}>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} — {Number(a.current_balance).toLocaleString('ru-RU')} ₽</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>Сумма (₽)</label>
            <input type="text" inputMode="decimal" value={amount} onChange={e => setAmount(sanitizeDecimalInput(e.target.value))} placeholder="0" autoComplete="off" style={{ ...inputStyle, fontVariantNumeric: 'tabular-nums' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>Примечание (необязательно)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Например: на расходы" style={inputStyle} />
          </div>
        </div>
        <button onClick={handleTransfer} disabled={loading}
          className="tx-submit-btn tx-submit-btn--income" style={{ marginTop: 16, opacity: loading ? 0.5 : 1 }}>
          {loading ? 'Переводим...' : 'Перевести'}
        </button>
        <div className="glow-line" />
      </motion.div>
    </div>
  );
}

export function Accounts() {
  const { accounts, accountsLoading: loading, refreshAccounts } = useTransactions();
  const [showCreate, setShowCreate] = useState(false);
  const [editAccount, setEditAccount] = useState<ApiAccount | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.current_balance), 0);

  return (
    <div className="max-w-lg mx-auto px-4 py-4" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="display" style={{ fontSize: 22 }}>Мои счета</h1>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
            {accounts.length} {accounts.length === 1 ? 'счёт' : accounts.length >= 2 && accounts.length <= 4 ? 'счёта' : 'счетов'}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--nav-accent, #5B9EF0)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
          <Plus size={20} style={{ color: '#fff' }} />
        </button>
      </motion.div>

      {/* ── Balance card ── */}
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}
        className="balance-card relative overflow-hidden rounded-[20px] px-6 pt-6 pb-5 text-center">
        <div className="balance-card__blob-tr" />
        <div className="balance-card__blob-bl" />
        <p className="balance-card__subtitle relative mb-2">Общий баланс</p>
        <p className="balance-card__amount relative tabular-nums leading-none">
          <span className="balance-card__currency mr-1">₽</span>
          {totalBalance.toLocaleString('ru-RU')}
        </p>
        {!loading && accounts.length === 0 && (
          <div className="balance-card__no-accounts relative inline-flex items-center gap-2 mt-3">
            <span className="balance-card__no-accounts-dot" />
            <span style={{ fontSize: 11, fontWeight: 500 }}>0 счетов</span>
          </div>
        )}
        {accounts.length > 1 && (
          <button onClick={() => setShowTransfer(true)}
            style={{ position: 'relative', marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', fontSize: 13, color: 'inherit' }}>
            <ArrowLeftRight size={16} /> Перевод между счетами
          </button>
        )}
        <div className="balance-card__accent-line" />
      </motion.div>

      {/* ── Accounts list ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2].map(i => <div key={i} className="chek-flat animate-pulse" style={{ height: 80 }} />)}
        </div>
      ) : accounts.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
          <p className="display" style={{ fontSize: 17 }}>Счетов пока нет</p>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>Добавьте первый счёт, чтобы начать</p>
          <button onClick={() => setShowCreate(true)}
            style={{ marginTop: 16, padding: '12px 24px', borderRadius: 14, background: 'var(--nav-accent, #5B9EF0)', color: '#fff', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>
            Добавить счёт
          </button>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          {accounts.map(account => (
            <AccountCard key={account.id} account={account}
              onEdit={setEditAccount}
              onDelete={async (id) => { await api.deleteAccount(id); void refreshAccounts(); }} />
          ))}
        </AnimatePresence>
      )}

      <AnimatePresence>
        {showCreate && <AccountModal onSave={async p => { await api.createAccount(p); void refreshAccounts(); }} onClose={() => setShowCreate(false)} />}
        {editAccount && <AccountModal initial={editAccount} onSave={async p => { await api.updateAccount(editAccount.id, p); void refreshAccounts(); }} onClose={() => setEditAccount(null)} />}
        {showTransfer && <TransferModal accounts={accounts} onClose={() => setShowTransfer(false)} onDone={() => { setShowTransfer(false); }} />}
      </AnimatePresence>
    </div>
  );
}
