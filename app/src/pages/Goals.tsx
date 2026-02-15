import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Calendar,
  TrendingUp,
  MoreVertical,
  Check,
  List,
} from 'lucide-react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { ProgressBar } from '@/components/ProgressBar';
import { Button } from '@/components/Button';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from '@/components/ui/empty';

type Goal = {
  id: number;
  name: string;
  target: number;
  current: number;
  deadline: string;
  icon: string;
  color: string;
  category: string;
};

type CompletedGoal = {
  id: number;
  name: string;
  target: number;
  current: number;
  completedDate: string;
  icon: string;
  color: string;
};

const goals: Goal[] = [];
const completedGoals: CompletedGoal[] = [];

export function Goals() {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [showAddModal, setShowAddModal] = useState(false);

  const totalSaved = goals.reduce((acc, goal) => acc + goal.current, 0);
  const totalTarget = goals.reduce((acc, goal) => acc + goal.target, 0);
  const totalTargetSafe = Math.max(totalTarget, 1);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">Копилки</h1>
          <p className="text-text-secondary text-sm">{goals.length} активных целей</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center hover:bg-primary-light transition-colors"
        >
          <Plus size={20} className="text-white" />
        </button>
      </motion.div>

      {/* Total progress */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-primary/20 via-bg-secondary to-secondary/20 rounded-3xl p-6 border border-white/5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-text-secondary text-sm">Всего накоплено</p>
            <p className="text-3xl font-bold font-mono">
              ₽<AnimatedCounter value={totalSaved} />
            </p>
          </div>
          <div className="text-right">
            <p className="text-text-secondary text-sm">Цель</p>
            <p className="text-xl font-mono text-text-tertiary">
              ₽{totalTarget.toLocaleString('ru-RU')}
            </p>
          </div>
        </div>
        <ProgressBar
          value={totalSaved}
          max={totalTargetSafe}
          color="gradient"
          showValue
        />
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex gap-2"
      >
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
            activeTab === 'active'
              ? 'bg-primary text-white'
              : 'bg-bg-secondary text-text-secondary'
          }`}
        >
          Активные ({goals.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
            activeTab === 'completed'
              ? 'bg-success text-white'
              : 'bg-bg-secondary text-text-secondary'
          }`}
        >
          Выполнено ({completedGoals.length})
        </button>
      </motion.div>

      {/* Goals list */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <AnimatePresence mode="wait">
          {activeTab === 'active' ? (
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {goals.length === 0 ? (
                <Empty className="border border-white/5 bg-bg-secondary">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <List />
                    </EmptyMedia>
                    <EmptyTitle>Активных целей нет</EmptyTitle>
                    <EmptyDescription>Создайте первую цель, чтобы начать копить.</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent />
                </Empty>
              ) : (
                goals.map((goal, i) => (
                  <GoalCard key={goal.id} goal={goal} index={i} />
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="completed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {completedGoals.length === 0 ? (
                <Empty className="border border-white/5 bg-bg-secondary">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <List />
                    </EmptyMedia>
                    <EmptyTitle>Завершённых целей нет</EmptyTitle>
                    <EmptyDescription>Здесь будут отображаться выполненные цели.</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent />
                </Empty>
              ) : (
                completedGoals.map((goal, i) => (
                  <CompletedGoalCard key={goal.id} goal={goal} index={i} />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Quick tip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-accent/10 border border-accent/30 rounded-2xl p-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={16} className="text-accent" />
          </div>
          <div>
            <p className="font-medium text-sm text-accent">💡 Совет</p>
            <p className="text-text-secondary text-sm mt-1">
              Автоматическое пополнение копилки поможет достичь цели быстрее. 
              Настрой перевод 10% от дохода.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Add Goal Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddGoalModal onClose={() => setShowAddModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function GoalCard({ goal, index }: { goal: Goal; index: number }) {
  const percent = Math.round((goal.current / goal.target) * 100);
  const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
      className="bg-bg-secondary rounded-2xl p-4 border border-white/5 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: `${goal.color}20` }}
        >
          {goal.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold truncate">{goal.name}</h3>
              <p className="text-text-tertiary text-xs">{goal.category}</p>
            </div>
            <button className="p-1 hover:bg-bg-tertiary rounded-lg transition-colors">
              <MoreVertical size={16} className="text-text-tertiary" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-mono font-semibold">
            ₽{goal.current.toLocaleString('ru-RU')}
          </span>
          <span className="text-text-tertiary">
            из ₽{goal.target.toLocaleString('ru-RU')}
          </span>
        </div>
        <ProgressBar value={percent} max={100} color="gradient" showValue={false} />
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">{percent}% выполнено</span>
          <span className="flex items-center gap-1 text-text-tertiary">
            <Calendar size={12} />
            {daysLeft > 0 ? `${daysLeft} дней` : 'Просрочено'}
          </span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 mt-3">
        <button className="flex-1 py-2 bg-primary/10 rounded-xl text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
          + Пополнить
        </button>
        <button className="flex-1 py-2 bg-bg-tertiary rounded-xl text-text-secondary text-sm hover:text-text-primary transition-colors">
          История
        </button>
      </div>
    </motion.div>
  );
}

function CompletedGoalCard({ goal, index }: { goal: CompletedGoal; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
      className="bg-success/10 border border-success/30 rounded-2xl p-4"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: `${goal.color}30` }}
        >
          {goal.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{goal.name}</h3>
            <Check size={16} className="text-success" />
          </div>
          <p className="text-success text-sm">
            ₽{goal.target.toLocaleString('ru-RU')} • Выполнено {goal.completedDate}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function AddGoalModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-lg bg-bg-secondary rounded-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Новая цель</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-text-secondary text-sm mb-2 block">Название цели</label>
            <input
              type="text"
              placeholder="Например: Новый ноутбук"
              className="w-full px-4 py-3 bg-bg-tertiary rounded-xl border border-white/5 focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-text-secondary text-sm mb-2 block">Сумма</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary">₽</span>
              <input
                type="number"
                placeholder="100000"
                className="w-full pl-8 pr-4 py-3 bg-bg-tertiary rounded-xl border border-white/5 focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-text-secondary text-sm mb-2 block">Дата завершения</label>
            <input
              type="date"
              className="w-full px-4 py-3 bg-bg-tertiary rounded-xl border border-white/5 focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-text-secondary text-sm mb-2 block">Иконка</label>
            <div className="flex gap-2 flex-wrap">
              {['🎯', '💰', '📱', '✈️', '🚗', '🏠', '🎮', '🛍️'].map((emoji) => (
                <button
                  key={emoji}
                  className="w-12 h-12 rounded-xl bg-bg-tertiary text-2xl hover:bg-primary/20 hover:border-primary border border-transparent transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <Button className="w-full mt-4" size="lg">
            Создать цель
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
