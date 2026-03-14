import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownLeft, ArrowUpRight, Calendar, FileText,
  Plus, X, CreditCard, AlertCircle, Search, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { useNavigate, Link } from 'react-router-dom';
import { useTransactions } from '@/context/TransactionsContext';
import { CategoryIcon } from '@/components/CategoryIcon';
import { api, type ApiAccount } from '@/lib/api';
import { type Category } from '@/context/TransactionsContext';
import { toast } from 'sonner';

// ─── Emoji picker для иконки новой категории ──────────────────────────────────
const CATEGORY_EMOJIS = [
  '🛒','🍕','☕','🚗','🏠','💊','👕','✈️','🎮','🎵',
  '📚','💪','🐾','📱','💡','🎁','💰','📈','🔧','🎨',
  '🚌','⛽','🅿️','🚕','🏋️','🍔','🛍️','💄','🏥','🎓',
  '🌿','🐶','🐱','🎬','🎤','🏖️','⚽','🎭','🍷','☀️',
];

// ─── Хук: топ-N самых частых подкатегорий из истории транзакций ───────────────
function useTopCategories(
  categories: Category[],
  transactions: { category_id?: string | null }[],
  limit = 8,
): Category[] {
  return useMemo(() => {
    const freq: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.category_id) freq[tx.category_id] = (freq[tx.category_id] || 0) + 1;
    }
    const sorted = [...categories]
      .filter(c => !c.is_hidden)
      .sort((a, b) => (freq[b.id] || 0) - (freq[a.id] || 0));
    return sorted.slice(0, limit);
  }, [categories, transactions, limit]);
}

