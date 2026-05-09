import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, TrendingUp, Check, Trash2, X } from 'lucide-react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { ProgressBar } from '@/components/ProgressBar';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from '@/components/ui/empty';
import { api, type ApiGoal, type ApiGoalForecast, type ApiFeasibility, type ApiAccount } from '@/lib/api';
import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';
import { useTransactions } from '@/context/TransactionsContext';
import { toast } from 'sonner';
import { sanitizeDecimalInput } from '@/lib/utils';

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
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--nav-border)' }} className="space-y-1">
      {parseFloat(forecast.required_monthly) > 0 && (
        <div className="flex justify-between text-xs">
          <span style={{ color: 'var(--text-dim)' }}>Нужно в месяц</span>
          <span className="num font-medium">{formatAmount(forecast.required_monthly)}</span>
        </div>
      )}
      {forecast.interest_monthly && parseFloat(forecast.interest_monthly) > 0 && (
        <div className="flex justify-between text-xs">
          <span style={{ color: 'var(--text-dim)' }}>Доход от %</span>
          <span className="num font-medium text-green-400">+{formatAmount(forecast.interest_monthly)}/мес</span>
        </div>
      )}
      <div className="flex justify-between text-xs">
        <span style={{ color: 'var(--text-dim)' }}>Обычно остаётся</span>
        <span className="num font-medium">{formatAmount(forecast.monthly_avg_balance)}</span>
      </div>
      {forecast.months_to_deadline && (
        <div className="flex justify-between text-xs">
          <span style={{ color: 'var(--text-dim)' }}>Месяцев до цели</span>
          <span className="font-medium">{forecast.months_to_deadline}</span>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  background: 'var(--surface-2)',
  border: '1px solid var(--nav-border)',
  borderRadius: 12,
  padding: '12px 16px',
  width: '100%',
  color: 'inherit',
  fontSize: 14,
  outline: 'none',
} as const;

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
      className="chek-flat"
      style={{ padding: 16 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 min-w-0">
          {goal.photo_url ? (
            <img src={goal.photo_url} alt={goal.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: 'var(--surface-2)' }}>🎯</div>
          )}
          <div className="min-w-0 space-y-1">
            <h3 className="display font-semibold truncate" style={{ fontSize: 15 }}>{goal.name}</h3>
            <div className="flex flex-wrap gap-1">
              <FeasibilityBadge forecast={goal.forecast} />
              {goal.interest_rate && parseFloat(goal.interest_rate) > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--surface-2)', color: 'var(--nav-accent)' }}>
                  🏦 {parseFloat(goal.interest_rate).toFixed(0)}%{' '}
                  {goal.interest_frequency === 'monthly' ? 'мес.' : 'год.'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onComplete(goal.id)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:text-green-400"
            style={{ background: 'var(--surface-2)', color: 'var(--text-dim)' }}>
            <Check size={14} />
          </button>
          <button onClick={() => onDelete(goal.id)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:text-red-400"
            style={{ background: 'var(--surface-2)', color: 'var(--text-dim)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="num font-semibold">{formatAmount(goal.current_amount)}</span>
          <span className="num" style={{ color: 'var(--text-dim)' }}>из {formatAmount(goal.target_amount)}</span>
        </div>
        <ProgressBar value={progress} max={100} color="gradient" showValue={false} />
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: 'var(--text-dim)' }}>{progress.toFixed(0)}% выполнено</span>
          {days !== null && (
            <span className="flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
              <Calendar size={12} />
              {days > 0 ? `${days} дней` : 'Просрочено'}
            </span>
          )}
        </div>
      </div>

      {goal.interest_next_date && (
        <p className="mt-2 text-xs" style={{ color: 'var(--text-dim)' }}>
          Следующее начисление: {new Date(goal.interest_next_date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' })}
        </p>
      )}

      {goal.forecast && goal.forecast.feasibility !== 'no_data' && (
        <button onClick={() => setShowForecast((v) => !v)}
          className="mt-2 text-xs transition-colors"
          style={{ color: 'var(--text-dim)' }}>
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
          className="w-full py-2 rounded-xl text-sm font-medium transition-colors"
          style={{ background: 'var(--surface-2)', color: 'var(--nav-accent)', border: '1px solid var(--border-accent)' }}>
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
            <h3 className="display font-semibold truncate" style={{ fontSize: 15 }}>{goal.name}</h3>
            <Check size={16} className="text-green-400 shrink-0" />
          </div>
          <p className="text-green-400 text-sm num">{formatAmount(goal.target_amount)} • Выполнено {completedDate}</p>
        </div>
      </div>
    </motion.div>
  );
}

function DepositModal({ goal, onClose, onSuccess, lang }: { goal: ApiGoal; onClose: () => void; onSuccess: (updated: ApiGoal) => void; lang: import('@/lib/i18n').Lang }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState<string>('');
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getAccounts().then((list) => {
      setAccounts(list);
      if (list.length > 0) setAccountId(list[0].id);
    }).catch((err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Не удалось загрузить список счетов');
    });
  }, []);

  const selectedAccount = accounts.find((a) => a.id === accountId) ?? null;

  const handleSubmit = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) { setError('Введите сумму'); return; }
    setLoading(true); setError(null);
    try {
      const updated = await api.addDeposit(goal.id, {
        amount: num,
        note: note || null,
        account_id: accountId || null,
      });
      onSuccess(updated); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Ошибка'); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="chek-card w-full max-w-lg" style={{ padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="display" style={{ fontSize: 18 }}>Пополнить — {goal.name}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--surface-2)' }}><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-dim)' }}>Сумма</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }}>₽</span>
              <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(sanitizeDecimalInput(e.target.value))} placeholder="5000" autoFocus autoComplete="off"
                style={{ ...inputStyle, paddingLeft: 32 }} />
            </div>
          </div>

          {accounts.length > 0 && (
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-dim)' }}>Списать со счёта</label>
              <div className="flex flex-col gap-1.5">
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAccountId(a.id)}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-colors"
                    style={{
                      background: 'var(--surface-2)',
                      border: `1px solid ${accountId === a.id ? 'var(--nav-accent)' : 'var(--nav-border)'}`,
                      color: accountId === a.id ? 'var(--nav-accent)' : 'var(--text-dim)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                      <span className="font-medium">{a.name}</span>
                    </div>
                    <span className={`num text-xs ${Number(a.current_balance) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {Number(a.current_balance).toLocaleString('ru-RU')} ₽
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAccountId('')}
                  className="px-4 py-2.5 rounded-xl text-sm text-left transition-colors"
                  style={{
                    background: 'var(--surface-2)',
                    border: `1px solid ${accountId === '' ? 'var(--nav-accent)' : 'var(--nav-border)'}`,
                    color: accountId === '' ? 'var(--nav-accent)' : 'var(--text-dim)',
                  }}
                >
                  Без привязки к счёту
                </button>
              </div>
              {selectedAccount && parseFloat(amount) > 0 && Number(selectedAccount.current_balance) < parseFloat(amount) && (
                <p className="text-xs text-orange-400 mt-1.5">⚠️ На счёте недостаточно средств</p>
              )}
            </div>
          )}

          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-dim)' }}>Заметка (необязательно)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: зарплата за февраль"
              style={inputStyle} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button className="tx-submit-btn tx-submit-btn--income" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Сохранение...' : t(lang, 'add_deposit')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AddGoalModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (goal: ApiGoal) => void }) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [interestFrequency, setInterestFrequency] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Введите название'); return; }
    const amount = parseFloat(targetAmount);
    if (!amount || amount <= 0) { setError('Введите сумму цели'); return; }
    const rate = interestRate ? parseFloat(interestRate) : null;
    if (rate !== null && (rate < 0 || rate > 100)) { setError('Ставка должна быть от 0 до 100%'); return; }
    setLoading(true); setError(null);
    try {
      const goal = await api.createGoal({
        name: name.trim(),
        target_amount: amount,
        deadline: deadline || null,
        photo_url: null,
        interest_rate: rate,
        interest_frequency: rate ? interestFrequency : null,
      });
      onSuccess(goal); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Ошибка'); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="chek-card w-full max-w-lg" style={{ padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="display" style={{ fontSize: 20 }}>Новая цель</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--surface-2)' }}><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm mb-2 block" style={{ color: 'var(--text-dim)' }}>Название цели</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Новый MacBook"
              style={inputStyle} />
          </div>
          <div>
            <label className="text-sm mb-2 block" style={{ color: 'var(--text-dim)' }}>Сумма цели</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }}>₽</span>
              <input type="text" inputMode="decimal" value={targetAmount} onChange={(e) => setTargetAmount(sanitizeDecimalInput(e.target.value))} placeholder="150000" autoComplete="off"
                style={{ ...inputStyle, paddingLeft: 32 }} />
            </div>
          </div>
          <div>
            <label className="text-sm mb-2 block" style={{ color: 'var(--text-dim)' }}>Дата дедлайна (необязательно)</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label className="text-sm mb-2 block" style={{ color: 'var(--text-dim)' }}>Процентная ставка (необязательно)</label>
            <div className="relative">
              <input
                type="text" inputMode="decimal" value={interestRate} onChange={(e) => setInterestRate(sanitizeDecimalInput(e.target.value))}
                placeholder="18" autoComplete="off"
                style={{ ...inputStyle, paddingRight: 80 }}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
                style={{ color: 'var(--text-dim)' }}>
                % годовых
              </span>
            </div>

            {interestRate && parseFloat(interestRate) > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Когда начислять проценты?</p>
                <div className="flex gap-2">
                  {(['monthly', 'yearly'] as const).map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setInterestFrequency(freq)}
                      className="flex-1 py-2.5 px-3 rounded-xl text-left transition-colors"
                      style={{
                        border: `1px solid ${interestFrequency === freq ? 'var(--nav-accent)' : 'var(--nav-border)'}`,
                        background: 'var(--surface-2)',
                        color: interestFrequency === freq ? 'var(--nav-accent)' : 'var(--text-dim)',
                      }}
                    >
                      <span className="text-sm font-medium block">
                        {freq === 'monthly' ? 'Ежемесячно' : 'Ежегодно'}
                      </span>
                      <span className="text-xs opacity-70">
                        {freq === 'monthly'
                          ? `по ${(parseFloat(interestRate) / 12).toFixed(2)}% в месяц`
                          : `${parseFloat(interestRate).toFixed(1)}% раз в год`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--nav-border)' }}>
            <span className="text-sm" style={{ color: 'var(--text-dim)' }}>Фото цели</span>
            <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--nav-border)', color: 'var(--text-dim)' }}>Скоро</span>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button className="tx-submit-btn tx-submit-btn--income mt-2" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Создание...' : 'Создать цель'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function useIsDark() {
  return useSyncExternalStore(
    (cb) => { const o = new MutationObserver(cb); o.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] }); return () => o.disconnect(); },
    () => !document.documentElement.classList.contains('light'),
    () => true,
  );
}

export function Goals() {
  const isDark = useIsDark();
  const { refresh } = useTransactions();
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const { lang } = useLang();
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
    void refresh();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить копилку?')) return;
    try { await api.deleteGoal(id); setActiveGoals((prev) => prev.filter((g) => g.id !== id)); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Не удалось удалить копилку'); }
  };

  const handleComplete = async (id: string) => {
    if (!window.confirm('Отметить цель как выполненную?')) return;
    try {
      const updated = await api.completeGoal(id);
      setActiveGoals((prev) => prev.filter((g) => g.id !== id));
      setCompletedGoals((prev) => [updated, ...prev]);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Не удалось завершить копилку'); }
  };

  const totalSaved = activeGoals.reduce((acc, g) => acc + parseFloat(g.current_amount), 0);
  const totalTarget = activeGoals.reduce((acc, g) => acc + parseFloat(g.target_amount), 0);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="display" style={{ fontSize: 22 }}>{t(lang, 'goals_title')}</h1>
          <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{activeGoals.length} активных целей</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: 'var(--nav-accent)' }}>
          <Plus size={20} className="text-white" />
        </button>
      </motion.div>

      {/* Summary card */}
      {activeGoals.length > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className="chek-card" style={{ padding: 24 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Всего накоплено</p>
              <p className="num" style={{ fontSize: 28, fontWeight: 700 }}>₽<AnimatedCounter value={totalSaved} /></p>
            </div>
            <div className="text-right">
              <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Цель</p>
              <p className="num" style={{ fontSize: 20, color: 'var(--text-dim)' }}>₽{totalTarget.toLocaleString('ru-RU')}</p>
            </div>
          </div>
          <ProgressBar value={totalSaved} max={Math.max(totalTarget, 1)} color="gradient" showValue />
          <div className="glow-line" />
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex gap-2">
        <button onClick={() => setActiveTab('active')}
          className="flex-1 py-3 rounded-xl font-medium transition-colors"
          style={{
            background: activeTab === 'active' ? 'var(--nav-accent)' : 'var(--surface-2)',
            color: activeTab === 'active' ? '#fff' : 'var(--text-dim)',
          }}>
          Активные ({activeGoals.length})
        </button>
        <button onClick={() => setActiveTab('completed')}
          className="flex-1 py-3 rounded-xl font-medium transition-colors"
          style={{
            background: activeTab === 'completed' ? '#22c55e' : 'var(--surface-2)',
            color: activeTab === 'completed' ? '#fff' : 'var(--text-dim)',
          }}>
          Выполнено ({completedGoals.length})
        </button>
      </motion.div>

      {error && <div className="rounded-2xl p-4 border border-red-500/20 bg-red-500/10 text-sm text-red-400">{error}</div>}

      <AnimatePresence mode="wait">
        {activeTab === 'active' ? (
          <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {loading ? (
              [1, 2].map((i) => (
                <div key={i} className="chek-flat animate-pulse" style={{ height: 120 }} />
              ))
            ) : activeGoals.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, minHeight: 300 }}>
                <button
                  onClick={() => setShowAddModal(true)}
                  style={{ width: 64, height: 64, borderRadius: '50%', background: isDark ? '#5B9EF0' : '#E07840', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Создать копилку</p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-dim)' }}>Откладывай на мечту</p>
                </div>
              </div>
            ) : activeGoals.map((goal, i) => (
              <GoalCard key={goal.id} goal={goal} index={i}
                onDeposit={setDepositTarget} onDelete={handleDelete} onComplete={handleComplete} />
            ))}
          </motion.div>
        ) : (
          <motion.div key="completed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {completedGoals.length === 0 ? (
              <Empty className="chek-flat">
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

      {/* Tip */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="chek-flat" style={{ padding: 16 }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--surface-2)' }}>
            <TrendingUp size={16} style={{ color: 'var(--nav-accent)' }} />
          </div>
          <div>
            <p className="font-medium text-sm" style={{ color: 'var(--nav-accent)' }}>💡 Совет</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
              Регулярные небольшие пополнения работают лучше редких крупных. Попробуй откладывать фиксированную сумму каждый месяц.
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showAddModal && <AddGoalModal onClose={() => setShowAddModal(false)} onSuccess={handleGoalCreated} />}
        {depositTarget && <DepositModal lang={lang} goal={depositTarget} onClose={() => setDepositTarget(null)} onSuccess={handleDepositSuccess} />}
      </AnimatePresence>
    </div>
  );
}
