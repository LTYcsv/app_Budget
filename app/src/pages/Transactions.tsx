import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  List,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from '@/components/ui/empty';
import { useTransactions, type Transaction } from '@/context/TransactionsContext';
import { Button } from '@/components/Button';
import { CategoryIcon } from '@/components/CategoryIcon';

const groupByDate = (items: Transaction[]) => {
  const grouped: { [key: string]: Transaction[] } = {};
  items.forEach((tx) => {
    if (!grouped[tx.date]) grouped[tx.date] = [];
    grouped[tx.date].push(tx);
  });
  return grouped;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Сегодня';
  if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
};

const inputStyle = {
  background: 'var(--surface-2)',
  border: '1px solid var(--nav-border)',
  borderRadius: 12,
  padding: '12px 16px',
  width: '100%',
  color: 'inherit',
  fontSize: 14,
  outline: 'none',
} as const;

export function Transactions() {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');
  const [editCategory, setEditCategory] = useState<string>('other');
  const [editAmount, setEditAmount] = useState('');
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [filterOpen, setFilterOpen] = useState(false);
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { transactions, categories, updateTransaction, deleteTransaction } = useTransactions();

  const allGroups = useMemo(() => {
    const seen = new Set<string>();
    transactions.forEach(tx => { if (tx.category_group) seen.add(tx.category_group); });
    return [...seen].sort();
  }, [transactions]);

  const activeFiltersCount = [groupFilter, dateFrom, dateTo].filter(Boolean).length;

  const filteredTransactions = transactions.filter((tx) => {
    if (filter !== 'all' && tx.type !== filter) return false;
    if (searchQuery && !tx.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (groupFilter && tx.category_group !== groupFilter) return false;
    if (dateFrom && tx.date < dateFrom) return false;
    if (dateTo && tx.date > dateTo) return false;
    return true;
  });

  useEffect(() => { setVisibleCount(10); }, [filter, searchQuery, groupFilter, dateFrom, dateTo]);

  const visibleTransactions = filteredTransactions.slice(0, visibleCount);
  const hasMore = visibleCount < filteredTransactions.length;
  const grouped = groupByDate(visibleTransactions);

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    const txTypeForEdit = tx.type === 'transfer' ? 'expense' : tx.type;
    setEditType(txTypeForEdit);
    const available = categories[txTypeForEdit];
    const matched = available.find((item) => item.id === tx.category_id) || available.find((item) => item.name === tx.category);
    setEditCategory(matched?.id || available[0]?.id || '');
    setEditAmount(String(tx.amount));
    setEditName(tx.name);
    setEditDate(tx.date);
    setEditTime(tx.time);
  };

  const closeEditModal = () => { setEditingTx(null); setActionError(null); };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!editingTx) return;
    const numericAmount = Number(editAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return;
    const category = categories[editType].find((item) => item.id === editCategory);
    if (!category) return;
    try {
      await updateTransaction(editingTx.id, {
        type: editType,
        amount: numericAmount,
        category_id: category.id,
        category_group: category.group,
        category: category.name,
        icon: category.icon,
        name: editName.trim() || category.name,
        date: editDate,
        time: editTime,
      });
      closeEditModal();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось обновить операцию');
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <h1 className="display" style={{ fontSize: 22 }}>История</h1>
        <button
          onClick={() => setFilterOpen(true)}
          className="relative w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--surface-2)' }}
        >
          <Filter size={18} style={{ color: activeFiltersCount > 0 ? 'var(--nav-accent)' : 'var(--text-dim)' }} />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
              style={{ background: 'var(--nav-accent)' }}>
              {activeFiltersCount}
            </span>
          )}
        </button>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск операций..."
          style={{ ...inputStyle, paddingLeft: 44 }}
        />
      </motion.div>

      {/* Filter tabs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex gap-2">
        {[
          { key: 'all', label: 'Все' },
          { key: 'expense', label: 'Расходы' },
          { key: 'income', label: 'Доходы' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: filter === f.key ? 'var(--nav-accent)' : 'var(--surface-2)',
              color: filter === f.key ? '#fff' : 'var(--text-dim)',
            }}
          >
            {f.label}
          </button>
        ))}
      </motion.div>

      {/* Transactions list */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="space-y-4">
        {Object.entries(grouped).length === 0 ? (
          <Empty className="chek-flat">
            <EmptyHeader>
              <EmptyMedia variant="icon"><List /></EmptyMedia>
              <EmptyTitle>История пуста</EmptyTitle>
              <EmptyDescription>Добавьте первую операцию, и она появится здесь.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent />
          </Empty>
        ) : (
          Object.entries(grouped).map(([date, txs], groupIndex) => (
            <div key={date}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>{formatDate(date)}</h3>
                <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{txs.length} операций</span>
              </div>
              <div className="space-y-2">
                {txs.map((tx, i) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + groupIndex * 0.1 + i * 0.05 }}
                    className="chek-flat flex items-center gap-3"
                    style={{ padding: 12 }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: 'var(--surface-2)' }}>
                      <CategoryIcon icon={tx.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{tx.name}</p>
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-dim)' }}>
                        <span>{tx.category}</span>
                        <span>•</span>
                        <span>{tx.time}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {tx.type === 'income' ? (
                        <ArrowUpRight size={16} className="text-success" />
                      ) : (
                        <ArrowDownLeft size={16} className="text-error" />
                      )}
                      <span className={`num font-semibold ${tx.type === 'income' ? 'text-success' : ''}`}>
                        {tx.type === 'income' ? '+' : ''}
                        {Math.abs(tx.amount).toLocaleString('ru-RU')} ₽
                      </span>
                      <button
                        type="button"
                        onClick={() => openEditModal(tx)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
                        style={{ background: 'var(--surface-2)', color: 'var(--text-dim)' }}
                        aria-label="Редактировать"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm('Удалить эту операцию?')) {
                            try {
                              setActionError(null);
                              await deleteTransaction(tx.id);
                            } catch (err) {
                              setActionError(err instanceof Error ? err.message : 'Не удалось удалить операцию');
                            }
                          }
                        }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-error hover:opacity-80 transition-opacity"
                        style={{ background: 'var(--surface-2)' }}
                        aria-label="Удалить"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}
      </motion.div>

      {/* Load more */}
      {hasMore && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-center pt-4">
          <button
            onClick={() => setVisibleCount(c => c + 10)}
            className="flex items-center gap-2 mx-auto transition-colors"
            style={{ color: 'var(--text-dim)' }}
          >
            <span className="text-sm">Загрузить ещё</span>
            <ChevronDown size={16} />
          </button>
        </motion.div>
      )}

      {/* Filter modal */}
      <AnimatePresence>
        {filterOpen && (
          <motion.div
            key="filter-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setFilterOpen(false)}
          >
            <motion.div
              key="filter-sheet"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="chek-card w-full max-w-lg space-y-5"
              style={{ padding: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="display" style={{ fontSize: 18 }}>Фильтры</h2>
                <div className="flex items-center gap-2">
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={() => { setGroupFilter(null); setDateFrom(''); setDateTo(''); }}
                      className="text-xs font-medium"
                      style={{ color: 'var(--nav-accent)' }}
                    >
                      Сбросить
                    </button>
                  )}
                  <button onClick={() => setFilterOpen(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--surface-2)' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Период</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['От', 'До'] as const).map((label, idx) => (
                    <div key={label}>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-dim)' }}>{label}</label>
                      <input
                        type="date"
                        value={idx === 0 ? dateFrom : dateTo}
                        onChange={(e) => idx === 0 ? setDateFrom(e.target.value) : setDateTo(e.target.value)}
                        style={{ ...inputStyle, padding: '10px 12px', fontSize: 13 }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[{ label: 'Сегодня', days: 0 }, { label: '7 дней', days: 7 }, { label: '30 дней', days: 30 }].map(({ label, days }) => (
                    <button
                      key={label}
                      onClick={() => {
                        const to = new Date();
                        const from = new Date();
                        from.setDate(to.getDate() - days);
                        setDateTo(to.toISOString().split('T')[0]);
                        setDateFrom(from.toISOString().split('T')[0]);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--nav-border)', color: 'var(--text-dim)' }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {allGroups.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Категория</p>
                  <div className="flex flex-wrap gap-2">
                    {allGroups.map((group) => (
                      <button
                        key={group}
                        onClick={() => setGroupFilter(groupFilter === group ? null : group)}
                        className="px-3 py-1.5 rounded-xl text-sm font-medium transition-colors"
                        style={{
                          background: groupFilter === group ? 'var(--nav-accent)' : 'var(--surface-2)',
                          border: `1px solid ${groupFilter === group ? 'var(--nav-accent)' : 'var(--nav-border)'}`,
                          color: groupFilter === group ? '#fff' : 'var(--text-dim)',
                        }}
                      >
                        {group}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={() => setFilterOpen(false)} className="w-full">Применить</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 flex items-end sm:items-center justify-center">
          <div className="chek-card w-full max-w-lg" style={{ padding: 20 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="display" style={{ fontSize: 18 }}>Редактировать операцию</h2>
              <button type="button" onClick={closeEditModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--surface-2)' }} aria-label="Закрыть">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={saveEdit} className="space-y-4">
              {actionError && (
                <div className="px-4 py-3 rounded-xl border border-error/25 bg-error/10 text-sm text-error">
                  {actionError}
                </div>
              )}
              <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                <button type="button" onClick={() => setEditType('expense')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${editType === 'expense' ? 'bg-error text-white' : 'text-text-secondary'}`}>
                  Расход
                </button>
                <button type="button" onClick={() => setEditType('income')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${editType === 'income' ? 'bg-success text-white' : 'text-text-secondary'}`}>
                  Доход
                </button>
              </div>
              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--text-dim)' }}>Сумма</label>
                <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--text-dim)' }}>Название</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--text-dim)' }}>Категория</label>
                <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} style={inputStyle}>
                  {categories[editType].map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.group} / {cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm mb-1 block" style={{ color: 'var(--text-dim)' }}>Дата</label>
                  <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label className="text-sm mb-1 block" style={{ color: 'var(--text-dim)' }}>Время</label>
                  <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Button type="button" variant="ghost" onClick={closeEditModal}>Отмена</Button>
                <Button type="submit">Сохранить</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
