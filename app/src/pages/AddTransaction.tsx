import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownLeft, ArrowUpRight, Calendar, FileText,
  Plus, X, CreditCard, AlertCircle, Search, ChevronRight, Trash2,
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

// ─── Хук: группы категорий ────────────────────────────────────────────────────
function useGroups(categories: Category[]): Record<string, Category[]> {
  return useMemo(() => {
    const map: Record<string, Category[]> = {};
    for (const cat of categories) {
      if (cat.is_hidden) continue;
      if (!map[cat.group]) map[cat.group] = [];
      map[cat.group].push(cat);
    }
    return map;
  }, [categories]);
}

// Топ-N групп по частоте транзакций
function useTopGroupNames(
  groups: Record<string, Category[]>,
  transactions: { category_id?: string | null }[],
  limit = 8,
): string[] {
  return useMemo(() => {
    const freq: Record<string, number> = {};
    for (const tx of transactions) {
      if (!tx.category_id) continue;
      for (const [group, cats] of Object.entries(groups)) {
        if (cats.some(c => c.id === tx.category_id)) {
          freq[group] = (freq[group] || 0) + 1;
          break;
        }
      }
    }
    const allGroups = Object.keys(groups);
    // Сортируем: сначала использованные (по частоте), потом остальные
    const sorted = [...allGroups].sort((a, b) => (freq[b] || 0) - (freq[a] || 0));
    return sorted.slice(0, limit);
  }, [groups, transactions, limit]);
}

// Топ-иконка группы = первая подкатегория группы
function getGroupIcon(cats: Category[]): string {
  return cats[0]?.icon ?? '📦';
}

