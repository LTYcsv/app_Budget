import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Pencil, ArrowLeftRight, X, CreditCard } from 'lucide-react';
import { api, type ApiAccount, type ApiAccountCreate } from '@/lib/api';
import { useTransactions } from '@/context/TransactionsContext';
import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';

const PRESET_COLORS = [
  '#6366F1', '#EC4899', '#10B981', '#F59E0B',
  '#3B82F6', '#EF4444', '#8B5CF6', '#14B8A6',
  '#F97316', '#FFDD2D',
];

function AccountCard({ account, onEdit, onDelete, lang }: {
  account: ApiAccount;
  onEdit: (a: ApiAccount) => void;
  onDelete: (id: string) => void;
  lang: import('@/lib/i18n').Lang;
}) {
  const balance = Number(account.current_balance);
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className="relative p-4 rounded-2xl border border-white/5 bg-bg-secondary overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: account.color }} />
      <div className="pl-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: account.color + '20' }}>
            <CreditCard size={18} style={{ color: account.color }} />
          </div>
          <div>
            <p className="font-semibold">{account.name}</p>
            <p className="text-text-tertiary text-xs">Начальный: {Number(account.initial_balance).toLocaleString('ru-RU')} ₽</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right mr-2">
            <p className={`font-mono font-bold ${balance >= 0 ? 'text-success' : 'text-error'}`}>
              {balance >= 0 ? '+' : ''}{balance.toLocaleString('ru-RU')} ₽
            </p>
            <p className="text-text-tertiary text-xs">{t(lang, 'current_balance')}</p>
          </div>
          <button onClick={() => onEdit(account)} className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center hover:bg-primary/20 transition-colors">
            <Pencil size={14} className="text-text-secondary" />
          </button>
          <button onClick={() => { if (window.confirm(t(lang, 'delete_account_confirm') + ` "${account.name}"?`)) onDelete(account.id); }}
            className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center hover:bg-error/20 transition-colors">
            <Trash2 size={14} className="text-error" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function AccountModal({ initial, onSave, onClose, lang }: {
  initial?: ApiAccount;
  onSave: (payload: ApiAccountCreate) => Promise<void>;
  onClose: () => void;
  lang: import('@/lib/i18n').Lang;
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
        className="w-full max-w-lg bg-bg-secondary rounded-3xl p-5 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initial ? t(lang, 'edit_account_title') : t(lang, 'new_account')}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center"><X size={16} /></button>
        </div>
        {error && <div className="px-4 py-2 rounded-xl bg-error/10 border border-error/25 text-sm text-error">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="text-text-secondary text-sm mb-1 block">{t(lang, 'account_name')}</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={t(lang, "account_name_placeholder")}
              className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="text-text-secondary text-sm mb-1 block">{t(lang, 'account_balance')}</label>
            <input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0"
              className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none font-mono" />
          </div>
          <div>
            <label className="text-text-secondary text-sm mb-2 block">{t(lang, 'account_color')}</label>
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
          {loading ? t(lang, 'saving') : initial ? t(lang, 'save') : t(lang, 'create_account')}
        </button>
      </motion.div>
    </div>
  );
}

function TransferModal({ accounts, onClose, onDone, lang }: {
  accounts: ApiAccount[];
  onClose: () => void;
  onDone: () => void;
  lang: import('@/lib/i18n').Lang;
}) {
  const [fromId, setFromId] = useState(accounts[0]?.id ?? '');
  const [toId, setToId] = useState(accounts[1]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useTransactions();

  const handleTransfer = async () => {
    if (fromId === toId) { setError(t(lang, 'transfer_same_account')); return; }
    const num = Number(amount);
    if (!num || num <= 0) { setError(t(lang, 'transfer_enter_amount')); return; }
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
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка перевода');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4">
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        className="w-full max-w-lg bg-bg-secondary rounded-3xl p-5 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t(lang, 'transfer_title')}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center"><X size={16} /></button>
        </div>
        {error && <div className="px-4 py-2 rounded-xl bg-error/10 border border-error/25 text-sm text-error">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="text-text-secondary text-sm mb-1 block">{t(lang, 'transfer_from')}</label>
            <select value={fromId} onChange={e => setFromId(e.target.value)}
              className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none">
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} — {Number(a.current_balance).toLocaleString('ru-RU')} ₽</option>)}
            </select>
          </div>
          <div>
            <label className="text-text-secondary text-sm mb-1 block">{t(lang, 'transfer_to')}</label>
            <select value={toId} onChange={e => setToId(e.target.value)}
              className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none">
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} — {Number(a.current_balance).toLocaleString('ru-RU')} ₽</option>)}
            </select>
          </div>
          <div>
            <label className="text-text-secondary text-sm mb-1 block">{t(lang, 'transfer_amount')}</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
              className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none font-mono" />
          </div>
          <div>
            <label className="text-text-secondary text-sm mb-1 block">{t(lang, 'transfer_note')}</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder={t(lang, "transfer_note_placeholder")}
              className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none" />
          </div>
        </div>
        <button onClick={handleTransfer} disabled={loading}
          className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/80 transition-colors disabled:opacity-50">
          {loading ? t(lang, 'transfer_loading') : t(lang, 'transfer_do')}
        </button>
      </motion.div>
    </div>
  );
}

