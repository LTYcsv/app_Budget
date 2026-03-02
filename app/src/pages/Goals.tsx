import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, TrendingUp, Check, Trash2, X } from 'lucide-react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { ProgressBar } from '@/components/ProgressBar';
import { Button } from '@/components/Button';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from '@/components/ui/empty';
import { api, type ApiGoal, type ApiGoalForecast, type ApiFeasibility } from '@/lib/api';

function formatAmount(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(num);
}

function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const FEASIBILITY_STYLES: Record<ApiFeasibility, { bg: string; text: string }> = {
  easily:      { bg: 'bg-green-500/20',  text: 'text-green-400' },
  feasible:    { bg: 'bg-blue-500/20',   text: 'text-blue-400' },
  hard:        { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  unrealistic: { bg: 'bg-red-500/20',    text: 'text-red-400' },
  no_data:     { bg: 'bg-white/10',      text: 'text-text-secondary' },
};

function FeasibilityBadge({ forecast }: { forecast: ApiGoalForecast | null }) {
  if (!forecast) return null;
  const style = FEASIBILITY_STYLES[forecast.feasibility];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
      {forecast.feasibility_label_ru}
    </span>
  );
}

function ForecastBlock({ forecast }: { forecast: ApiGoalForecast | null }) {
  if (!forecast || forecast.feasibility === 'no_data') return null;
  return (
    <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
      {parseFloat(forecast.required_monthly) > 0 && (
        <div className="flex justify-between text-xs">
          <span className="text-text-secondary">Нужно в месяц</span>
          <span className="font-medium tabular-nums">{formatAmount(forecast.required_monthly)}</span>
        </div>
      )}
      <div className="flex justify-between text-xs">
        <span className="text-text-secondary">Обычно остаётся</span>
        <span className="font-medium tabular-nums">{formatAmount(forecast.monthly_avg_balance)}</span>
      </div>
      {forecast.months_to_deadline && (
        <div className="flex justify-between text-xs">
          <span className="text-text-secondary">Месяцев до цели</span>
          <span className="font-medium">{forecast.months_to_deadline}</span>
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal, index, onDeposit, onDelete, onComplete }: {
  goal: ApiGoal; index: number;
  onDeposit: (goal: ApiGoal) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  const [showForecast, setShowForecast] = useState(false);
  const progress = parseFloat(goal.progress_percent);
  const days = daysLeft(goal.deadline);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      transition={{ delay: 0.05 * index }}
      className="bg-bg-secondary rounded-2xl p-4 border border-white/5 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 min-w-0">
          {goal.photo_url ? (
            <img src={goal.photo_url} alt={goal.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-2xl shrink-0">🎯</div>
          )}
          <div className="min-w-0 space-y-1">
            <h3 className="font-semibold truncate">{goal.name}</h3>
            <FeasibilityBadge forecast={goal.forecast} />
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onComplete(goal.id)}
            className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center text-text-tertiary hover:text-green-400 transition-colors">
            <Check size={14} />
          </button>
          <button onClick={() => onDelete(goal.id)}
            className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center text-text-tertiary hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold tabular-nums">{formatAmount(goal.current_amount)}</span>
          <span className="text-text-tertiary tabular-nums">из {formatAmount(goal.target_amount)}</span>
        </div>
        <ProgressBar value={progress} max={100} color="gradient" showValue={false} />
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">{progress.toFixed(0)}% выполнено</span>
          {days !== null && (
            <span className="flex items-center gap-1 text-text-tertiary">
              <Calendar size={12} />
              {days > 0 ? `${days} дней` : 'Просрочено'}
            </span>
          )}
        </div>
      </div>

      {goal.forecast && goal.forecast.feasibility !== 'no_data' && (
        <button onClick={() => setShowForecast((v) => !v)}
          className="mt-2 text-xs text-text-tertiary hover:text-text-secondary transition-colors">
          {showForecast ? '▲ Скрыть прогноз' : '▼ Показать прогноз'}
        </button>
      )}

      <AnimatePresence>
        {showForecast && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <ForecastBlock forecast={goal.forecast} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3">
        <button onClick={() => onDeposit(goal)}
          className="w-full py-2 bg-primary/10 rounded-xl text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
          + Пополнить
        </button>
      </div>
    </motion.div>
  );
}

function CompletedGoalCard({ goal, index }: { goal: ApiGoal; index: number }) {
  const completedDate = new Date(goal.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * index }}
      className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        {goal.photo_url ? (
          <img src={goal.photo_url} alt={goal.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-2xl shrink-0">🎯</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{goal.name}</h3>
            <Check size={16} className="text-green-400 shrink-0" />
          </div>
          <p className="text-green-400 text-sm tabular-nums">{formatAmount(goal.target_amount)} • Выполнено {completedDate}</p>
        </div>
      </div>
    </motion.div>
  );
}

function DepositModal({ goal, onClose, onSuccess }: { goal: ApiGoal; onClose: () => void; onSuccess: (updated: ApiGoal) => void }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) { setError('Введите сумму'); return; }
    setLoading(true); setError(null);
    try {
      const updated = await api.addDeposit(goal.id, { amount: num, note: note || null });
      onSuccess(updated); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Ошибка'); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-lg bg-bg-secondary rounded-3xl p-6 border border-white/10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Пополнить — {goal.name}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Сумма</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary">₽</span>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000" autoFocus
                className="w-full pl-8 pr-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Заметка (необязательно)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: зарплата за февраль"
              className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button className="w-full" size="lg" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Сохранение...' : 'Пополнить'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AddGoalModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (goal: ApiGoal) => void }) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Введите название'); return; }
    const amount = parseFloat(targetAmount);
    if (!amount || amount <= 0) { setError('Введите сумму цели'); return; }
    setLoading(true); setError(null);
    try {
      const goal = await api.createGoal({ name: name.trim(), target_amount: amount, deadline: deadline || null, photo_url: photoUrl.trim() || null });
      onSuccess(goal); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Ошибка'); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-lg bg-bg-secondary rounded-3xl p-6 border border-white/10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">Новая цель</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-text-secondary text-sm mb-2 block">Название цели</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Новый MacBook"
              className="w-full px-4 py-3 bg-bg-tertiary rounded-xl border border-white/5 focus:border-primary focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="text-text-secondary text-sm mb-2 block">Сумма цели</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary">₽</span>
              <input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="150000"
                className="w-full pl-8 pr-4 py-3 bg-bg-tertiary rounded-xl border border-white/5 focus:border-primary focus:outline-none transition-colors" />
            </div>
          </div>
          <div>
            <label className="text-text-secondary text-sm mb-2 block">Дата дедлайна (необязательно)</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-3 bg-bg-tertiary rounded-xl border border-white/5 focus:border-primary focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="text-text-secondary text-sm mb-2 block">Фото цели (URL, необязательно)</label>
            <input type="url" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..."
              className="w-full px-4 py-3 bg-bg-tertiary rounded-xl border border-white/5 focus:border-primary focus:outline-none transition-colors" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button className="w-full mt-2" size="lg" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Создание...' : 'Создать цель'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function Goals() {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [depositTarget, setDepositTarget] = useState<ApiGoal | null>(null);
  const [activeGoals, setActiveGoals] = useState<ApiGoal[]>([]);
  const [completedGoals, setCompletedGoals] = useState<ApiGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await api.getGoals();
      setActiveGoals(data.active);
      setCompletedGoals(data.completed);
    } catch (err) { setError(err instanceof Error ? err.message : 'Ошибка загрузки'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchGoals(); }, [fetchGoals]);

  const handleGoalCreated = (goal: ApiGoal) => setActiveGoals((prev) => [goal, ...prev]);

  const handleDepositSuccess = (updated: ApiGoal) => {
    if (updated.status === 'completed') {
      setActiveGoals((prev) => prev.filter((g) => g.id !== updated.id));
      setCompletedGoals((prev) => [updated, ...prev]);
    } else {
      setActiveGoals((prev) => prev.map((g) => g.id === updated.id ? updated : g));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить копилку?')) return;
    try { await api.deleteGoal(id); setActiveGoals((prev) => prev.filter((g) => g.id !== id)); }
    catch (err) { alert(err instanceof Error ? err.message : 'Ошибка удаления'); }
  };

  const handleComplete = async (id: string) => {
    if (!window.confirm('Отметить цель как выполненную?')) return;
    try {
      const updated = await api.completeGoal(id);
      setActiveGoals((prev) => prev.filter((g) => g.id !== id));
      setCompletedGoals((prev) => [updated, ...prev]);
    } catch (err) { alert(err instanceof Error ? err.message : 'Ошибка'); }
  };

  const totalSaved = activeGoals.reduce((acc, g) => acc + parseFloat(g.current_amount), 0);
  const totalTarget = activeGoals.reduce((acc, g) => acc + parseFloat(g.target_amount), 0);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Копилки</h1>
          <p className="text-text-secondary text-sm">{activeGoals.length} активных целей</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center hover:bg-primary-light transition-colors">
          <Plus size={20} className="text-white" />
        </button>
      </motion.div>

      {activeGoals.length > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-primary/20 via-bg-secondary to-secondary/20 rounded-3xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-text-secondary text-sm">Всего накоплено</p>
              <p className="text-3xl font-bold font-mono">₽<AnimatedCounter value={totalSaved} /></p>
            </div>
            <div className="text-right">
              <p className="text-text-secondary text-sm">Цель</p>
              <p className="text-xl font-mono text-text-tertiary">₽{totalTarget.toLocaleString('ru-RU')}</p>
            </div>
          </div>
          <ProgressBar value={totalSaved} max={Math.max(totalTarget, 1)} color="gradient" showValue />
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex gap-2">
        <button onClick={() => setActiveTab('active')}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors ${activeTab === 'active' ? 'bg-primary text-white' : 'bg-bg-secondary text-text-secondary'}`}>
          Активные ({activeGoals.length})
        </button>
        <button onClick={() => setActiveTab('completed')}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors ${activeTab === 'completed' ? 'bg-green-600 text-white' : 'bg-bg-secondary text-text-secondary'}`}>
          Выполнено ({completedGoals.length})
        </button>
      </motion.div>

      {error && <div className="rounded-2xl p-4 border border-red-500/20 bg-red-500/10 text-sm text-red-400">{error}</div>}

      <AnimatePresence mode="wait">
        {activeTab === 'active' ? (
          <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {loading ? (
              [1, 2].map((i) => (
                <div key={i} className="bg-bg-secondary rounded-2xl p-4 border border-white/5 animate-pulse">
                  <div className="h-12 w-full bg-white/10 rounded-xl mb-3" />
                  <div className="h-2 w-full bg-white/5 rounded-full" />
                </div>
              ))
            ) : activeGoals.length === 0 ? (
              <Empty className="border border-white/5 bg-bg-secondary">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><TrendingUp /></EmptyMedia>
                  <EmptyTitle>Активных целей нет</EmptyTitle>
                  <EmptyDescription>Создайте первую копилку, чтобы начать откладывать.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent />
              </Empty>
            ) : activeGoals.map((goal, i) => (
              <GoalCard key={goal.id} goal={goal} index={i}
                onDeposit={setDepositTarget} onDelete={handleDelete} onComplete={handleComplete} />
            ))}
          </motion.div>
        ) : (
          <motion.div key="completed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {completedGoals.length === 0 ? (
              <Empty className="border border-white/5 bg-bg-secondary">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><Check /></EmptyMedia>
                  <EmptyTitle>Завершённых целей нет</EmptyTitle>
                  <EmptyDescription>Здесь будут отображаться выполненные копилки.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent />
              </Empty>
            ) : completedGoals.map((goal, i) => (
              <CompletedGoalCard key={goal.id} goal={goal} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="bg-accent/10 border border-accent/30 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
            <TrendingUp size={16} className="text-accent" />
          </div>
          <div>
            <p className="font-medium text-sm text-accent">💡 Совет</p>
            <p className="text-text-secondary text-sm mt-1">
              Регулярные небольшие пополнения работают лучше редких крупных. Попробуй откладывать фиксированную сумму каждый месяц.
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showAddModal && <AddGoalModal onClose={() => setShowAddModal(false)} onSuccess={handleGoalCreated} />}
        {depositTarget && <DepositModal goal={depositTarget} onClose={() => setDepositTarget(null)} onSuccess={handleDepositSuccess} />}
      </AnimatePresence>
    </div>
  );
}