// ─── Компонент: карточка группы ─────────────────────────────────────────────
function GroupCard({
  group,
  cats,
  isSelected,
  onClick,
}: {
  group: string;
  cats: Category[];
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.93 }}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-transparent bg-bg-secondary hover:border-white/10'
      }`}
    >
      <span className="text-2xl">{getGroupIcon(cats)}</span>
      <span className={`text-[10px] font-medium text-center leading-tight ${isSelected ? 'text-primary-light' : 'text-text-secondary'}`}>
        {group}
      </span>
    </motion.button>
  );
}

// ─── Компонент: карточка подкатегории ────────────────────────────────────────
function SubcategoryCard({
  cat,
  isSelected,
  onClick,
}: {
  cat: Category;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.93 }}
      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all ${
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-transparent bg-bg-tertiary hover:border-white/10'
      }`}
    >
      <span className="text-xl"><CategoryIcon icon={cat.icon} /></span>
      <span className={`text-[9px] font-medium text-center leading-tight ${isSelected ? 'text-primary-light' : 'text-text-secondary'}`}>
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
  onDeleteCategory,
}: {
  type?: 'expense' | 'income';
  categories: Category[];
  selectedId: string | null;
  onSelect: (cat: Category) => void;
  onClose: () => void;
  onCreateCategory: (payload: { group: string; name: string; icon: string; parent_id?: string }) => Promise<void>;
  onDeleteCategory?: (cat: Category) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [newIcon, setNewIcon] = useState('🛒');
  const [creating, setCreating] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Группируем по group
  const grouped = useMemo(() => {
    const map: Record<string, Category[]> = {};
    for (const cat of categories) {
      if (cat.is_hidden) continue;
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
    if (!newGroup.trim() && !newName.trim()) return;
    // newGroup = название категории (группы), newSubName = подкатегория (необязательно)
    const groupName = newGroup.trim() || newName.trim();
    const subName = newGroup.trim() ? (newSubName.trim() || newGroup.trim()) : '';
    setCreating(true);
    try {
      if (subName) {
        // Создаём подкатегорию внутри группы
        await onCreateCategory({ group: groupName, name: subName, icon: newIcon });
      } else {
        // Создаём категорию без подкатегории (подкатегория = сама категория)
        await onCreateCategory({ group: groupName, name: groupName, icon: newIcon });
      }
      setShowCreate(false);
      setNewName(''); setNewSubName(''); setNewGroup(''); setNewIcon('🛒');
    } finally {
      setCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-bg-secondary rounded-3xl border border-white/10 flex flex-col shadow-card"
        style={{ maxHeight: '85vh' }}
      >
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
          ) : groups.map(group => {
            const groupCats = filtered[group] ?? [];
            const isCustomGroup = groupCats.every(c => c.is_custom);
            return (
              <div key={group} className="rounded-2xl overflow-hidden border border-white/5">
                {/* Строка группы */}
                <div className="w-full flex items-center bg-bg-primary hover:bg-bg-tertiary transition-colors">
                  <button
                    type="button"
                    onClick={() => setExpandedGroup(expandedGroup === group ? null : group)}
                    className="flex-1 flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-text-primary">{group}</span>
                      {isCustomGroup && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-primary/15 text-primary-light font-medium">моя</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">{groupCats.length}</span>
                      <motion.div animate={{ rotate: expandedGroup === group ? 90 : 0 }}>
                        <ChevronRight size={15} className="text-text-muted" />
                      </motion.div>
                    </div>
                  </button>
                  {isCustomGroup && onDeleteCategory && (
                    <button
                      type="button"
                      disabled={deletingGroup === group}
                      onClick={async () => {
                        if (!window.confirm(`Удалить категорию «${group}» и все её подкатегории?`)) return;
                        setDeletingGroup(group);
                        try {
                          for (const cat of groupCats) await onDeleteCategory(cat);
                        } finally {
                          setDeletingGroup(null);
                        }
                      }}
                      className="pr-4 pl-2 py-3 text-error hover:text-error/70 transition-colors disabled:opacity-40"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Подкатегории */}
                <AnimatePresence>
                  {(expandedGroup === group || search.trim()) && (
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-4 gap-2 p-3 bg-bg-secondary">
                        {groupCats.map(cat => (
                          <SubcategoryCard
                            key={cat.id}
                            cat={cat}
                            isSelected={selectedId === cat.id}
                            onClick={() => { onSelect(cat); onClose(); }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

                    {/* Создать новую */}
          <AnimatePresence>
            {!showCreate ? (
              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                type="button"
                onClick={() => { setShowCreate(true); setNewName(''); setNewSubName(''); setNewGroup(''); setNewIcon('🛒'); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/40 transition-colors group"
              >
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Plus size={16} className="text-primary" />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">Добавить подкатегорию</span>
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-text-primary">Новая категория</h3>
                  <button type="button" onClick={() => setShowCreate(false)}>
                    <X size={15} className="text-text-muted" />
                  </button>
                </div>

                {/* Шаг 1: Категория */}
                <div>
                  <p className="text-xs text-text-muted mb-2 uppercase tracking-wider">1. Категория</p>
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {Object.keys(grouped).map(g => (
                      <button
                        key={g} type="button"
                        onClick={() => setNewGroup(newGroup === g ? '' : g)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${newGroup === g ? 'bg-primary text-white' : 'bg-bg-primary text-text-secondary hover:text-text-primary border border-white/5'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  <input
                    value={newGroup}
                    onChange={e => setNewGroup(e.target.value)}
                    placeholder="Или введи новую категорию..."
                    autoFocus
                    className="w-full px-3 py-2.5 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none text-sm text-text-primary"
                  />
                </div>

                {/* Шаг 2: Подкатегория (необязательно) */}
                <div>
                  <p className="text-xs text-text-muted mb-2 uppercase tracking-wider">2. Подкатегория <span className="normal-case tracking-normal">(необязательно)</span></p>
                  <input
                    value={newSubName}
                    onChange={e => setNewSubName(e.target.value)}
                    placeholder="Например: Такси, Аренда, Кофе..."
                    className="w-full px-3 py-2.5 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none text-sm text-text-primary"
                  />
                </div>

                {/* Шаг 3: Иконка */}
                <div>
                  <p className="text-xs text-text-muted mb-2 uppercase tracking-wider">3. Иконка</p>
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
                  disabled={(!newGroup.trim() && !newName.trim()) || creating}
                  className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-50 transition-colors hover:bg-primary/90"
                >
                  {creating ? 'Создаём...' : 'Добавить'}
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
  const { addTransaction, categories, addCategory, deleteCategory, transactions } = useTransactions();
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
  const groups = useGroups(currentCats);
  const topGroupNames = useTopGroupNames(groups, transactions);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    api.getAccounts()
      .then(data => { setAccounts(data); if (data.length > 0) setSelectedAccountId(data[0].id); })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Не удалось загрузить счета'))
      .finally(() => setAccountsLoading(false));
  }, []);

  // Сбрасываем при смене типа
  useEffect(() => {
    if (selectedCategory && !currentCats.find(c => c.id === selectedCategory.id)) {
      setSelectedCategory(null);
      setSelectedGroup(null);
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

  const handleDeleteCategory = async (cat: Category) => {
    try {
      const txType = type as 'expense' | 'income';
      await deleteCategory(txType, cat.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось удалить категорию');
      throw err;
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

        {/* ─── Категория ──────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-text-secondary text-xs font-semibold uppercase tracking-wider">Категория</label>
            <button type="button" onClick={() => setShowBottomSheet(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-bg-secondary border border-white/5 hover:border-primary/30 text-text-secondary hover:text-primary-light transition-colors flex items-center gap-1">
              <Search size={11} />Все
            </button>
          </div>

          {/* Сетка групп */}
          {topGroupNames.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {topGroupNames.map(group => (
                <GroupCard
                  key={group}
                  group={group}
                  cats={groups[group]}
                  isSelected={selectedGroup === group}
                  onClick={() => {
                    if (selectedGroup === group) {
                      setSelectedGroup(null);
                    } else {
                      setSelectedGroup(group);
                      // Сбрасываем подкатегорию если меняем группу
                      if (selectedCategory?.group !== group) setSelectedCategory(null);
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <button type="button" onClick={() => setShowBottomSheet(true)}
              className="w-full py-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/30 transition-colors text-sm text-text-muted hover:text-text-secondary">
              Выберите категорию →
            </button>
          )}

          {/* Подкатегории выбранной группы */}
          <AnimatePresence>
            {selectedGroup && groups[selectedGroup] && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="pt-1 pb-0.5">
                  <p className="text-text-muted text-[10px] uppercase tracking-wider mb-2 px-0.5">{selectedGroup}</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {groups[selectedGroup].map(cat => (
                      <SubcategoryCard
                        key={cat.id}
                        cat={cat}
                        isSelected={selectedCategory?.id === cat.id}
                        onClick={() => setSelectedCategory(cat)}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Выбранная подкатегория */}
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
                <button type="button" onClick={() => { setSelectedCategory(null); }}>
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
            onDeleteCategory={async (cat) => { await handleDeleteCategory(cat); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
