import { useState } from 'react';
import { motion } from 'framer-motion';
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
    if (!grouped[tx.date]) {
      grouped[tx.date] = [];
    }
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
  const { transactions, categories, updateTransaction, deleteTransaction } = useTransactions();

  const filteredTransactions = transactions.filter((tx) => {
    if (filter !== 'all' && tx.type !== filter) return false;
    if (searchQuery && !tx.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const grouped = groupByDate(filteredTransactions);

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setEditType(tx.type);
    const available = categories[tx.type];
    const matched = available.find((item) => item.name === tx.category);
    setEditCategory(matched?.id || available[0]?.id || '');
    setEditAmount(String(tx.amount));
    setEditName(tx.name);
    setEditDate(tx.date);
    setEditTime(tx.time);
  };

  const closeEditModal = () => {
    setEditingTx(null);
    setActionError(null);
  };

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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-2xl font-bold">История</h1>
        <button className="w-10 h-10 rounded-xl bg-bg-secondary flex items-center justify-center">
          <Filter size={18} className="text-text-secondary" />
        </button>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative"
      >
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск операций..."
          className="w-full pl-12 pr-4 py-3 bg-bg-secondary rounded-xl border border-white/5 focus:border-primary focus:outline-none transition-colors"
        />
      </motion.div>

      {/* Filter tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-2"
      >
        {[
          { key: 'all', label: 'Все' },
          { key: 'expense', label: 'Расходы' },
          { key: 'income', label: 'Доходы' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-primary text-white'
                : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </motion.div>

      {/* Transactions list */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        {Object.entries(grouped).length === 0 ? (
          <Empty className="border border-white/5 bg-bg-secondary">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <List />
              </EmptyMedia>
              <EmptyTitle>История пуста</EmptyTitle>
              <EmptyDescription>Добавьте первую операцию, и она появится здесь.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent />
          </Empty>
        ) : (
          Object.entries(grouped).map(([date, txs], groupIndex) => (
            <div key={date}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-text-secondary text-sm font-medium">{formatDate(date)}</h3>
                <span className="text-text-tertiary text-xs">
                  {txs.length} операций
                </span>
              </div>
              <div className="space-y-2">
                {txs.map((tx, i) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + groupIndex * 0.1 + i * 0.05 }}
                    className="flex items-center gap-3 p-3 bg-bg-secondary rounded-2xl border border-white/5 hover:border-primary/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center text-xl">
                      <CategoryIcon icon={tx.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{tx.name}</p>
                      <div className="flex items-center gap-2 text-text-tertiary text-xs">
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
                      <span
                        className={`font-mono font-semibold ${
                          tx.type === 'income' ? 'text-success' : 'text-text-primary'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : ''}
                        {Math.abs(tx.amount).toLocaleString('ru-RU')} ₽
                      </span>
                      <button
                        type="button"
                        onClick={() => openEditModal(tx)}
                        className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
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
                        className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center text-error hover:opacity-80 transition-opacity"
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
      {Object.entries(grouped).length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center pt-4"
        >
          <button className="flex items-center gap-2 mx-auto text-text-secondary hover:text-text-primary transition-colors">
            <span className="text-sm">Загрузить ещё</span>
            <ChevronDown size={16} />
          </button>
        </motion.div>
      )}

      {editingTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 flex items-end sm:items-center justify-center">
          <div className="w-full max-w-lg bg-bg-secondary rounded-3xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Редактировать операцию</h2>
              <button
                type="button"
                onClick={closeEditModal}
                className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center"
                aria-label="Закрыть"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={saveEdit} className="space-y-4">
              {actionError && (
                <div className="px-4 py-3 rounded-xl border border-error/25 bg-error/10 text-sm text-error">
                  {actionError}
                </div>
              )}
              <div className="flex gap-2 p-1 bg-bg-primary rounded-xl">
                <button
                  type="button"
                  onClick={() => setEditType('expense')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${
                    editType === 'expense' ? 'bg-error text-white' : 'text-text-secondary'
                  }`}
                >
                  Расход
                </button>
                <button
                  type="button"
                  onClick={() => setEditType('income')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${
                    editType === 'income' ? 'bg-success text-white' : 'text-text-secondary'
                  }`}
                >
                  Доход
                </button>
              </div>
              <div>
                <label className="text-sm text-text-secondary mb-1 block">Сумма</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary mb-1 block">Название</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary mb-1 block">Категория</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none"
                >
                  {categories[editType].map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-text-secondary mb-1 block">Дата</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-text-secondary mb-1 block">Время</label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Button type="button" variant="ghost" onClick={closeEditModal}>
                  Отмена
                </Button>
                <Button type="submit">Сохранить</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
