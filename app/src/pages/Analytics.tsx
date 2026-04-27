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

const SLIDE_LABELS = ['Баланс', 'Категории', 'Тренды', 'По месяцам', 'Календарь'];

// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptyPie({ isLight }: { isLight: boolean }) {
  const dim = isLight ? 'rgba(8,9,15,0.08)' : 'rgba(242,237,228,0.08)';
  const dimText = isLight ? 'rgba(8,9,15,0.25)' : 'rgba(242,237,228,0.25)';
  const dimText2 = isLight ? 'rgba(8,9,15,0.4)' : 'rgba(242,237,228,0.4)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 24px' }}>
      <svg width="160" height="160" viewBox="0 0 160 160" style={{ marginBottom: 20 }}>
        <circle cx="80" cy="80" r="52" fill="none" stroke={dimText} strokeWidth="22"
          strokeDasharray="14 6" strokeLinecap="round" />
        <circle cx="80" cy="80" r="52" fill="none" stroke={isLight ? 'rgba(8,9,15,0.04)' : 'rgba(242,237,228,0.04)'} strokeWidth="22" />
        <text x="80" y="76" textAnchor="middle" fontSize="11" fill={dimText2}
          fontFamily="Inter Tight, Inter, sans-serif" fontWeight="600">расходы</text>
        <text x="80" y="92" textAnchor="middle" fontSize="13" fill={dimText}
          fontFamily="Inter Tight, Inter, sans-serif" fontWeight="700">—</text>
      </svg>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[70, 50, 35].map((w, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            borderRadius: 14, background: dim }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: dimText, flexShrink: 0 }} />
            <div style={{ flex: 1, height: 10, borderRadius: 6, background: dimText, opacity: 0.5, maxWidth: `${w}%` }} />
            <div style={{ width: 48, height: 10, borderRadius: 6, background: dimText, opacity: 0.4 }} />
          </div>
        ))}
      </div>
      <p style={{ marginTop: 20, fontSize: 13, color: dimText2, textAlign: 'center', lineHeight: 1.5 }}>
        Добавьте расходы за выбранный период,<br />чтобы увидеть разбивку по категориям
      </p>
    </div>
  );
}

function EmptyTrends({ isLight }: { isLight: boolean }) {
  const dim = isLight ? 'rgba(8,9,15,0.08)' : 'rgba(242,237,228,0.08)';
  const dimText = isLight ? 'rgba(8,9,15,0.25)' : 'rgba(242,237,228,0.25)';
  const dimText2 = isLight ? 'rgba(8,9,15,0.4)' : 'rgba(242,237,228,0.4)';
  const curves = [
    { d: 'M 4,18 C 18,18 42,4 56,4', fill: 'M 4,18 C 18,18 42,4 56,4 L 56,24 L 4,24 Z', color: dimText },
    { d: 'M 4,4 C 18,4 42,18 56,18', fill: 'M 4,4 C 18,4 42,18 56,18 L 56,24 L 4,24 Z', color: dimText },
    { d: 'M 4,12 C 18,12 42,12 56,12', fill: undefined, color: dimText },
    { d: 'M 4,18 C 18,18 42,4 56,4', fill: 'M 4,18 C 18,18 42,4 56,4 L 56,24 L 4,24 Z', color: dimText },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', padding: '8px 0 24px', gap: 8 }}>
      {curves.map((c, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
          borderRadius: 14, background: dim }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: dimText, flexShrink: 0, opacity: 0.5 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ height: 9, borderRadius: 5, background: dimText, opacity: 0.5, width: `${55 + i * 10}%` }} />
            <div style={{ height: 7, borderRadius: 5, background: dimText, opacity: 0.3, width: '40%' }} />
          </div>
          <svg width="60" height="24" viewBox="0 0 60 24" fill="none" style={{ flexShrink: 0, opacity: 0.35 }}>
            {c.fill && <path d={c.fill} fill={c.color} opacity="0.3" />}
            <path d={c.d} stroke={c.color} strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
          <div style={{ width: 32, height: 18, borderRadius: 100, background: dimText, opacity: 0.4, flexShrink: 0 }} />
        </div>
      ))}
      <p style={{ marginTop: 12, fontSize: 13, color: dimText2, textAlign: 'center', lineHeight: 1.5 }}>
        Сделайте расходы в двух периодах,<br />чтобы увидеть динамику по категориям
      </p>
    </div>
  );
}

