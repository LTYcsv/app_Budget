import { useState, useEffect, useMemo, useSyncExternalStore, useRef } from 'react';
import { api, type ApiTransaction } from '@/lib/api';

function subscribe(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}
function getIsLight() { return document.documentElement.classList.contains('light'); }
function useIsDark() { return !useSyncExternalStore(subscribe, getIsLight, () => false); }

type DayData = { expense: number; income: number; total: number };

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const MONTHS_RU_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function fmtCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const k = abs / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}к`;
  }
  return String(Math.round(abs));
}

function fmtFull(value: number): string {
  return '₽' + new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(value));
}

function ExpandedDayPanel({
  day, month, year, transactions, isDark,
}: {
  day: number;
  month: number;
  year: number;
  transactions: ApiTransaction[];
  isDark: boolean;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  const dayTxs = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const prefix = `${year}-${pad(month + 1)}-${pad(day)}`;
    return transactions
      .filter(tx => tx.date.startsWith(prefix) && tx.type !== 'transfer')
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [transactions, day, month]);

  useEffect(() => {
    if (innerRef.current) {
      setHeight(innerRef.current.scrollHeight);
    }
  }, [dayTxs]);

  const divider = isDark ? 'rgba(242,237,228,0.06)' : 'rgba(8,9,15,0.06)';

  return (
    <div
      style={{
        overflow: 'hidden',
        height,
        transition: 'height 220ms ease',
        margin: '4px 0',
      }}
    >
      <div
        ref={innerRef}
        className="bg-bg-secondary border border-white/[0.08]"
        style={{ borderRadius: 14, padding: '10px 14px' }}
      >
        <p
          className="text-text-secondary"
          style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8 }}
        >
          {day} {MONTHS_RU_GEN[month].toUpperCase()}
        </p>

        {dayTxs.length === 0 ? (
          <p className="text-text-secondary" style={{ fontSize: 12 }}>Нет транзакций</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {dayTxs.map((tx, i) => (
              <div
                key={tx.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: i === 0 ? 0 : 7,
                  paddingBottom: i === dayTxs.length - 1 ? 0 : 7,
                  borderBottom: i < dayTxs.length - 1 ? `1px solid ${divider}` : 'none',
                }}
              >
                <span
                  className="text-text-primary"
                  style={{ fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {tx.category || tx.name || '—'}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginLeft: 10,
                    flexShrink: 0,
                    color: tx.type === 'income' ? '#4ADE80' : '#FF4444',
                  }}
                >
                  {tx.type === 'income' ? '+' : '−'}{fmtFull(Math.abs(Number(tx.amount)))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AccountCalendar() {
  const isDark = useIsDark();
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [dailyData, setDailyData] = useState<Record<number, DayData>>({});
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dateTo = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    console.log('[AccountCalendar] fetch', dateFrom, dateTo);

    setIsLoading(true);
    setDailyData({});
    setTransactions([]);
    setSelectedDay(null);

    api.getTransactions(dateFrom, dateTo)
      .then((txs: ApiTransaction[]) => {
        setTransactions(txs);
        const data: Record<number, DayData> = {};
        txs.forEach(tx => {
          if (tx.type === 'transfer') return;
          const d = tx.date.slice(0, 10);
          const txDay = parseInt(d.slice(8, 10), 10);
          const txMonth = parseInt(d.slice(5, 7), 10) - 1;
          const txYear = parseInt(d.slice(0, 4), 10);
          if (txYear !== year || txMonth !== month) return;
          if (!data[txDay]) data[txDay] = { expense: 0, income: 0, total: 0 };
          const amount = parseFloat(String(tx.amount));
          if (tx.type === 'expense') {
            data[txDay].expense += Math.abs(amount);
          } else if (tx.type === 'income') {
            data[txDay].income += Math.abs(amount);
          }
          data[txDay].total = data[txDay].income - data[txDay].expense;
        });
        setDailyData(data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [selectedMonth]);

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;

  const todayDay =
    today.getFullYear() === year && today.getMonth() === month
      ? today.getDate()
      : null;

  const prevMonth = () => setSelectedMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setSelectedMonth(new Date(year, month + 1, 1));

  const handleDayClick = (day: number) => {
    setSelectedDay(prev => (prev === day ? null : day));
  };

  // ── Insights ────────────────────────────────────────────────────────────────

  const insights = useMemo(() => {
    const expenseDays = Object.entries(dailyData).filter(([, d]) => d.expense > 0);
    if (expenseDays.length === 0) return null;

    const totalExpense = expenseDays.reduce((s, [, d]) => s + d.expense, 0);
    const avgExpense = totalExpense / expenseDays.length;

    const [priceyDay, priceyData] = expenseDays.reduce(
      (max, cur) => (cur[1].expense > max[1].expense ? cur : max),
      expenseDays[0],
    );

    const catCount: Record<string, number> = {};
    transactions.forEach(tx => {
      if (tx.type !== 'expense') return;
      const name = tx.category || '';
      if (!name) return;
      catCount[name] = (catCount[name] ?? 0) + 1;
    });
    const catSpend: Record<string, number> = {};
    transactions.forEach(tx => {
      if (tx.type !== 'expense') return;
      const name = tx.category || '';
      if (!name) return;
      catSpend[name] = (catSpend[name] ?? 0) + Math.abs(Number(tx.amount));
    });

    const topCategoryEntry = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0] ?? null;
    const topCategory = topCategoryEntry?.[0] ?? null;
    const topCategoryCount = topCategoryEntry?.[1] ?? 0;
    const topCategoryTotal = topCategory ? (catSpend[topCategory] ?? 0) : 0;

    return {
      avgExpense,
      priceyDay: Number(priceyDay),
      priceyExpense: priceyData.expense,
      topCategory,
      topCategoryCount,
      topCategoryTotal,
    };
  }, [dailyData, transactions]);

  // ── Calendar grid ────────────────────────────────────────────────────────────

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  const selectedRowIndex = selectedDay !== null
    ? rows.findIndex(row => row.includes(selectedDay))
    : -1;

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="text-[#5B9EF0] text-xl leading-none"
          style={{ padding: 12 }}
        >
          ‹
        </button>
        <span
          className="text-text-primary text-center"
          style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontWeight: 700, fontSize: 16 }}
        >
          {MONTHS_RU[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="text-[#5B9EF0] text-xl leading-none"
          style={{ padding: 12 }}
        >
          ›
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-[3px]">
        {WEEKDAYS.map(d => (
          <div
            key={d}
            className="text-center text-text-secondary"
            style={{ fontSize: 11, fontWeight: 500 }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar rows */}
      <div className="space-y-[3px]">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx}>
            <div className="grid grid-cols-7 gap-[3px]">
              {row.map((day, colIdx) => {
                if (day === null) {
                  return <div key={`empty-${rowIdx}-${colIdx}`} />;
                }

                const data = dailyData[day];
                const isToday = day === todayDay;
                const isSelected = day === selectedDay;
                const hasData = !isLoading && data && data.total !== 0;

                const border = (isToday || isSelected)
                  ? '1px solid #5B9EF0'
                  : '1px solid transparent';

                return (
                  <div
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className="bg-bg-tertiary"
                    style={{
                      height: 52,
                      background: isSelected ? 'rgba(91,158,240,0.08)' : undefined,
                      borderRadius: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '5px 6px',
                      position: 'relative',
                      border,
                      opacity: isLoading ? 0.3 : 1,
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      className="text-text-secondary"
                      style={{ fontSize: 10, lineHeight: 1 }}
                    >
                      {day}
                    </span>

                    <div style={{
                      width: '100%',
                      height: '0.5px',
                      background: isDark ? 'rgba(242,237,228,0.08)' : 'rgba(8,9,15,0.08)',
                      marginTop: 3,
                      marginBottom: 3,
                    }} />

                    {hasData && (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1, color: data.total > 0 ? '#4ADE80' : '#FF4444' }}>
                          {fmtCompact(data.total)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Expandable day transactions */}
            {selectedDay !== null && selectedRowIndex === rowIdx && (
              <ExpandedDayPanel
                day={selectedDay}
                month={month}
                year={year}
                transactions={transactions}
                isDark={isDark}
              />
            )}
          </div>
        ))}
      </div>

      {/* ── Insights ── */}
      {insights && (
        <div>
          <p
            className="text-text-secondary mb-3"
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}
          >
            ИНСАЙТЫ
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Card 1: Average day */}
            <div className="bg-bg-tertiary" style={{ borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(91,158,240,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>
                📊
              </div>
              <div>
                <p className="text-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Средний день</p>
                <p className="text-text-primary" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{fmtFull(insights.avgExpense)}</p>
              </div>
            </div>

            {/* Card 2: Most expensive day */}
            <div className="bg-bg-tertiary" style={{ borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(91,158,240,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>
                🔥
              </div>
              <div>
                <p className="text-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Самый дорогой день</p>
                <p className="text-error" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>
                  {insights.priceyDay} {MONTHS_RU_GEN[month]} · {fmtFull(insights.priceyExpense)}
                </p>
              </div>
            </div>

            {/* Card 3: Top category */}
            {insights.topCategory && (
              <div className="bg-bg-tertiary" style={{ borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(91,158,240,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  🏷️
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="text-text-secondary" style={{ fontSize: 12, marginBottom: 4 }}>Топ категория</p>
                  <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: '#5B9EF0', marginBottom: 4 }}>
                    {insights.topCategory}
                  </p>
                  <p className="text-text-secondary" style={{ fontSize: 12 }}>
                    {fmtFull(insights.topCategoryTotal)} · {insights.topCategoryCount} {
                      insights.topCategoryCount === 1 ? 'транзакция' :
                      insights.topCategoryCount < 5 ? 'транзакции' : 'транзакций'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
