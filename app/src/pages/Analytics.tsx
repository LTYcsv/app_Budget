import { useState, useMemo, useRef, useCallback, useEffect, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Filter } from 'lucide-react';
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

const PIE_COLORS_DARK  = ['#5B9EF0', '#A78BFA', '#34D399', '#F472B6', '#FBBF24', '#E07840', '#22D3EE', '#FB7185'];
const PIE_COLORS_LIGHT = ['#E07840', '#5B9EF0', '#34D399', '#A78BFA', '#F472B6', '#FBBF24', '#EF4444', '#22D3EE'];

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

const SLIDE_LABELS = ['Баланс', 'Прогноз', 'Категории', 'Тренды', 'По месяцам', 'Календарь'];

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

// ─── Slide 0: Balance dynamics ────────────────────────────────────────────────

function Slide0Balance({ dateFrom, dateTo, currentBalance }: { dateFrom: string; dateTo: string; currentBalance: number | null }) {
  const { transactions } = useTransactions();
  const isLight = useIsLight();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (currentBalance === null || !dateFrom || !dateTo) return [];

    const dayDeltas: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type === 'transfer') continue;
      const delta = tx.type === 'income' ? tx.amount : -tx.amount;
      dayDeltas[tx.date] = (dayDeltas[tx.date] || 0) + delta;
    }

    const points: { date: string; balance: number }[] = [];
    let balance = currentBalance;
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(dateFrom);
    const d = new Date(end);
    while (d >= start) {
      const dateStr = d.toISOString().split('T')[0];
      if (dateStr <= dateTo) {
        points.unshift({ date: dateStr, balance: Math.round(balance) });
      }
      balance -= (dayDeltas[dateStr] || 0);
      d.setDate(d.getDate() - 1);
    }
    return points;
  }, [currentBalance, transactions, dateFrom, dateTo]);

  const fmtK = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.0', '')}м`;
    if (abs >= 1_000) return `${Math.round(v / 1_000)}к`;
    return String(Math.round(v));
  };
  const fmtDate = (s: string) => { const [, m, d] = s.split('-'); return `${d}.${m}`; };
  const fmtFull = (v: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v);

  // SVG layout
  const W = 400, H = 150, PL = 36, PR = 8, PT = 12, PB = 22;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  const n = chartData.length;
  const balances = chartData.map(d => d.balance);
  const minBal = n ? Math.min(...balances) : 0;
  const maxBal = n ? Math.max(...balances) : 1;
  const pad = (maxBal - minBal) * 0.12 || 100;
  const yMin = minBal - pad, yMax = maxBal + pad, yRange = yMax - yMin;

  const toX = (i: number) => PL + (n > 1 ? i / (n - 1) : 0.5) * chartW;
  const toY = (v: number) => PT + (1 - (v - yMin) / yRange) * chartH;

  const path = n < 2 ? '' : chartData.map((p, i) => {
    const x = toX(i), y = toY(p.balance);
    if (i === 0) return `M ${x} ${y}`;
    const px = toX(i - 1), py = toY(chartData[i - 1].balance);
    const cpx = (px + x) / 2;
    return `C ${cpx} ${py} ${cpx} ${y} ${x} ${y}`;
  }).join(' ');

  const areaPath = path
    ? `${path} L ${toX(n - 1)} ${PT + chartH} L ${toX(0)} ${PT + chartH} Z`
    : '';

  const xLabelCount = Math.min(5, n);
  const xLabelIdxs = xLabelCount <= 1 ? [0]
    : Array.from({ length: xLabelCount }, (_, i) => Math.round(i * (n - 1) / (xLabelCount - 1)));

  const yLabels = [0, 0.5, 1].map(t => ({ val: yMin + t * yRange, y: toY(yMin + t * yRange) })).reverse();

  const minPoint = n ? chartData.reduce((a, b) => a.balance < b.balance ? a : b) : null;
  const maxPoint = n ? chartData.reduce((a, b) => a.balance > b.balance ? a : b) : null;

  // Color logic: green if current balance > 0, red otherwise
  const isPositive = currentBalance === null || currentBalance >= 0;
  const lineColor  = isPositive ? '#4ADE80' : '#FF4444';
  const fillColor  = isPositive ? 'rgba(74,222,128,0.10)' : 'rgba(255,68,68,0.10)';
  const dotColor   = lineColor;

  const surface   = isLight ? '#FFFFFF' : '#0E1220';
  const mutedText = isLight ? 'rgba(8,9,15,0.35)' : 'rgba(242,237,228,0.35)';

  // Zero line Y position (only render if 0 is within visible range)
  const zeroY = toY(0);
  const showZeroLine = zeroY > PT && zeroY < PT + chartH;

  return (
    <div style={{ fontFamily: 'Inter Tight, Inter, sans-serif' }}>
      {/* Balance amount */}
      <div className="mb-4">
        <p className="text-[32px] font-bold tracking-tight leading-none mb-1"
          style={{ color: isLight ? '#08090F' : '#F2EDE4' }}>
          {currentBalance !== null ? fmtFull(currentBalance) : '—'}
        </p>
        <p className="text-[12px]" style={{ color: mutedText }}>текущий баланс</p>
      </div>

      {/* SVG Chart */}
      <div className="rounded-[16px] overflow-hidden mb-3 relative select-none"
        style={{ background: surface }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ display: 'block', touchAction: 'none' }}
          onMouseMove={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const xRel = (e.clientX - rect.left) / rect.width * W;
            const i = Math.round((xRel - PL) / chartW * (n - 1));
            setActiveIdx(Math.max(0, Math.min(n - 1, i)));
          }}
          onMouseLeave={() => setActiveIdx(null)}
          onTouchMove={e => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const xRel = (e.touches[0].clientX - rect.left) / rect.width * W;
            const i = Math.round((xRel - PL) / chartW * (n - 1));
            setActiveIdx(Math.max(0, Math.min(n - 1, i)));
          }}
          onTouchEnd={() => setActiveIdx(null)}
        >
          {/* Y grid lines + labels */}
          {yLabels.map(({ val, y }) => (
            <g key={val}>
              <line x1={PL} y1={y} x2={W - PR} y2={y}
                stroke={isLight ? 'rgba(8,9,15,0.05)' : 'rgba(242,237,228,0.05)'}
                strokeWidth="1" />
              <text x={PL - 4} y={y + 3} textAnchor="end" fontSize={8}
                fill={mutedText} fontFamily="Inter Tight, Inter, sans-serif">
                {fmtK(val)}
              </text>
            </g>
          ))}

          {/* Zero line */}
          {showZeroLine && (
            <line x1={PL} y1={zeroY} x2={W - PR} y2={zeroY}
              stroke={isLight ? 'rgba(8,9,15,0.15)' : 'rgba(242,237,228,0.15)'}
              strokeWidth="1" strokeDasharray="4 4" />
          )}

          {/* Area */}
          {areaPath && <path d={areaPath} fill={fillColor} />}

          {/* Line */}
          {path && <path d={path} fill="none" stroke={lineColor} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />}

          {/* X axis labels */}
          {xLabelIdxs.map(i => (
            <text key={i} x={toX(i)} y={H - 5} textAnchor="middle" fontSize={8}
              fill={mutedText} fontFamily="Inter Tight, Inter, sans-serif">
              {chartData[i] ? fmtDate(chartData[i].date) : ''}
            </text>
          ))}

          {/* Active point */}
          {activeIdx !== null && chartData[activeIdx] && (
            <>
              <line x1={toX(activeIdx)} y1={PT} x2={toX(activeIdx)} y2={PT + chartH}
                stroke={isLight ? 'rgba(8,9,15,0.12)' : 'rgba(242,237,228,0.12)'}
                strokeWidth="1" strokeDasharray="3,3" />
              <circle cx={toX(activeIdx)} cy={toY(chartData[activeIdx].balance)} r="4"
                fill={dotColor} stroke={surface} strokeWidth="2" />
            </>
          )}
        </svg>

        {/* Tooltip bubble */}
        {activeIdx !== null && chartData[activeIdx] && (
          <div className="absolute pointer-events-none px-3 py-1.5 rounded-[10px] text-xs font-semibold"
            style={{
              background: isLight ? '#FFFFFF' : '#1a2035',
              border: `1px solid ${isLight ? 'rgba(8,9,15,0.10)' : 'rgba(91,158,240,0.2)'}`,
              color: isLight ? '#08090F' : '#F2EDE4',
              top: 8, left: '50%', transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
              fontFamily: 'Inter Tight, Inter, sans-serif',
              boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.12)' : 'none',
              zIndex: 10,
            }}>
            <span style={{ opacity: 0.5, marginRight: 6 }}>{fmtDate(chartData[activeIdx].date)}</span>
            {fmtFull(chartData[activeIdx].balance)}
          </div>
        )}
      </div>

      {/* Min / Max cards */}
      <div className="grid grid-cols-2 gap-3">
        {([
          { label: 'Минимум', point: minPoint, icon: '↓', color: '#FF4444', bg: 'rgba(255,68,68,0.10)' },
          { label: 'Максимум', point: maxPoint, icon: '↑', color: '#4ADE80', bg: 'rgba(74,222,128,0.10)' },
        ] as const).map(({ label, point, icon, color, bg }) => (
          <div key={label} style={{
            background: isLight ? '#FFFFFF' : '#0E1220',
            borderRadius: 20,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            {/* Icon square */}
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              fontSize: 18, color,
            }}>
              {icon}
            </div>
            {/* Text */}
            <div>
              <p style={{ fontSize: 12, color: mutedText, marginBottom: 2 }}>{label}</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: isLight ? '#08090F' : '#F2EDE4', lineHeight: 1 }}>
                {point ? fmtFull(point.balance) : '—'}
              </p>
              <p style={{ fontSize: 12, color: mutedText, marginTop: 2 }}>
                {point ? fmtDate(point.date) : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Slide 1: Balance forecast ────────────────────────────────────────────────

function Slide1Forecast({ currentBalance }: { currentBalance: number | null }) {
  const { transactions } = useTransactions();
  const isLight = useIsLight();

  const surface   = isLight ? '#FFFFFF' : '#0E1220';
  const mutedText = isLight ? 'rgba(8,9,15,0.35)' : 'rgba(242,237,228,0.35)';
  const textMain  = isLight ? '#08090F' : '#F2EDE4';

  const fmtFull = (v: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v);

  const forecast = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayOfMonth = today.getDate();
    const daysLeft = daysInMonth - dayOfMonth;

    const toStr = (d: Date) => d.toISOString().split('T')[0];

    // Last 30 days expenses → avg daily expense
    const d30 = new Date(today); d30.setDate(today.getDate() - 30);
    const from30 = toStr(d30);
    const expenses30 = transactions
      .filter(tx => tx.type === 'expense' && tx.date >= from30)
      .reduce((s, tx) => s + tx.amount, 0);
    const avgDailyExpense = expenses30 / 30;

    // Last 3 months income → avg monthly income
    const d3m = new Date(today); d3m.setMonth(today.getMonth() - 3);
    const from3m = toStr(d3m);
    const income3m = transactions
      .filter(tx => tx.type === 'income' && tx.date >= from3m)
      .reduce((s, tx) => s + tx.amount, 0);
    const avgMonthlyIncome = income3m / 3;

    const expectedExpenses = avgDailyExpense * daysLeft;
    const expectedIncome   = avgMonthlyIncome * (daysLeft / daysInMonth);
    const forecastBalance  = (currentBalance ?? 0) - expectedExpenses + expectedIncome;

    return {
      daysLeft,
      avgDailyExpense,
      expectedExpenses,
      expectedIncome,
      forecastBalance,
    };
  }, [transactions, currentBalance]);

  const isNegative = forecast.forecastBalance < 0;

  // Bar chart data
  const bars = [
    { label: 'Баланс',   value: currentBalance ?? 0, color: '#5B9EF0',  dashed: false },
    { label: 'Расходы',  value: forecast.expectedExpenses,  color: '#F87171',  dashed: false },
    { label: 'Доходы',   value: forecast.expectedIncome,    color: '#4ADE80',  dashed: false },
    { label: 'Прогноз',  value: Math.abs(forecast.forecastBalance), color: '#5B9EF0', dashed: true },
  ];

  const W = 320, H = 120, PB = 20, PT = 8;
  const chartH = H - PT - PB;
  const maxVal = Math.max(...bars.map(b => b.value), 1);
  const barW = 40, gap = (W - bars.length * barW) / (bars.length + 1);

  return (
    <div style={{ fontFamily: 'Inter Tight, Inter, sans-serif' }}>

      {/* Header */}
      <div className="mb-4">
        <p className="text-[32px] font-bold tracking-tight leading-none mb-1"
          style={{ color: isNegative ? '#F87171' : '#4ADE80' }}>
          {fmtFull(forecast.forecastBalance)}
        </p>
        <p className="text-[12px]" style={{ color: mutedText }}>прогноз на конец месяца</p>
      </div>

      {/* Warning */}
      {isNegative && (
        <div className="flex items-center gap-2 rounded-[14px] px-4 py-3 mb-4 text-[13px] font-semibold"
          style={{ background: 'rgba(248,113,113,0.10)', color: '#F87171' }}>
          ⚠ Баланс может уйти в минус
        </div>
      )}

      {/* Bar chart */}
      <div className="rounded-[16px] mb-3 overflow-hidden" style={{ background: surface }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: 'block' }}>
          {bars.map((bar, i) => {
            const barH = Math.max(2, (bar.value / maxVal) * chartH);
            const x = gap + i * (barW + gap);
            const y = PT + chartH - barH;
            return (
              <g key={bar.label}>
                {bar.dashed ? (
                  <rect x={x} y={y} width={barW} height={barH} rx={6}
                    fill="none"
                    stroke={isNegative ? '#F87171' : bar.color}
                    strokeWidth="1.5"
                    strokeDasharray="4 3" />
                ) : (
                  <rect x={x} y={y} width={barW} height={barH} rx={6}
                    fill={bar.color} opacity={0.85} />
                )}
                <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize={8}
                  fill={mutedText} fontFamily="Inter Tight, Inter, sans-serif">
                  {bar.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Info rows */}
      <div className="rounded-[16px] overflow-hidden" style={{ background: surface }}>
        {[
          { icon: '💳', label: 'Текущий баланс',       value: fmtFull(currentBalance ?? 0) },
          { icon: '📅', label: 'Осталось дней',         value: String(forecast.daysLeft) },
          { icon: '📉', label: 'Средний расход в день', value: fmtFull(forecast.avgDailyExpense) },
        ].map((row, i, arr) => (
          <div key={row.label}
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: i < arr.length - 1
              ? `1px solid ${isLight ? 'rgba(8,9,15,0.06)' : 'rgba(242,237,228,0.06)'}` : undefined }}>
            <span style={{ fontSize: 16 }}>{row.icon}</span>
            <span className="flex-1 text-[13px]" style={{ color: mutedText }}>{row.label}</span>
            <span className="text-[14px] font-bold" style={{ color: textMain }}>{row.value}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

// ─── Slide 2: Pie chart by category ───────────────────────────────────────────

function Slide1Pie({ items, total, loading }: { items: ApiCategorySpendItem[]; total: string; loading: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const isLight = useIsLight();
  const PIE_COLORS = isLight ? PIE_COLORS_LIGHT : PIE_COLORS_DARK;

  const data = items.map((item, i) => ({
    name: item.group, value: parseFloat(item.amount),
    color: PIE_COLORS[i % PIE_COLORS.length],
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
] as const;

export function Analytics() {
  const defaults = getDefaultRange();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [activePreset, setActivePreset] = useState<number>(30);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);

  useEffect(() => {
    api.getAccounts().then(accounts => {
      const total = accounts.reduce((sum, a) => sum + parseFloat(a.current_balance), 0);
      setCurrentBalance(total);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showCustomPrev] = useState(false);
  const [customPrevFrom, setCustomPrevFrom] = useState('');
  const [customPrevTo, setCustomPrevTo] = useState('');

  const [showDateModal, setShowDateModal] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [modalFrom, setModalFrom] = useState('');
  const [modalTo, setModalTo] = useState('');
  const isLight = useIsLight();

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
    setCustomFrom('');
    setCustomTo('');
  };

  const openDateModal = () => {
    setModalFrom(customFrom || dateFrom);
    setModalTo(customTo || dateTo);
    setShowDateModal(true);
  };

  const applyCustomRange = () => {
    if (!modalFrom || !modalTo) return;
    setCustomFrom(modalFrom);
    setCustomTo(modalTo);
    setDateFrom(modalFrom);
    setDateTo(modalTo);
    setActivePreset(0);
    setShowDateModal(false);
  };

  const resetCustomRange = () => {
    setCustomFrom('');
    setCustomTo('');
    setShowDateModal(false);
    applyPreset(30);
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
      if (dx > 0 && slide < 5) setSlide(s => s + 1);
      if (dx < 0 && slide > 0) setSlide(s => s - 1);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-10">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between pt-1 mb-4">
        <h1 className="text-[22px] font-extrabold tracking-tight text-text-primary">Аналитика</h1>
        <div className="flex items-center gap-1.5">
          {PRESETS.map(p => (
            <button key={p.days} onClick={() => applyPreset(p.days)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activePreset === p.days && !customFrom
                  ? 'bg-[#5B9EF0] text-[#08090F]'
                  : 'bg-bg-secondary text-text-primary/50 border border-white/[0.06] hover:text-text-primary'
              }`}>
              {p.label}
            </button>
          ))}
          <button
            onClick={openDateModal}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-bg-secondary border border-white/[0.06] transition-colors hover:text-text-primary"
          >
            <Filter size={15} className={customFrom ? (isLight ? 'text-[#E07840]' : 'text-[#5B9EF0]') : 'text-text-secondary'} />
          </button>
        </div>
      </motion.div>

      {/* ── Date modal ── */}
      {showDateModal && (
        <>
          <div
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowDateModal(false)}
          />
          <div
            className="fixed z-[51]"
            style={{
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 320,
              background: isLight ? '#FFFFFF' : '#0E1220',
              borderRadius: 24,
              padding: 24,
              border: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(91,158,240,0.12)'}`,
            }}
          >
            {/* Заголовок */}
            <div className="flex items-center justify-between mb-5">
              <span className="text-[18px] font-bold text-text-primary" style={{ fontFamily: 'Inter Tight, Inter, sans-serif' }}>
                Выбрать период
              </span>
              <button onClick={() => setShowDateModal(false)} className="text-text-muted hover:text-text-primary transition-colors text-lg leading-none">
                ×
              </button>
            </div>

            {/* Поля */}
            <div className="space-y-3 mb-5">
              {(['От', 'До'] as const).map((label, idx) => {
                const val = idx === 0 ? modalFrom : modalTo;
                const setter = idx === 0 ? setModalFrom : setModalTo;
                return (
                  <div key={label}>
                    <p className="text-[11px] font-semibold uppercase tracking-widest mb-1.5"
                      style={{ color: isLight ? 'rgba(8,9,15,0.35)' : 'rgba(242,237,228,0.35)' }}>
                      {label}
                    </p>
                    <input
                      type="date"
                      value={val}
                      onChange={e => setter(e.target.value)}
                      className="w-full text-text-primary outline-none transition-colors"
                      style={{
                        background: isLight ? '#F2EDE4' : '#08090F',
                        border: `1px solid ${isLight ? 'rgba(224,120,64,0.2)' : 'rgba(91,158,240,0.15)'}`,
                        borderRadius: 12,
                        padding: '12px 16px',
                        fontSize: 14,
                        fontFamily: 'Inter Tight, Inter, sans-serif',
                        colorScheme: isLight ? 'light' : 'dark',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Кнопка применить */}
            <button
              onClick={applyCustomRange}
              className="w-full text-white font-bold text-[15px] py-3.5 transition-opacity disabled:opacity-40"
              style={{
                background: isLight ? '#E07840' : '#5B9EF0',
                borderRadius: 20,
                fontFamily: 'Inter Tight, Inter, sans-serif',
              }}
              disabled={!modalFrom || !modalTo}
            >
              Применить
            </button>

            {/* Кнопка сбросить */}
            <button
              onClick={resetCustomRange}
              className="w-full mt-2.5 text-[13px] text-text-muted hover:text-text-secondary transition-colors py-1"
              style={{ fontFamily: 'Inter Tight, Inter, sans-serif' }}
            >
              Сбросить
            </button>
          </div>
        </>
      )}

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
              if (dx > 0 && slide < 5) setSlide(s => s + 1);
              if (dx < 0 && slide > 0) setSlide(s => s - 1);
            }
          }}
        >
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${slide * 100}%)` }}
          >
            {/* Slide 0 — Balance dynamics */}
            <div className="w-full flex-shrink-0 min-w-0">
              <Slide0Balance dateFrom={dateFrom} dateTo={dateTo} currentBalance={currentBalance} />
            </div>

            {/* Slide 1 — Forecast */}
            <div className="w-full flex-shrink-0 min-w-0">
              <Slide1Forecast currentBalance={currentBalance} />
            </div>

            {/* Slide 2 — Categories */}
            <div className="w-full flex-shrink-0 min-w-0">
              <Slide1Pie items={categoryItems} total={categoryTotal} loading={loading} />
            </div>

            {/* Slide 3 — Trends */}
            <div className="w-full flex-shrink-0 min-w-0">
              <Slide3Trends
                items={trendItems}
                prevDateFrom={trendPrevFrom}
                prevDateTo={trendPrevTo}
                loading={loading}
              />
            </div>

            {/* Slide 3 — Monthly */}
            <div className="w-full flex-shrink-0 min-w-0">
              <Slide4Monthly loading={loading} />
            </div>

            {/* Slide 4 — Calendar */}
            <div className="w-full flex-shrink-0 min-w-0">
              <AccountCalendar />
            </div>
          </div>
        </div>
      </motion.div>

    </div>
  );
}