// ─── Компонент: карточка категории ───────────────────────────────────────────
function CategoryCard({
  cat,
  isSelected,
  onClick,
  size = 'md',
}: {
  cat: Category;
  isSelected: boolean;
  onClick: () => void;
  size?: 'sm' | 'md';
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.93 }}
      className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 transition-all ${
        size === 'md' ? 'p-3' : 'p-2'
      } ${
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-transparent bg-bg-secondary hover:border-white/10'
      }`}
    >
      <span className={size === 'md' ? 'text-2xl' : 'text-xl'}>
        <CategoryIcon icon={cat.icon} />
      </span>
      <span className={`font-medium text-center leading-tight ${size === 'md' ? 'text-[10px]' : 'text-[9px]'} ${isSelected ? 'text-primary-light' : 'text-text-secondary'}`}>
        {cat.name}
      </span>
    </motion.button>
  );
}

// ─── Bottom Sheet: все категории + создание ───────────────────────────────────
function CategoryBottomSheet({
  categories,
  selectedId,
  onSelect,
  onClose,
  onCreateCategory,
}: {
  type: 'expense' | 'income';
  categories: Category[];
  selectedId: string | null;
  onSelect: (cat: Category) => void;
  onClose: () => void;
  onCreateCategory: (payload: { group: string; name: string; icon: string; parent_id?: string }) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [newIcon, setNewIcon] = useState('🛒');
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Группируем по group
  const grouped = useMemo(() => {
    const map: Record<string, Category[]> = {};
    for (const cat of categories) {
      if (!map[cat.group]) map[cat.group] = [];
      map[cat.group].push(cat);
    }
    return map;
  }, [categories]);

  // Фильтрация по поиску
  const filtered = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    const result: Record<string, Category[]> = {};
    for (const [group, cats] of Object.entries(grouped)) {
      const matched = cats.filter(c => c.name.toLowerCase().includes(q) || group.toLowerCase().includes(q));
      if (matched.length > 0) result[group] = matched;
    }
    return result;
  }, [grouped, search]);

  const groups = Object.keys(filtered);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 100);
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const group = newGroup.trim() || (newParentId ? (categories.find(c => c.id === newParentId)?.group ?? 'Другое') : 'Другое');
    setCreating(true);
    try {
      await onCreateCategory({ group, name: newName.trim(), icon: newIcon, parent_id: newParentId ?? undefined });
      setShowCreate(false);
      setNewName(''); setNewGroup(''); setNewIcon('🛒'); setNewParentId(null);
    } finally {
      setCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-bg-secondary rounded-t-3xl border-t border-white/10 flex flex-col"
        style={{ maxHeight: '85vh' }}
      >
        {/* Хэндл */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Хедер */}
        <div className="flex items-center gap-3 px-5 py-3">
          <div className="flex-1 flex items-center gap-2 bg-bg-primary rounded-xl px-3 py-2 border border-white/5">
            <Search size={15} className="text-text-tertiary flex-shrink-0" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск категории..."
              className="flex-1 bg-transparent text-sm outline-none text-text-primary placeholder:text-text-muted"
            />
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-bg-primary flex items-center justify-center border border-white/5">
            <X size={16} className="text-text-secondary" />
          </button>
        </div>

        {/* Список */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2">
          {groups.length === 0 ? (
            <p className="text-center text-sm text-text-muted py-8">Ничего не найдено</p>
          ) : (
            groups.map(group => (
              <div key={group} className="rounded-2xl overflow-hidden border border-white/5">
                {/* Заголовок группы */}
                <button
                  type="button"
                  onClick={() => setExpandedGroup(expandedGroup === group ? null : group)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-bg-primary hover:bg-bg-tertiary transition-colors"
                >
                  <span className="font-semibold text-sm text-text-primary">{group}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">{filtered[group].length}</span>
                    <motion.div animate={{ rotate: expandedGroup === group ? 90 : 0 }}>
                      <ChevronRight size={15} className="text-text-muted" />
                    </motion.div>
                  </div>
                </button>

                {/* Подкатегории */}
                <AnimatePresence>
                  {(expandedGroup === group || search.trim()) && (
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-4 gap-2 p-3 bg-bg-secondary">
                        {filtered[group].map(cat => (
                          <CategoryCard
                            key={cat.id}
                            cat={cat}
                            isSelected={selectedId === cat.id}
                            onClick={() => { onSelect(cat); onClose(); }}
                            size="sm"
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}

          {/* Создать новую */}
          <AnimatePresence>
            {!showCreate ? (
              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                type="button"
                onClick={() => setShowCreate(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/40 transition-colors group"
              >
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Plus size={16} className="text-primary" />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">Создать категорию</span>
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-text-primary">Новая категория</h3>
                  <button type="button" onClick={() => setShowCreate(false)}>
                    <X size={15} className="text-text-muted" />
                  </button>
                </div>

                {/* Название */}
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Название категории"
                  autoFocus
                  className="w-full px-3 py-2.5 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none text-sm text-text-primary"
                />

                {/* Группа */}
                <div>
                  <p className="text-xs text-text-muted mb-1.5">Группа</p>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {Object.keys(grouped).map(g => (
                      <button
                        key={g} type="button"
                        onClick={() => { setNewGroup(g); setNewParentId(null); }}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${newGroup === g ? 'bg-primary text-white' : 'bg-bg-primary text-text-secondary hover:text-text-primary border border-white/5'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  <input
                    value={newGroup}
                    onChange={e => setNewGroup(e.target.value)}
                    placeholder="Или введи новую группу..."
                    className="w-full px-3 py-2 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none text-sm text-text-primary"
                  />
                </div>

                {/* Иконка */}
                <div>
                  <p className="text-xs text-text-muted mb-1.5">Иконка</p>
                  <div className="grid grid-cols-10 gap-1">
                    {CATEGORY_EMOJIS.map(emoji => (
                      <button
                        key={emoji} type="button"
                        onClick={() => setNewIcon(emoji)}
                        className={`h-9 rounded-lg text-lg flex items-center justify-center transition-colors ${newIcon === emoji ? 'bg-primary/20 ring-2 ring-primary' : 'bg-bg-primary hover:bg-bg-tertiary'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!newName.trim() || creating}
                  className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-50 transition-colors hover:bg-primary/90"
                >
                  {creating ? 'Создаём...' : 'Создать'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Основная форма ───────────────────────────────────────────────────────────
export function AddTransaction() {
  const navigate = useNavigate();
  const { addTransaction, categories, addCategory, transactions } = useTransactions();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentCats = categories[type] ?? [];
  const topCategories = useTopCategories(currentCats, transactions);

  useEffect(() => {
    api.getAccounts()
      .then(data => { setAccounts(data); if (data.length > 0) setSelectedAccountId(data[0].id); })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Не удалось загрузить счета'))
      .finally(() => setAccountsLoading(false));
  }, []);

  // Сбрасываем категорию при смене типа если она не подходит
  useEffect(() => {
    if (selectedCategory && !currentCats.find(c => c.id === selectedCategory.id)) {
      setSelectedCategory(null);
    }
  }, [type, currentCats, selectedCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const numericAmount = Number(amount);
    if (!selectedCategory || !Number.isFinite(numericAmount) || numericAmount <= 0) return;
    if (!selectedAccountId) { setSubmitError('Выберите счёт'); return; }
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    try {
      await addTransaction({
        name: note.trim() || selectedCategory.name,
        amount: numericAmount,
        account_id: selectedAccountId,
        category_id: selectedCategory.id,
        category_group: selectedCategory.group,
        category: selectedCategory.name,
        icon: selectedCategory.icon,
        date,
        time,
        type,
      });
      navigate('/');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Не удалось сохранить операцию');
    }
  };

  const handleCreateCategory = async (payload: { group: string; name: string; icon: string; parent_id?: string }) => {
    try {
      await addCategory(type, { group: payload.group, name: payload.name, icon: payload.icon, parent_id: payload.parent_id });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось создать категорию');
      throw err;
    }
  };

  const noAccounts = !accountsLoading && accounts.length === 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-10">

      {/* Хедер */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-bg-secondary flex items-center justify-center hover:bg-bg-tertiary transition-colors">
          <X size={18} className="text-text-secondary" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">Новая операция</h1>
        <div className="w-10" />
      </motion.div>

      {/* Предупреждение — нет счетов */}
      {noAccounts && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-5 p-4 rounded-2xl bg-warning/10 border border-warning/30 flex items-start gap-3">
          <AlertCircle size={18} className="text-warning mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-warning">Нет счетов</p>
            <p className="text-xs text-text-secondary mt-0.5">Сначала создайте счёт.</p>
            <Link to="/accounts" className="inline-block mt-2 text-xs text-primary-light underline">Перейти к счетам →</Link>
          </div>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {submitError && (
          <div className="px-4 py-3 rounded-xl border border-error/25 bg-error/10 text-sm text-error">{submitError}</div>
        )}

        {/* Тип */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="flex gap-2 p-1 bg-bg-secondary rounded-xl">
          <button type="button" onClick={() => setType('expense')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all ${type === 'expense' ? 'bg-error text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
            <ArrowDownLeft size={17} />Расход
          </button>
          <button type="button" onClick={() => setType('income')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all ${type === 'income' ? 'bg-success text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
            <ArrowUpRight size={17} />Доход
          </button>
        </motion.div>

        {/* Сумма */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="text-center py-5">
          <p className="text-text-secondary text-xs mb-3 uppercase tracking-widest">Сумма</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl text-text-muted">₽</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="text-5xl font-bold font-mono bg-transparent text-center focus:outline-none w-48 text-text-primary"
              autoFocus
            />
          </div>
        </motion.div>

        {/* Счёт */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <label className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2 block">
            Счёт <span className="text-error normal-case tracking-normal font-normal">*</span>
          </label>
          {accountsLoading ? (
            <div className="h-12 bg-bg-secondary rounded-xl animate-pulse" />
          ) : accounts.length === 0 ? (
            <div className="p-3 rounded-xl bg-bg-secondary border border-warning/20 text-sm text-text-secondary text-center">
              Нет счетов — <Link to="/accounts" className="text-primary-light underline">создать</Link>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {accounts.map(account => (
                <button key={account.id} type="button" onClick={() => setSelectedAccountId(account.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all border-2 ${selectedAccountId === account.id ? 'border-primary bg-primary/10' : 'border-transparent bg-bg-secondary hover:border-white/10'}`}>
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: account.color }} />
                  <CreditCard size={13} className="text-text-muted" />
                  <span className="font-medium text-text-primary">{account.name}</span>
                  <span className="text-text-muted font-mono text-xs">{Number(account.current_balance).toLocaleString('ru-RU')} ₽</span>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* ─── Категория: гибрид А+В ────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-text-secondary text-xs font-semibold uppercase tracking-wider">Категория</label>
            <button type="button" onClick={() => setShowBottomSheet(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-bg-secondary border border-white/5 hover:border-primary/30 text-text-secondary hover:text-primary-light transition-colors flex items-center gap-1">
              <Search size={11} />Все
            </button>
          </div>

          {/* Топ-8 быстрых */}
          {topCategories.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {topCategories.map(cat => (
                <CategoryCard
                  key={cat.id}
                  cat={cat}
                  isSelected={selectedCategory?.id === cat.id}
                  onClick={() => setSelectedCategory(cat)}
                />
              ))}
            </div>
          ) : (
            <button type="button" onClick={() => setShowBottomSheet(true)}
              className="w-full py-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/30 transition-colors text-sm text-text-muted hover:text-text-secondary">
              Выберите категорию →
            </button>
          )}

          {/* Выбранная категория */}
          <AnimatePresence>
            {selectedCategory && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary/8 border border-primary/20"
              >
                <span className="text-xl"><CategoryIcon icon={selectedCategory.icon} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{selectedCategory.name}</p>
                  <p className="text-xs text-text-muted">{selectedCategory.group}</p>
                </div>
                <button type="button" onClick={() => setSelectedCategory(null)}>
                  <X size={15} className="text-text-muted hover:text-text-secondary" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {selectedCategory?.is_other && (
            <div className="rounded-xl border border-warning/25 bg-warning/8 p-3 text-xs text-text-secondary">
              💡 Уточните категорию для лучшей аналитики — или оставьте как есть.
            </div>
          )}
        </motion.div>

        {/* Дата и примечание */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-3">
          <div>
            <label className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2 block">Дата</label>
            <div className="relative">
              <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-bg-secondary rounded-xl border border-white/5 focus:border-primary focus:outline-none text-sm text-text-primary transition-colors" />
            </div>
          </div>
          <div>
            <label className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2 block">Примечание</label>
            <div className="relative">
              <FileText size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="text" value={note} onChange={e => setNote(e.target.value)}
                placeholder="Описание (необязательно)"
                className="w-full pl-9 pr-4 py-3 bg-bg-secondary rounded-xl border border-white/5 focus:border-primary focus:outline-none text-sm text-text-primary transition-colors" />
            </div>
          </div>
        </motion.div>

        {/* Кнопка отправки */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Button
            type="submit" size="lg" className="w-full"
            disabled={!amount || !selectedCategory || !selectedAccountId || noAccounts}
          >
            {type === 'expense' ? 'Добавить расход' : 'Добавить доход'}
          </Button>
        </motion.div>
      </form>

      {/* Bottom Sheet */}
      <AnimatePresence>
        {showBottomSheet && (
          <CategoryBottomSheet
            type={type}
            categories={currentCats}
            selectedId={selectedCategory?.id ?? null}
            onSelect={cat => setSelectedCategory(cat)}
            onClose={() => setShowBottomSheet(false)}
            onCreateCategory={handleCreateCategory}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
