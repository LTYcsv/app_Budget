import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, List } from 'lucide-react';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from '@/components/ui/empty';

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
        className="bg-bg-secondary rounded-2xl p-4 border border-white/5"
      >
        <Empty className="border border-white/5 bg-bg-secondary">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <List />
            </EmptyMedia>
            <EmptyTitle>Сводка будет добавлена</EmptyTitle>
            <EmptyDescription>Мы перезапускаем аналитику и готовим новый набор метрик.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent />
        </Empty>
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
            <EmptyTitle>График в разработке</EmptyTitle>
            <EmptyDescription>Скоро добавим новые визуализации и сценарии сравнения.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent />
        </Empty>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-bg-secondary rounded-2xl p-4 border border-white/5"
      >
        <Empty className="border border-white/5 bg-bg-secondary">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <List />
            </EmptyMedia>
            <EmptyTitle>Категории появятся позже</EmptyTitle>
            <EmptyDescription>Отложили до нового пайплайна аналитики.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent />
        </Empty>
      </motion.div>
    </div>
  );
}
