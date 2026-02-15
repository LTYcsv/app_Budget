import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
  Calendar,
  FileText,
  Tag,
  Wallet,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '@/context/TransactionsContext';
import { CategoryIcon } from '@/components/CategoryIcon';

const iconFiles = import.meta.glob('../assets/category-icons/*.{svg,png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const availableCategoryIcons = Object.entries(iconFiles)
  .map(([path, src]) => ({
    id: path.split('/').pop()?.replace(/\.[^.]+$/, '') || path,
    src,
  }))
  .sort((a, b) => a.id.localeCompare(b.id));

export function AddTransaction() {
  const navigate = useNavigate();
  const { addTransaction, categories, addCategory, deleteCategory } = useTransactions();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryGroup, setNewCategoryGroup] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (categories[type].length === 0) {
      setSelectedGroup(null);
      setSelectedCategory(null);
      return;
    }
    const groups = Array.from(new Set(categories[type].map((cat) => cat.group)));
    const safeGroup = selectedGroup && groups.includes(selectedGroup) ? selectedGroup : groups[0];
    setSelectedGroup(safeGroup);

    const availableInGroup = categories[type].filter((cat) => cat.group === safeGroup);
    const categoryExists = availableInGroup.some((cat) => cat.id === selectedCategory);
    if (!categoryExists) {
      setSelectedCategory(availableInGroup[0]?.id || null);
    }
  }, [type, categories, selectedCategory, selectedGroup]);
  
  useEffect(() => {
    if (!newCategoryIcon && availableCategoryIcons.length > 0) {
      setNewCategoryIcon(availableCategoryIcons[0].src);
    }
  }, [newCategoryIcon]);

  useEffect(() => {
    if (!showManageCategories) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!newCategoryGroup && selectedGroup) {
      setNewCategoryGroup(selectedGroup);
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showManageCategories, newCategoryGroup, selectedGroup]);

  const groups = Array.from(new Set(categories[type].map((cat) => cat.group)));
  const categoriesInGroup = selectedGroup ? categories[type].filter((cat) => cat.group === selectedGroup) : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const numericAmount = Number(amount);
    if (!selectedCategory || !Number.isFinite(numericAmount) || numericAmount <= 0) return;
    const category = categories[type].find((c) => c.id === selectedCategory);
    if (!category) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    try {
      await addTransaction({
        name: note.trim() || category.name,
        amount: numericAmount,
        category_id: category.id,
        category_group: category.group,
        category: category.name,
        icon: category.icon,
        date,
        time,
        type,
      });
      navigate('/');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Не удалось сохранить операцию');
    }
  };

  const handleAddCategory = async () => {
    setSubmitError(null);
    const trimmed = newCategoryName.trim();
    const trimmedGroup = newCategoryGroup.trim();
    if (!trimmed || !trimmedGroup || !newCategoryIcon) return;
    try {
      await addCategory(type, {
        group: trimmedGroup,
        name: trimmed,
        icon: newCategoryIcon,
      });
      setNewCategoryName('');
      setNewCategoryGroup('');
      setShowManageCategories(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Не удалось добавить категорию');
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-bg-secondary flex items-center justify-center hover:bg-bg-tertiary transition-colors"
        >
          ✕
        </button>
        <h1 className="text-xl font-bold">Новая операция</h1>
        <div className="w-10" />
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {submitError && (
          <div className="px-4 py-3 rounded-xl border border-error/25 bg-error/10 text-sm text-error">
            {submitError}
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 p-1 bg-bg-secondary rounded-xl"
        >
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${
              type === 'expense'
                ? 'bg-error text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <ArrowDownLeft size={18} />
            Расход
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${
              type === 'income'
                ? 'bg-success text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <ArrowUpRight size={18} />
            Доход
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center py-6"
        >
          <p className="text-text-secondary text-sm mb-2">Сумма</p>
          <div className="flex items-center justify-center gap-1">
            <span className="text-3xl text-text-tertiary">₽</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="text-5xl font-bold font-mono bg-transparent text-center focus:outline-none w-48"
              autoFocus
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <div>
            <label className="text-text-secondary text-sm mb-2 block">Группа</label>
            <div className="flex gap-2 flex-wrap">
              {groups.map((groupName) => (
                <button
                  key={groupName}
                  type="button"
                  onClick={() => setSelectedGroup(groupName)}
                  className={`px-3 py-2 rounded-xl text-sm transition-colors ${
                    selectedGroup === groupName
                      ? 'bg-primary text-white'
                      : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {groupName}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-text-secondary text-sm">Подкатегория</label>
            <button
              type="button"
              onClick={() => setShowManageCategories(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-bg-secondary border border-white/10 hover:border-primary/40 text-text-secondary"
            >
              Управлять
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {categoriesInGroup.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-primary/20 border-2 border-primary'
                    : 'bg-bg-secondary border-2 border-transparent hover:border-white/10'
                }`}
              >
                <CategoryIcon icon={cat.icon} />
                <span className="text-[10px] text-text-secondary">{cat.name}</span>
              </button>
            ))}
          </div>
          {categories[type].find((cat) => cat.id === selectedCategory)?.is_other && (
            <div className="rounded-xl border border-warning/25 bg-warning/10 p-3 text-xs text-text-secondary">
              Уточнение подкатегории улучшит точность аналитики. Можно оставить как есть и продолжить.
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-text-secondary text-sm mb-2 block">Дата</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-bg-secondary rounded-xl border border-white/5 focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-text-secondary text-sm mb-2 block">Примечание</label>
            <div className="relative">
              <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Описание (необязательно)"
                className="w-full pl-10 pr-4 py-3 bg-bg-secondary rounded-xl border border-white/5 focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-2"
        >
          <label className="text-text-secondary text-sm">Быстрые метки</label>
          <div className="flex gap-2 flex-wrap">
            {['Еженедельно', 'Ежемесячно', 'Разовое'].map((tag) => (
              <button
                key={tag}
                type="button"
                className="px-3 py-1.5 bg-bg-secondary rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
              >
                <Tag size={12} className="inline mr-1" />
                {tag}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex gap-3"
        >
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-bg-secondary rounded-xl text-text-secondary hover:text-text-primary transition-colors"
          >
            <Camera size={18} />
            Сканировать чек
          </button>
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-bg-secondary rounded-xl text-text-secondary hover:text-text-primary transition-colors"
          >
            <Wallet size={18} />
            Выбрать копилку
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!amount || !selectedCategory}
          >
            {type === 'expense' ? 'Добавить расход' : 'Добавить доход'}
          </Button>
        </motion.div>
      </form>

      {showManageCategories && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 flex items-end sm:items-center justify-center">
          <div className="w-full max-w-lg bg-bg-secondary rounded-3xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Управление категориями</h2>
              <button
                type="button"
                onClick={() => setShowManageCategories(false)}
                className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center"
                aria-label="Закрыть"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-auto pr-1 mb-4">
              {categories[type].map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-bg-primary rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 min-w-0">
                    <CategoryIcon icon={cat.icon} />
                    <span className="text-sm truncate">{cat.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Удалить категорию "${cat.name}"?`)) {
                        void deleteCategory(type, cat.id);
                      }
                    }}
                    className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center text-error hover:opacity-80"
                    aria-label="Удалить категорию"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Новая категория</h3>
              <input
                type="text"
                value={newCategoryGroup}
                onChange={(e) => setNewCategoryGroup(e.target.value)}
                placeholder="Группа (например, Транспорт)"
                className="w-full px-3 py-2 bg-bg-primary rounded-lg border border-white/5 focus:border-primary focus:outline-none"
              />
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Название"
                className="w-full px-3 py-2 bg-bg-primary rounded-lg border border-white/5 focus:border-primary focus:outline-none"
              />
              <div className="space-y-2">
                <p className="text-xs text-text-tertiary">Выберите иконку</p>
                <div className="grid grid-cols-6 gap-2">
                  {availableCategoryIcons.map((icon) => (
                    <button
                      key={icon.id}
                      type="button"
                      onClick={() => setNewCategoryIcon(icon.src)}
                      className={`h-11 rounded-lg border transition-colors flex items-center justify-center ${
                        newCategoryIcon === icon.src
                          ? 'border-primary bg-primary/10'
                          : 'border-white/10 bg-bg-primary hover:border-primary/40'
                      }`}
                      aria-label={`Иконка ${icon.id}`}
                    >
                      <CategoryIcon icon={icon.src} />
                    </button>
                  ))}
                </div>
              </div>
              <Button type="button" className="w-full" onClick={handleAddCategory} icon={<Plus size={16} />}>
                Добавить категорию
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
