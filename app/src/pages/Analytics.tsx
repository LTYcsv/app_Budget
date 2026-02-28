import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react';
import { api, type ApiSummary, type ApiCategorySpendItem } from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateDisplay(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function getDefaultRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  return {
    from: start.toISOString().split('T')[0],
    to: end.toISOString().split('T')[0],
  };
}

function formatAmount(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatPercent(value: string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${parseFloat(value).toFixed(1)}%`;
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function SavingsStatusBadge({ status }: { status: ApiSummary['savings_status'] }) {
  if (!status || status === 'no_income') {
    return (
      <span className="flex items-center gap-1 text-xs text-text-secondary">
        <Minus size={12} /> Нет данных о доходе
      </span>
    );
  }
  if (status === 'surplus') {
    return (
      <span className="flex items-center gap-1 text-xs text-green-400">
        <TrendingUp size={12} /> Профицит
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-red-400">
      <TrendingDown size={12} /> Дефицит
    </span>
  );
}

function SummaryCard({ summary, loading }: { summary: ApiSummary | null; loading: boolean }) {
  const balanceNum = summary ? parseFloat(summary.balance) : 0;
  const isPositive = balanceNum >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl p-5 border border-white/5 overflow-hidden relative"
      style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.08) 100%)',
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 blur-2xl pointer-events-none"
        style={{ background: isPositive ? '#4ade80' : '#f87171' }}
      />

      <p className="text-sm text-text-secondary mb-3">Денежный поток</p>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-8 w-40 bg-white/10 rounded-lg" />
          <div className="h-4 w-24 bg-white/5 rounded" />
        </div>
      ) : (
        <>
          <p
            className="text-3xl font-bold mb-1 tabular-nums"
            style={{ color: isPositive ? '#4ade80' : '#f87171' }}
          >
            {formatAmount(summary?.balance)}
          </p>
          <SavingsStatusBadge status={summary?.savings_status ?? null} />

          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/5">
            <div>
              <p className="text-xs text-text-secondary mb-1">Доход</p>
              <p className="text-base font-semibold text-green-400 tabular-nums">
                {formatAmount(summary?.income)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-1">Расход</p>
              <p className="text-base font-semibold text-red-400 tabular-nums">
                {formatAmount(summary?.expense)}
              </p>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

function SavingsRateCard({ summary, loading }: { summary: ApiSummary | null; loading: boolean }) {
  const rate = summary?.savings_rate ? parseFloat(summary.savings_rate) : null;
  const pct = rate !== null ? Math.min(Math.max(rate, 0), 100) : 0;

  // Цвет индикатора по уровню SR
  const color =
    rate === null ? '#6b7280'
    : rate < 0 ? '#f87171'
    : rate < 10 ? '#fb923c'
    : rate < 20 ? '#facc15'
    : '#4ade80';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl p-5 border border-white/5 bg-bg-secondary"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-text-secondary">Норма сбережений</p>
        {!loading && summary?.savings_status && summary.savings_status !== 'no_income' && (
          <SavingsStatusBadge status={summary.savings_status} />
        )}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-7 w-20 bg-white/10 rounded-lg" />
          <div className="h-2 w-full bg-white/5 rounded-full" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold tabular-nums mb-3" style={{ color }}>
            {rate !== null ? `${rate.toFixed(1)}%` : '—'}
          </p>

          {/* Progress bar */}
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              className="h-full rounded-full"
              style={{ background: color }}
            />
          </div>

          <div className="flex justify-between mt-1">
            <span className="text-xs text-text-tertiary">0%</span>
            <span className="text-xs text-text-tertiary">Цель: 20%</span>
            <span className="text-xs text-text-tertiary">100%</span>
          </div>
        </>
      )}
    </motion.div>
  );
}

function CategoryBar({
  item,
  index,
}: {
  item: ApiCategorySpendItem;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const pct = parseFloat(item.percent);
  const hasSubcategories = item.subcategories.length > 0;

  // Палитра для категорий
  const COLORS = [
    '#818cf8', '#a78bfa', '#f472b6', '#fb923c',
    '#facc15', '#34d399', '#38bdf8', '#e879f9',
  ];
  const color = COLORS[index % COLORS.length];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * index }}
    >
      <button
        onClick={() => hasSubcategories && setOpen((v) => !v)}
        className={`w-full text-left ${hasSubcategories ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{item.icon}</span>
            <span className="text-sm font-medium">{item.group}</span>
            {hasSubcategories && (
              <motion.div
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={14} className="text-text-tertiary" />
              </motion.div>
            )}
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold tabular-nums">{formatAmount(item.amount)}</span>
            <span className="text-xs text-text-secondary ml-2">{formatPercent(item.percent)}</span>
          </div>
        </div>

        {/* Progress bar категории */}
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 * index }}
            className="h-full rounded-full"
            style={{ background: color }}
          />
        </div>
      </button>

      {/* Подкатегории */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-2 ml-7 space-y-2 pb-1">
              {item.subcategories.map((sub) => (
                <div key={sub.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{sub.icon}</span>
                    <span className="text-xs text-text-secondary">{sub.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs tabular-nums">{formatAmount(sub.amount)}</span>
                    <span className="text-xs text-text-tertiary ml-1">
                      {formatPercent(sub.percent_of_group)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CategorySpendCard({
  items,
  total,
  loading,
}: {
  items: ApiCategorySpendItem[];
  total: string;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl p-5 border border-white/5 bg-bg-secondary"
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-text-secondary">Расходы по категориям</p>
        <span className="text-sm font-semibold tabular-nums">{formatAmount(total)}</span>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between">
                <div className="h-4 w-28 bg-white/10 rounded" />
                <div className="h-4 w-16 bg-white/5 rounded" />
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-6">
          Нет расходов за выбранный период
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((item, i) => (
            <CategoryBar
              key={item.group}
              item={item}
              index={i}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Analytics() {
  const defaults = getDefaultRange();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);

  const [summary, setSummary] = useState<ApiSummary | null>(null);
  const [categoryItems, setCategoryItems] = useState<ApiCategorySpendItem[]>([]);
  const [categoryTotal, setCategoryTotal] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (from: string, to: string) => {
    if (!from || !to) return;
    setLoading(true);
    setError(null);
    try {
      const [summaryData, categoryData] = await Promise.all([
        api.getSummary(from, to),
        api.getCategorySpend(from, to),
      ]);
      setSummary(summaryData);
      setCategoryItems(categoryData.items);
      setCategoryTotal(categoryData.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  // Загрузка при монтировании
  useEffect(() => {
    void fetchData(dateFrom, dateTo);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Загрузка при смене дат (с дебаунсом 500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchData(dateFrom, dateTo);
    }, 500);
    return () => clearTimeout(timer);
  }, [dateFrom, dateTo, fetchData]);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-2xl font-bold">Аналитика</h1>
        <div className="flex items-center gap-2 px-3 py-2 bg-bg-secondary rounded-xl text-sm text-text-secondary">
          <Calendar size={16} />
          {formatDateDisplay(dateFrom)} — {formatDateDisplay(dateTo)}
        </div>
      </motion.div>

      {/* Date picker */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-bg-secondary rounded-2xl p-4 border border-white/5"
      >
        <p className="text-sm text-text-secondary mb-3">Диапазон дат</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-tertiary mb-1 block">От</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-bg-primary rounded-lg border border-white/5 focus:border-primary focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-text-tertiary mb-1 block">До</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-bg-primary rounded-lg border border-white/5 focus:border-primary focus:outline-none text-sm"
            />
          </div>
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl p-4 border border-red-500/20 bg-red-500/10 text-sm text-red-400"
        >
          {error}
        </motion.div>
      )}

      {/* CF card */}
      <SummaryCard summary={summary} loading={loading} />

      {/* SR card */}
      <SavingsRateCard summary={summary} loading={loading} />

      {/* Category spend */}
      <CategorySpendCard
        items={categoryItems}
        total={categoryTotal}
        loading={loading}
      />
    </div>
  );
}