function EmptyMonthly({ isLight }: { isLight: boolean }) {
  const dim = isLight ? 'rgba(8,9,15,0.08)' : 'rgba(242,237,228,0.08)';
  const dimText = isLight ? 'rgba(8,9,15,0.25)' : 'rgba(242,237,228,0.25)';
  const dimText2 = isLight ? 'rgba(8,9,15,0.4)' : 'rgba(242,237,228,0.4)';
  const barHeights = [[20, 28, 14, 32], [32, 16, 28, 20], [14, 24, 32, 18], [28, 12, 20, 36]];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', padding: '8px 0 24px', gap: 8 }}>
      {barHeights.map((heights, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px',
          borderRadius: 14, background: dim }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: dimText, flexShrink: 0, opacity: 0.5 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 9, borderRadius: 5, background: dimText, opacity: 0.5, width: `${50 + i * 8}%`, marginBottom: 6 }} />
            <div style={{ height: 7, borderRadius: 5, background: dimText, opacity: 0.3, width: '35%' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36, flexShrink: 0 }}>
            {heights.map((h, j) => (
              <div key={j} style={{ width: 8, height: h, borderRadius: '3px 3px 2px 2px',
                background: dimText, opacity: 0.3 + j * 0.1 }} />
            ))}
          </div>
        </div>
      ))}
      <p style={{ marginTop: 12, fontSize: 13, color: dimText2, textAlign: 'center', lineHeight: 1.5 }}>
        Нужны расходы хотя бы за один месяц,<br />чтобы увидеть сравнение по месяцам
      </p>
    </div>
  );
}

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
    const end = new Date(); end.setHours(0, 0, 0, 0);
    const start = new Date(dateFrom);
    const d = new Date(end);
    while (d >= start) {
      const dateStr = d.toISOString().split('T')[0];
      if (dateStr <= dateTo) points.unshift({ date: dateStr, balance: Math.round(balance) });
      balance -= (dayDeltas[dateStr] || 0);
      d.setDate(d.getDate() - 1);
    }
    return points;
  }, [currentBalance, transactions, dateFrom, dateTo]);

  const fmtDate = (s: string) => { const [, m, d] = s.split('-'); return `${d}.${m}`; };
  const fmtFull = (v: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v);
  const fmtShort = (v: number) => {
    const abs = Math.abs(v);
    const sign = v < 0 ? '−' : '+';
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1).replace('.0', '')}м ₽`;
    if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}к ₽`;
    return `${sign}${Math.round(abs)} ₽`;
  };

  const n = chartData.length;
  const balances = chartData.map(d => d.balance);
  const minBal = n ? Math.min(...balances) : 0;
  const maxBal = n ? Math.max(...balances) : 1;
  const pad = (maxBal - minBal) * 0.15 || 500;
  const yMin = minBal - pad, yMax = maxBal + pad, yRange = yMax - yMin;

  // SVG layout — no Y-axis, full width chart
  const W = 400, H = 160, PL = 8, PR = 8, PT = 16, PB = 28;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

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

  const xLabelCount = Math.min(4, n);
  const xLabelIdxs = xLabelCount <= 1 ? [0]
    : Array.from({ length: xLabelCount }, (_, i) => Math.round(i * (n - 1) / (xLabelCount - 1)));

  const minPoint = n ? chartData.reduce((a, b) => a.balance < b.balance ? a : b) : null;
  const maxPoint = n ? chartData.reduce((a, b) => a.balance > b.balance ? a : b) : null;

  // Period delta
  const periodDelta = n >= 2 ? chartData[n - 1].balance - chartData[0].balance : null;
  const periodPct = n >= 2 && chartData[0].balance !== 0
    ? (periodDelta! / Math.abs(chartData[0].balance)) * 100 : null;

  const isPositive = currentBalance === null || currentBalance >= 0;
  const deltaPositive = periodDelta === null || periodDelta >= 0;
  const lineColor = isPositive ? '#4ADE80' : '#FF4444';
  const deltaColor = deltaPositive ? '#4ADE80' : '#FF4444';
  const deltaBg = deltaPositive ? 'rgba(74,222,128,0.12)' : 'rgba(255,68,68,0.12)';

  const surface = isLight ? '#F7F5F2' : '#0a0e1a';
  const cardBg = isLight ? '#FFFFFF' : '#0E1220';
  const textMain = isLight ? '#08090F' : '#F2EDE4';
  const textDim = isLight ? 'rgba(8,9,15,0.38)' : 'rgba(242,237,228,0.38)';
  const gridLine = isLight ? 'rgba(8,9,15,0.06)' : 'rgba(242,237,228,0.05)';

  const gradId = isPositive ? 'balGradGreen' : 'balGradRed';
  const gradColor = isPositive ? '#4ADE80' : '#FF4444';

  const zeroY = toY(0);
  const showZeroLine = zeroY > PT && zeroY < PT + chartH;

  return (
    <div style={{ fontFamily: 'Inter Tight, Inter, sans-serif' }}>

      {/* ── Hero: balance + delta ── */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: textDim, marginBottom: 6 }}>
            Текущий баланс
          </p>
          <p style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, color: textMain }}>
            {currentBalance !== null ? fmtFull(currentBalance) : '—'}
          </p>
        </div>
        {periodDelta !== null && (
          <div style={{
            flexShrink: 0, padding: '6px 12px', borderRadius: 100,
            background: deltaBg,
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1,
            marginBottom: 4,
          }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: deltaColor, letterSpacing: '-0.01em' }}>
              {fmtShort(periodDelta)}
            </span>
            {periodPct !== null && (
              <span style={{ fontSize: 10, fontWeight: 700, color: deltaColor, opacity: 0.75 }}>
                {deltaPositive ? '+' : ''}{periodPct.toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Chart ── */}
      <div style={{ borderRadius: 20, overflow: 'hidden', background: surface, position: 'relative', marginBottom: 14 }}
        className="select-none">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: 'block', width: '100%', touchAction: 'none' }}
          onMouseMove={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const i = Math.round((e.clientX - rect.left) / rect.width * (n - 1));
            setActiveIdx(Math.max(0, Math.min(n - 1, i)));
          }}
          onMouseLeave={() => setActiveIdx(null)}
          onTouchMove={e => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const i = Math.round((e.touches[0].clientX - rect.left) / rect.width * (n - 1));
            setActiveIdx(Math.max(0, Math.min(n - 1, i)));
          }}
          onTouchEnd={() => setActiveIdx(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={gradColor} stopOpacity={isLight ? 0.18 : 0.22} />
              <stop offset="75%" stopColor={gradColor} stopOpacity={0.03} />
              <stop offset="100%" stopColor={gradColor} stopOpacity={0} />
            </linearGradient>
            {!isLight && (
              <filter id="lineGlow">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            )}
          </defs>

          {/* Subtle horizontal grid lines — no labels */}
          {[0.25, 0.5, 0.75].map(t => {
            const gy = PT + t * chartH;
            return <line key={t} x1={PL} y1={gy} x2={W - PR} y2={gy} stroke={gridLine} strokeWidth="1" />;
          })}

          {/* Zero line */}
          {showZeroLine && (
            <line x1={PL} y1={zeroY} x2={W - PR} y2={zeroY}
              stroke={isLight ? 'rgba(8,9,15,0.14)' : 'rgba(242,237,228,0.14)'}
              strokeWidth="1" strokeDasharray="5 4" />
          )}

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}

          {/* Main line */}
          {path && (
            <path d={path} fill="none" stroke={lineColor} strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              filter={!isLight ? 'url(#lineGlow)' : undefined} />
          )}

          {/* X date labels */}
          {xLabelIdxs.map(i => (
            <text key={i} x={toX(i)} y={H - 8} textAnchor="middle" fontSize={9} fontWeight="600"
              fill={textDim} fontFamily="Inter Tight, Inter, sans-serif">
              {chartData[i] ? fmtDate(chartData[i].date) : ''}
            </text>
          ))}

          {/* Active crosshair + dot */}
          {activeIdx !== null && chartData[activeIdx] && (() => {
            const ax = toX(activeIdx), ay = toY(chartData[activeIdx].balance);
            return (
              <>
                <line x1={ax} y1={PT} x2={ax} y2={PT + chartH}
                  stroke={lineColor} strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                <circle cx={ax} cy={ay} r="5" fill={lineColor} stroke={surface} strokeWidth="2.5" />
              </>
            );
          })()}
        </svg>

        {/* Floating tooltip */}
        {activeIdx !== null && chartData[activeIdx] && (() => {
          const pct = activeIdx / Math.max(n - 1, 1);
          const left = `${Math.min(Math.max(pct * 100, 10), 90)}%`;
          return (
            <div style={{
              position: 'absolute', top: 10, left, transform: 'translateX(-50%)',
              background: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(14,18,32,0.95)',
              border: `1px solid ${isLight ? 'rgba(8,9,15,0.08)' : `${lineColor}30`}`,
              borderRadius: 10, padding: '5px 10px',
              backdropFilter: 'blur(8px)',
              pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10,
            }}>
              <span style={{ fontSize: 10, color: textDim, marginRight: 6 }}>{fmtDate(chartData[activeIdx].date)}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: textMain }}>{fmtFull(chartData[activeIdx].balance)}</span>
            </div>
          );
        })()}
      </div>

      {/* ── Three stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          {
            label: 'Минимум',
            value: minPoint ? fmtFull(minPoint.balance) : '—',
            sub: minPoint ? fmtDate(minPoint.date) : '',
            accent: '#FF4444',
            bg: 'rgba(255,68,68,0.10)',
            arrow: '↓',
          },
          {
            label: 'Максимум',
            value: maxPoint ? fmtFull(maxPoint.balance) : '—',
            sub: maxPoint ? fmtDate(maxPoint.date) : '',
            accent: '#4ADE80',
            bg: 'rgba(74,222,128,0.10)',
            arrow: '↑',
          },
          {
            label: 'За период',
            value: periodDelta !== null ? fmtShort(periodDelta) : '—',
            sub: periodPct !== null ? `${Math.abs(periodPct).toFixed(1)}%` : '',
            accent: deltaColor,
            bg: deltaBg,
            arrow: deltaPositive ? '↑' : '↓',
          },
        ].map(({ label, value, sub, accent, bg, arrow }) => (
          <div key={label} style={{ background: cardBg, borderRadius: 18, padding: '14px 12px' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: accent, fontWeight: 800, marginBottom: 10,
            }}>
              {arrow}
            </div>
            <p style={{ fontSize: 10, color: textDim, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {label}
            </p>
            <p style={{ fontSize: 13, fontWeight: 800, color: textMain, lineHeight: 1.1, letterSpacing: '-0.01em' }}>
              {value}
            </p>
            {sub && <p style={{ fontSize: 10, color: textDim, marginTop: 3 }}>{sub}</p>}
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

  if (items.length === 0) return <EmptyPie isLight={isLight} />;

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
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[16px] transition-colors text-left chek-flat"
              style={{ padding: '10px 12px' }}
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
  const isLight = useIsLight();

  if (loading) return (
    <div className="space-y-2.5 animate-pulse">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-14 rounded-[16px] bg-bg-secondary" />)}
    </div>
  );

  if (items.length === 0) return <EmptyTrends isLight={isLight} />;

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
            className="chek-flat flex items-center gap-3"
            style={{ padding: '10px 12px' }}
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

  if (categories.length === 0) return <EmptyMonthly isLight={isLight} />;

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
            className="chek-flat flex items-center gap-3"
            style={{ padding: '12px 14px' }}
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
      if (dx > 0 && slide < 4) setSlide(s => s + 1);
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
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={activePreset === p.days && !customFrom
                ? { background: 'var(--nav-accent)', color: '#fff' }
                : { background: 'var(--surface-2)', color: 'var(--text-dim)', border: '1px solid var(--nav-border)' }}>
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
              if (dx > 0 && slide < 4) setSlide(s => s + 1);
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

            {/* Slide 1 — Categories */}
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
