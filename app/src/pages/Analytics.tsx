import { useState, useMemo, useRef, useCallback, useEffect, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import {
  PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { api, type ApiCategorySpendItem, type ApiCategoryTrendItem } from '@/lib/api';
import { useTransactions } from '@/context/TransactionsContext';
import { AccountCalendar } from '@/components/AccountCalendar';

// ─── Theme detection ──────────────────────────────────────────────────────────

function subscribe(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}
function getIsLight() { return document.documentElement.classList.contains('light'); }
function useIsLight() { return useSyncExternalStore(subscribe, getIsLight, () => false); }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 29);
  return { from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] };
}

function fmt(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(num);
}

const CHART_COLORS = ['#5B9EF0', '#A78BFA', '#34D399', '#F472B6', '#FBBF24', '#E07840', '#22D3EE', '#FB7185'];

function tooltipStyle(isLight: boolean) {
  return {
    contentStyle: {
      background: isLight ? '#FFFFFF' : '#1a2035',
      border: `1px solid ${isLight ? 'rgba(8,9,15,0.10)' : 'rgba(91,158,240,0.2)'}`,
      borderRadius: 12,
      fontSize: 13,
      fontFamily: 'Inter Tight, Inter, sans-serif',
      fontWeight: 500,
      color: isLight ? '#08090F' : '#F2EDE4',
      padding: '8px 12px',
      boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.12)' : 'none',
    },
    cursor: { fill: isLight ? 'rgba(8,9,15,0.04)' : 'rgba(242,237,228,0.03)' },
  };
}

const SLIDE_LABELS = ['Категории', 'Тренды', 'По месяцам', 'Календарь'];

// ─── TrendBadge ───────────────────────────────────────────────────────────────

function TrendBadge({ direction, trendPercent }: { direction: ApiCategoryTrendItem['direction']; trendPercent: string | null }) {
  const pct = trendPercent !== null ? Math.abs(Math.round(parseFloat(trendPercent))) : null;

  if (direction === 'up') {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
        style={{ background: 'rgba(255,68,68,0.12)', color: '#FF4444' }}>
        ↑ {pct !== null ? `${pct}%` : ''}
      </span>
    );
  }
  if (direction === 'down') {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
        style={{ background: 'rgba(74,222,128,0.12)', color: '#4ADE80' }}>
        ↓ {pct !== null ? `${pct}%` : ''}
      </span>
    );
  }
  if (direction === 'stable') {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
        style={{ background: 'rgba(242,237,228,0.08)', color: 'var(--color-text-secondary, #888)' }}>
        → {pct !== null ? `${pct}%` : '0%'}
      </span>
    );
  }
  // 'new' or fallback
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
      style={{ background: 'rgba(91,158,240,0.12)', color: '#5B9EF0' }}>
      Новое
    </span>
  );
}

// ─── Slide 1: Pie chart by category ───────────────────────────────────────────

