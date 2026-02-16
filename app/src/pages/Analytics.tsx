import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, List } from 'lucide-react';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from '@/components/ui/empty';
import { api, type CategorySpendResponse } from '@/lib/api';
import { CategoryIcon } from '@/components/CategoryIcon';

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

export function Analytics() {
  const defaults = getDefaultRange();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [categorySpend, setCategorySpend] = useState<CategorySpendResponse | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setCategoryLoading(true);
      setCategoryError(null);
      try {
        const payload = await api.getCategorySpend(dateFrom, dateTo);
        if (active) setCategorySpend(payload);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Не удалось загрузить аналитику по категориям';
        if (active) setCategoryError(message);
      } finally {
        if (active) setCategoryLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [dateFrom, dateTo]);

  const totalSpent = useMemo(() => Number(categorySpend?.total || 0), [categorySpend]);
  const items = useMemo(
    () =>
      (categorySpend?.items || []).map((item) => ({
        ...item,
        amount: Number(item.amount),
        percent: Number(item.percent),
      })),
    [categorySpend]
  );

  const colors = ['#F59E0B', '#6366F1', '#10B981', '#EC4899', '#38BDF8', '#A855F7', '#F97316'];

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-2xl font-bold">Аналитика</h1>
        <div className="flex items-center gap-2 px-3 py-2 bg-bg-secondary rounded-xl text-sm text-text-secondary">
          <Calendar size={16} />
          {formatDateDisplay(dateFrom)} - {formatDateDisplay(dateTo)}
        </div>
      </motion.div>

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
              className="w-full px-3 py-2 bg-bg-primary rounded-lg border border-white/5 focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-text-tertiary mb-1 block">До</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-bg-primary rounded-lg border border-white/5 focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <h2 className="text-lg font-semibold">По категориям</h2>

        {categoryError ? (
          <div className="px-4 py-3 rounded-xl border border-error/25 bg-error/10 text-sm text-error">
            {categoryError}
          </div>
        ) : categoryLoading ? (
          <div className="bg-bg-secondary rounded-2xl p-4 border border-white/5">
            <Empty className="border border-white/5 bg-bg-secondary">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <List />
                </EmptyMedia>
                <EmptyTitle>Загрузка аналитики</EmptyTitle>
                <EmptyDescription>Считаем траты по категориям...</EmptyDescription>
              </EmptyHeader>
              <EmptyContent />
            </Empty>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-bg-secondary rounded-2xl p-4 border border-white/5">
            <Empty className="border border-white/5 bg-bg-secondary">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <List />
                </EmptyMedia>
                <EmptyTitle>Нет расходов за период</EmptyTitle>
                <EmptyDescription>Добавь операции, и мы покажем распределение.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent />
            </Empty>
          </div>
        ) : (
          <>
            <div className="bg-bg-secondary rounded-3xl p-5 border border-white/5 flex items-center gap-5">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="44" stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
                  {(() => {
                    const radius = 44;
                    const circumference = 2 * Math.PI * radius;
                    let offset = 0;
                    return items.map((item, index) => {
                      const color = colors[index % colors.length];
                      const gap = 2;
                      const raw = (item.percent / 100) * circumference;
                      const length = Math.max(0, raw - gap);
                      const dasharray = `${length} ${circumference - length}`;
                      const dashoffset = -offset;
                      offset += raw;
                      return (
                        <circle
                          key={`${item.group}-${index}`}
                          cx="60"
                          cy="60"
                          r={radius}
                          stroke={color}
                          strokeWidth="10"
                          strokeDasharray={dasharray}
                          strokeDashoffset={dashoffset}
                          strokeLinecap="round"
                          fill="none"
                        />
                      );
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-text-tertiary">Всего</span>
                  <span className="text-lg font-bold">{totalSpent.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-text-tertiary">Всего потрачено</p>
                <p className="text-2xl font-bold">{totalSpent.toLocaleString('ru-RU')} ₽</p>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={`${item.group}-${index}`} className="bg-bg-secondary rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-bg-primary flex items-center justify-center">
                        <CategoryIcon icon={item.icon} />
                      </div>
                      <div>
                        <p className="font-medium">{item.group}</p>
                        <div className="mt-2 h-2 w-48 max-w-[12rem] bg-bg-primary rounded-full overflow-hidden">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${Math.min(100, item.percent)}%`,
                              backgroundColor: colors[index % colors.length],
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{item.amount.toLocaleString('ru-RU')} ₽</p>
                      <p className="text-xs text-text-tertiary">{item.percent.toFixed(0)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-bg-secondary rounded-2xl p-4 border border-white/5"
      >
        <Empty className="border border-white/5 bg-bg-secondary">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <List />
            </EmptyMedia>
            <EmptyTitle>Что если</EmptyTitle>
            <EmptyDescription>Скоро добавим сценарии “что если” для планирования бюджета.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent />
        </Empty>
      </motion.div>
    </div>
  );
}
