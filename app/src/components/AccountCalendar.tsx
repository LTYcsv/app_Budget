import { useState, useEffect, useMemo } from 'react';
import { api, type ApiTransaction } from '@/lib/api';

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

export function AccountCalendar() {
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

    // 1. Average expense per day with at least one expense
    const totalExpense = expenseDays.reduce((s, [, d]) => s + d.expense, 0);
    const avgExpense = totalExpense / expenseDays.length;

    // 2. Most expensive day
    const [priceyDay, priceyData] = expenseDays.reduce(
      (max, cur) => (cur[1].expense > max[1].expense ? cur : max),
      expenseDays[0],
    );

    // 3. Top expense category by frequency
    const catCount: Record<string, number> = {};
    transactions.forEach(tx => {
      if (tx.type !== 'expense') return;
      const name = tx.category || '';
      if (!name) return;
      catCount[name] = (catCount[name] ?? 0) + 1;
    });
    const topCategory = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      avgExpense,
      priceyDay: Number(priceyDay),
      priceyExpense: priceyData.expense,
      topCategory,
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

  const selectedData = selectedDay !== null ? dailyData[selectedDay] : null;

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
          className="text-center"
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

                let border = '1px solid transparent';
                if (isToday || isSelected) border = '1px solid #5B9EF0';

                return (
                  <div
                    key={day}
                    onClick={() => handleDayClick(day)}
                    style={{
                      height: 52,
                      background: isSelected
                        ? 'rgba(91,158,240,0.08)'
                        : isLoading
                        ? 'rgba(14,18,32,0.3)'
                        : '#0E1220',
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

            {/* Expandable day card */}
            <div
              style={{
                overflow: 'hidden',
                maxHeight: selectedRowIndex === rowIdx ? 120 : 0,
                opacity: selectedRowIndex === rowIdx ? 1 : 0,
                transition: 'max-height 200ms ease, opacity 200ms ease',
              }}
            >
              {selectedDay !== null && selectedRowIndex === rowIdx && (
                <div
                  style={{
                    background: 'rgba(14,18,32,0.95)',
                    border: '1px solid rgba(91,158,240,0.2)',
                    borderRadius: 16,
                    padding: '12px 16px',
                    margin: '4px 0',
                  }}
                >
                  <p style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                    {selectedDay} {MONTHS_RU_GEN[month]}
                  </p>
                  {selectedData && selectedData.expense > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary" style={{ fontSize: 12 }}>Потрачено</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#FF4444' }}>{fmtFull(selectedData.expense)}</span>
                    </div>
                  )}
                  {selectedData && selectedData.income > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary" style={{ fontSize: 12 }}>Получено</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#4ADE80' }}>{fmtFull(selectedData.income)}</span>
                    </div>
                  )}
                  {(!selectedData || (selectedData.expense === 0 && selectedData.income === 0)) && (
                    <p className="text-text-secondary" style={{ fontSize: 12 }}>Нет транзакций</p>
                  )}
                </div>
              )}
            </div>
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
            <div style={{
              background: '#0E1220',
              borderRadius: 16,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
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
                <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{fmtFull(insights.avgExpense)}</p>
              </div>
            </div>

            {/* Card 2: Most expensive day */}
            <div style={{
              background: '#0E1220',
              borderRadius: 16,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
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
                <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: '#FF4444' }}>
                  {insights.priceyDay} {MONTHS_RU_GEN[month]} · {fmtFull(insights.priceyExpense)}
                </p>
              </div>
            </div>

            {/* Card 3: Top category */}
            {insights.topCategory && (
              <div style={{
                background: '#0E1220',
                borderRadius: 16,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(91,158,240,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  🏷️
                </div>
                <div>
                  <p className="text-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Топ категория</p>
                  <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: '#5B9EF0' }}>
                    {insights.topCategory}
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