export function Accounts() {
  const { lang } = useLang();
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editAccount, setEditAccount] = useState<ApiAccount | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);

  const load = async () => {
    try { setAccounts(await api.getAccounts()); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.current_balance), 0);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t(lang, "accounts_title")}</h1>
          <p className="text-text-secondary text-sm mt-0.5">{accounts.length} {t(lang, accounts.length === 1 ? 'account_singular' : accounts.length < 5 ? 'account_few' : 'account_many')}</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors">
          <Plus size={20} className="text-white" />
        </button>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}
        className="bg-gradient-to-br from-primary/20 via-bg-secondary to-secondary/20 rounded-3xl p-6 border border-white/5">
        <p className="text-text-secondary text-sm mb-1">{t(lang, "common_balance")}</p>
        <p className="text-4xl font-bold font-mono">{totalBalance.toLocaleString('ru-RU')} ₽</p>
        {accounts.length > 1 && (
          <button onClick={() => setShowTransfer(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition-colors text-sm">
            <ArrowLeftRight size={16} />{t(lang, 'transfer_btn')}
          </button>
        )}
      </motion.div>

      {loading ? (
        [1, 2].map(i => <div key={i} className="bg-bg-secondary rounded-2xl p-4 border border-white/5 animate-pulse h-20" />)
      ) : accounts.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
          <div className="text-4xl mb-3">💳</div>
          <p className="font-semibold">{t(lang, "no_accounts")}</p>
          <p className="text-text-secondary text-sm mt-1">{t(lang, "no_accounts_desc")}</p>
          <button onClick={() => setShowCreate(true)}
            className="mt-4 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/80 transition-colors">
            Добавить счёт
          </button>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          {accounts.map(account => (
            <AccountCard key={account.id} account={account} lang={lang}
              onEdit={setEditAccount}
              onDelete={async (id) => { await api.deleteAccount(id); setAccounts(prev => prev.filter(a => a.id !== id)); }} />
          ))}
        </AnimatePresence>
      )}

      <AnimatePresence>
        {showCreate && <AccountModal lang={lang} onSave={async p => { const c = await api.createAccount(p); setAccounts(prev => [...prev, c]); }} onClose={() => setShowCreate(false)} />}
        {editAccount && <AccountModal lang={lang} initial={editAccount} onSave={async p => { const u = await api.updateAccount(editAccount.id, p); setAccounts(prev => prev.map(a => a.id === u.id ? u : a)); }} onClose={() => setEditAccount(null)} />}
        {showTransfer && <TransferModal lang={lang} accounts={accounts} onClose={() => setShowTransfer(false)} onDone={() => { setShowTransfer(false); void load(); }} />}
      </AnimatePresence>
    </div>
  );
}