function Slide1Pie({ items, total, loading }: { items: ApiCategorySpendItem[]; total: string; loading: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const isLight = useIsLight();

  const data = items.map((item, i) => ({
    name: item.group, value: parseFloat(item.amount),
    color: CHART_COLORS[i % CHART_COLORS.length],
    icon: item.icon, percent: item.percent, subcategories: item.subcategories,
  }));

  const handleSliceClick = (_: unknown, index: number) => {
    const name = data[index]?.name;
    setActiveIdx(activeIdx === index ? null : index);
    setExpanded(expanded === name ? null : name ?? null);
  };

  if (loading) return (
    <div className="space-y-3 animate-pulse px-1">
      <div className="mx-auto w-48 h-48 rounded-full bg-bg-elevated" />
      {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-[16px] bg-bg-secondary" />)}
    </div>
  );

  if (items.length === 0) return (
    <div className="flex items-center justify-center h-48">
      <p className="text-sm text-text-primary/40">Нет расходов за период</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Pie */}
      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={58} outerRadius={88}
              paddingAngle={2} dataKey="value" onClick={handleSliceClick} stroke="transparent">
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color}
                  opacity={activeIdx === null || activeIdx === i ? 1 : 0.35}
                  style={!isLight ? { filter: `drop-shadow(0 0 6px ${entry.color}65)` } : undefined} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle(isLight)} formatter={(v: number) => [fmt(v), 'Сумма']} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-text-primary/35 mb-0.5">Расходы</p>
            <p className="text-[17px] font-extrabold tracking-tight">{fmt(total)}</p>
          </div>
        </div>
      </div>

      {/* Category list */}
      <div className="space-y-1.5">
        {data.map((item, i) => (
          <div key={item.name}>
            <button
              onClick={() => {
                setExpanded(expanded === item.name ? null : item.name);
                setActiveIdx(activeIdx === i ? null : i);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[16px] border transition-colors text-left ${
                activeIdx === i
                  ? 'bg-bg-elevated border-white/[0.1]'
                  : 'bg-bg-secondary border-white/[0.05] hover:border-white/[0.1]'
              }`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
              <span className="text-base leading-none">{item.icon}</span>
              <span className="flex-1 text-sm font-semibold truncate">{item.name}</span>
              <span className="text-[10px] text-text-primary/35 tabular-nums">
                {parseFloat(item.percent).toFixed(0)}%
              </span>
              <span className="text-sm font-extrabold tabular-nums">{fmt(item.value)}</span>
              {item.subcategories.length > 0 && (
                <motion.div animate={{ rotate: expanded === item.name ? 180 : 0 }} transition={{ duration: 0.18 }}>
                  <ChevronDown size={13} className="text-text-primary/30 flex-shrink-0" />
                </motion.div>
              )}
            </button>
            <AnimatePresence>
              {expanded === item.name && item.subcategories.length > 0 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="ml-6 mt-1 space-y-0.5 pb-1">
                    {item.subcategories.map(sub => (
                      <div key={sub.name} className="flex items-center gap-2 px-3 py-2 rounded-[12px] bg-bg-primary/50">
                        <span className="text-sm">{sub.icon}</span>
                        <span className="flex-1 text-xs text-text-primary/60">{sub.name}</span>
                        <span className="text-xs font-semibold tabular-nums">{fmt(sub.amount)}</span>
                        <span className="text-[10px] text-text-primary/30">
                          {parseFloat(sub.percent_of_group).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Slide 2: Income vs Expense by week ───────────────────────────────────────


// ─── Slide 3: Category trends with sparklines ─────────────────────────────────

function TrendSparkline({ prev, current, direction }: { prev: number; current: number; direction: ApiCategoryTrendItem['direction'] }) {
  const isNew = direction === 'new' || prev === 0;
  const isUp = !isNew && current > prev;
  const isDown = !isNew && current < prev;

  const stroke = isNew ? '#5B9EF0' : isUp ? '#FF4444' : isDown ? '#4ADE80' : 'rgba(242,237,228,0.3)';

  if (isNew) {
    return (
      <svg width="60" height="24" viewBox="0 0 60 24" fill="none" style={{ flexShrink: 0, color: stroke }}>
        <line x1="4" y1="12" x2="56" y2="12" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  const curvePath = isUp
    ? 'M 4,20 C 20,20 40,4 56,4'
    : isDown
    ? 'M 4,4 C 20,4 40,20 56,20'
    : 'M 4,12 C 20,12 40,12 56,12';

  const fillPath = isUp
    ? 'M 4,20 C 20,20 40,4 56,4 L 56,24 L 4,24 Z'
    : isDown
    ? 'M 4,4 C 20,4 40,20 56,20 L 56,24 L 4,24 Z'
    : undefined;

  return (
    <svg width="60" height="24" viewBox="0 0 60 24" fill="none" style={{ flexShrink: 0, color: stroke }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {fillPath && <path d={fillPath} stroke="none" fill="url(#sparkGrad)" />}
      <path d={curvePath} stroke={stroke} strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function Slide3Trends({
  items, prevDateFrom, prevDateTo, loading,
}: {
  items: ApiCategoryTrendItem[];
  prevDateFrom: string;
  prevDateTo: string;
  loading: boolean;
}) {
  if (loading) return (
    <div className="space-y-2.5 animate-pulse">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-14 rounded-[16px] bg-bg-secondary" />)}
    </div>
  );

  if (items.length === 0) return (
    <div className="flex items-center justify-center h-48">
      <p className="text-sm text-text-primary/40">Нет данных за период</p>
    </div>
  );

  const formatPrevDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const isOtherYear = d.getFullYear() !== new Date().getFullYear();
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'short',
      ...(isOtherYear ? { year: 'numeric' } : {}),
    });
  };
  const prevLabel = prevDateFrom && prevDateTo
    ? `vs ${formatPrevDate(prevDateFrom)} — ${formatPrevDate(prevDateTo)}`
    : '';

  return (
    <div className="space-y-2">
      {prevLabel && (
        <p className="text-[10px] text-text-primary/30 px-1 mb-3">{prevLabel}</p>
      )}
      {items.map((item, i) => {
        const prev = parseFloat(item.prev_amount);
        const current = parseFloat(item.current_amount);
        return (
          <motion.div key={item.group}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}
            className="flex items-center gap-3 px-3 py-2.5 bg-bg-secondary rounded-[16px] border border-white/[0.05]"
          >
            <span className="text-xl leading-none flex-shrink-0">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{item.group}</p>
              <p className="text-[10px] text-text-primary/35 tabular-nums mt-0.5">{fmt(item.current_amount)}</p>
            </div>
            <TrendSparkline prev={prev} current={current} direction={item.direction} />
            <TrendBadge direction={item.direction} trendPercent={item.trend_percent} />
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Slide 4: Month-to-month comparison ───────────────────────────────────────

const MONTH_COLORS = ['#5B9EF0', '#A78BFA', '#34D399', '#F472B6'];
const BAR_MAX_H = 36;

function Slide4Monthly({ loading }: { loading: boolean }) {
  const { transactions } = useTransactions();
  const isLight = useIsLight();

  const { categories, months } = useMemo(() => {
    const now = new Date();
    const m: { label: string; startStr: string; endStr: string }[] = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      m.push({
        label: d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', ''),
        startStr: d.toISOString().split('T')[0],
        endStr: end.toISOString().split('T')[0],
      });
    }

    const cats: Record<string, { icon: string; values: number[] }> = {};
    transactions.filter(tx => tx.type === 'expense').forEach(tx => {
      const cat = tx.category || 'Другое';
      if (!cats[cat]) cats[cat] = { icon: tx.icon || '📦', values: Array(4).fill(0) };
      const idx = m.findIndex(mo => tx.date >= mo.startStr && tx.date <= mo.endStr);
      if (idx !== -1) cats[cat].values[idx] += Number(tx.amount);
    });

    const topCats = Object.entries(cats)
      .map(([name, { icon, values }]) => ({ name, icon, values, total: values.reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return { categories: topCats, months: m };
  }, [transactions]);

  if (loading) return (
    <div className="animate-pulse space-y-2.5">
      {[...Array(4)].map((_, i) => <div key={i} className="h-[72px] rounded-2xl bg-bg-secondary" />)}
    </div>
  );

  if (categories.length === 0) return (
    <div className="flex items-center justify-center h-48">
      <p className="text-sm text-text-primary/40">Недостаточно данных</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {/* Category rows */}
      {categories.map((cat, ci) => {
        const maxVal = Math.max(...cat.values, 1);
        const latestAmt = cat.values[3];

        return (
          <motion.div key={cat.name}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ci * 0.06 }}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl border ${
              isLight ? 'bg-white border-black/[0.08]' : 'bg-[#0E1220] border-white/[0.07]'
            }`}
          >
            {/* Icon */}
            <span className="text-xl leading-none flex-shrink-0">{cat.icon}</span>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-text-primary leading-tight">{cat.name}</p>
              <p className="text-[10px] text-text-primary/40 mt-0.5 tabular-nums">{fmt(cat.total)}</p>
            </div>

            {/* Mini grouped bars */}
            <div className="flex items-end gap-[3px] flex-shrink-0" style={{ height: BAR_MAX_H }}>
              {cat.values.map((val, mi) => {
                const barH = val > 0 ? Math.max(Math.round((val / maxVal) * BAR_MAX_H), 5) : 2;
                return (
                  <div key={mi} className="flex items-end" style={{ height: BAR_MAX_H }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: barH }}
                      transition={{ duration: 0.45, delay: ci * 0.06 + mi * 0.04, ease: 'easeOut' }}
                      style={{
                        width: 8,
                        background: MONTH_COLORS[mi],
                        borderRadius: '3px 3px 2px 2px',
                        opacity: val > 0 ? 1 : 0.2,
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Latest month amount */}
            <div className="text-right flex-shrink-0">
              <p className="text-[11px] font-extrabold tabular-nums text-text-primary leading-tight whitespace-nowrap">
                {latestAmt > 0 ? fmt(latestAmt) : '—'}
              </p>
              <p className="text-[9px] text-text-primary/35 mt-0.5">{months[3]?.label}</p>
            </div>
          </motion.div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-1">
        {months.map((mo, i) => (
          <div key={mo.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: MONTH_COLORS[i] }} />
            <span className="text-[10px] font-semibold text-text-primary/45">{mo.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Analytics ────────────────────────────────────────────────────────────

const PRESETS = [
  { label: '7д', days: 7 },
  { label: '30д', days: 30 },
  { label: '90д', days: 90 },
  { label: '365д', days: 365 },
] as const;

export function Analytics() {
  const defaults = getDefaultRange();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [activePreset, setActivePreset] = useState<number>(30);

  const [showCustomPrev] = useState(false);
  const [customPrevFrom, setCustomPrevFrom] = useState('');
  const [customPrevTo, setCustomPrevTo] = useState('');

  const [categoryItems, setCategoryItems] = useState<ApiCategorySpendItem[]>([]);
  const [categoryTotal, setCategoryTotal] = useState('0');
  const [trendItems, setTrendItems] = useState<ApiCategoryTrendItem[]>([]);
  const [trendPrevFrom, setTrendPrevFrom] = useState('');
  const [trendPrevTo, setTrendPrevTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Swipe state
  const [slide, setSlide] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));
    setDateFrom(start.toISOString().split('T')[0]);
    setDateTo(end.toISOString().split('T')[0]);
    setActivePreset(days);
  };

  const fetchData = useCallback(async (from: string, to: string, prevFrom?: string, prevTo?: string) => {
    if (!from || !to) return;
    setLoading(true);
    setError(null);
    try {
      const [categoryData, trendsData] = await Promise.all([
        api.getCategorySpend(from, to),
        api.getCategoryTrends(from, to, prevFrom, prevTo),
      ]);
      setCategoryItems(categoryData.items);
      setCategoryTotal(categoryData.total);
      setTrendItems(trendsData.items);
      setTrendPrevFrom(trendsData.prev_date_from);
      setTrendPrevTo(trendsData.prev_date_to);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void fetchData(dateFrom, dateTo); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchData(dateFrom, dateTo,
        showCustomPrev && customPrevFrom ? customPrevFrom : undefined,
        showCustomPrev && customPrevTo ? customPrevTo : undefined,
      );
    }, 500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, fetchData]);

  useEffect(() => {
    if (!showCustomPrev || !customPrevFrom || !customPrevTo) return;
    const t = setTimeout(() => { void fetchData(dateFrom, dateTo, customPrevFrom, customPrevTo); }, 500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customPrevFrom, customPrevTo]);

  useEffect(() => {
    if (!showCustomPrev) {
      setCustomPrevFrom('');
      setCustomPrevTo('');
      void fetchData(dateFrom, dateTo);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCustomPrev]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx > 0 && slide < 3) setSlide(s => s + 1);
      if (dx < 0 && slide > 0) setSlide(s => s - 1);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-10">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between pt-1 mb-4">
        <h1 className="text-[22px] font-extrabold tracking-tight text-text-primary">Аналитика</h1>
        <div className="flex gap-1.5">
          {PRESETS.map(p => (
            <button key={p.days} onClick={() => applyPreset(p.days)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activePreset === p.days
                  ? 'bg-[#5B9EF0] text-[#08090F]'
                  : 'bg-bg-secondary text-text-primary/50 border border-white/[0.06] hover:text-text-primary'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mb-4 rounded-[16px] px-4 py-3 border border-error/20 bg-error/10 text-sm text-error">
          {error}
        </motion.div>
      )}

      {/* ── Progress dots ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        className="flex items-center justify-between mb-4 px-1">
        {/* Slide label */}
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-primary/40">
          {SLIDE_LABELS[slide]}
        </span>
        {/* Dots */}
        <div className="flex items-center gap-1.5">
          {SLIDE_LABELS.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)}>
              <motion.div
                animate={{ width: i === slide ? 20 : 6, opacity: i === slide ? 1 : 0.3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="h-1.5 rounded-full bg-[#5B9EF0]"
              />
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Swipeable slides ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div
          className="overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={(e) => { touchStartX.current = e.clientX; touchStartY.current = e.clientY; }}
          onMouseUp={(e) => {
            const dx = touchStartX.current - e.clientX;
            const dy = touchStartY.current - e.clientY;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
              if (dx > 0 && slide < 3) setSlide(s => s + 1);
              if (dx < 0 && slide > 0) setSlide(s => s - 1);
            }
          }}
        >
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${slide * 100}%)` }}
          >
            {/* Slide 1 */}
            <div className="w-full flex-shrink-0 min-w-0">
              <Slide1Pie items={categoryItems} total={categoryTotal} loading={loading} />
            </div>

            {/* Slide 2 */}
            <div className="w-full flex-shrink-0 min-w-0">
              <Slide3Trends
                items={trendItems}
                prevDateFrom={trendPrevFrom}
                prevDateTo={trendPrevTo}
                loading={loading}
              />
            </div>

            {/* Slide 3 */}
            <div className="w-full flex-shrink-0 min-w-0">
              <Slide4Monthly loading={loading} />
            </div>

            {/* Slide 4 */}
            <div className="w-full flex-shrink-0 min-w-0">
              <AccountCalendar />
            </div>
          </div>
        </div>
      </motion.div>

    </div>
  );
}
