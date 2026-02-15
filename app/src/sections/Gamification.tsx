import { motion } from 'framer-motion';
import {
  Trophy,
  Target,
  TrendingUp,
  PiggyBank,
  Shield,
  Star,
  Zap,
  Gamepad2,
} from 'lucide-react';
import { FadeInView } from '@/components/FadeInView';
import { StreakIndicator } from '@/components/StreakIndicator';
import { AchievementBadge } from '@/components/AchievementBadge';
import { ProgressBar } from '@/components/ProgressBar';

const achievements = [
  {
    icon: Trophy,
    title: 'Первые шаги',
    description: '7 дней streak',
    unlocked: true,
    rarity: 'common' as const,
  },
  {
    icon: PiggyBank,
    title: 'Копилка',
    description: 'Первая цель',
    unlocked: true,
    rarity: 'common' as const,
  },
  {
    icon: Target,
    title: 'Меткий глаз',
    description: 'Экономия 20%',
    unlocked: true,
    rarity: 'rare' as const,
  },
  {
    icon: TrendingUp,
    title: 'Рост',
    description: '+50к баланс',
    unlocked: true,
    rarity: 'rare' as const,
  },
  {
    icon: Shield,
    title: 'Защитник',
    description: '30 дней streak',
    unlocked: false,
    rarity: 'epic' as const,
  },
  {
    icon: Star,
    title: 'Легенда',
    description: '100 дней streak',
    unlocked: false,
    rarity: 'legendary' as const,
  },
];

const challenges = [
  { name: 'Экономь 20% в месяц', progress: 75, reward: '₽500' },
  { name: '30 дней без импульсивных покупок', progress: 45, reward: '⭐' },
  { name: 'Накопи на цель', progress: 60, reward: '🏆' },
];

export function Gamification() {
  return (
    <section className="relative py-24 lg:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <FadeInView>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/30 mb-6">
              <Gamepad2 size={16} className="text-secondary" />
              <span className="text-sm text-secondary">Геймификация</span>
            </div>
          </FadeInView>

          <FadeInView delay={0.1}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display mb-4">
              Преврати финансы в <span className="gradient-text">игру</span>
            </h2>
          </FadeInView>

          <FadeInView delay={0.2}>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Зарабатывай достижения, поддерживай streaks, соревнуйся с друзьями
            </p>
          </FadeInView>
        </div>

        {/* Content grid */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left column - Stats & Streaks */}
          <div className="space-y-8">
            {/* Streak card */}
            <FadeInView delay={0.1}>
              <div className="bg-bg-secondary rounded-3xl border border-white/5 p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-text-primary mb-1">
                      Твой streak
                    </h3>
                    <p className="text-text-secondary text-sm">
                      Проверяй бюджет каждый день
                    </p>
                  </div>
                  <StreakIndicator days={45} size="lg" />
                </div>

                {/* Calendar visualization */}
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 28 }).map((_, i) => {
                    const isActive = i < 24;
                    return (
                      <motion.div
                        key={i}
                        className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium ${
                          isActive
                            ? 'bg-warning/20 text-warning border border-warning/30'
                            : 'bg-bg-tertiary text-text-muted'
                        }`}
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.02 }}
                      >
                        {isActive ? '🔥' : i + 1}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </FadeInView>

            {/* Level progress */}
            <FadeInView delay={0.2}>
              <div className="bg-bg-secondary rounded-3xl border border-white/5 p-6 lg:p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <Zap size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-text-primary">
                        Уровень 12
                      </h3>
                      <p className="text-text-secondary text-sm">
                        Финансовый ниндзя
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-primary-light">
                    2,450 XP
                  </span>
                </div>
                <ProgressBar
                  value={75}
                  max={100}
                  color="gradient"
                  showValue={false}
                  label="До следующего уровня"
                />
              </div>
            </FadeInView>

            {/* Challenges */}
            <FadeInView delay={0.3}>
              <div className="bg-bg-secondary rounded-3xl border border-white/5 p-6 lg:p-8">
                <h3 className="text-lg font-bold text-text-primary mb-4">
                  Активные челленджи
                </h3>
                <div className="space-y-4">
                  {challenges.map((challenge, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-bg-tertiary/50 hover:bg-bg-tertiary transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-text-primary text-sm font-medium">
                          {challenge.name}
                        </span>
                        <span className="text-accent text-sm">{challenge.reward}</span>
                      </div>
                      <ProgressBar
                        value={challenge.progress}
                        color="accent"
                        size="sm"
                        showValue
                      />
                    </div>
                  ))}
                </div>
              </div>
            </FadeInView>
          </div>

          {/* Right column - Achievements */}
          <div>
            <FadeInView delay={0.2}>
              <div className="bg-bg-secondary rounded-3xl border border-white/5 p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-text-primary">
                    Достижения
                  </h3>
                  <span className="text-text-secondary text-sm">
                    4 из 6 разблокировано
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {achievements.map((achievement, i) => (
                    <motion.div
                      key={achievement.title}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <AchievementBadge {...achievement} />
                    </motion.div>
                  ))}
                </div>
              </div>
            </FadeInView>

            {/* Leaderboard teaser */}
            <FadeInView delay={0.4}>
              <div className="mt-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl border border-primary/20 p-6 lg:p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-text-primary">
                    🏆 Соревнуйся с друзьями
                  </h3>
                </div>
                <p className="text-text-secondary mb-4">
                  Пригласи друзей и соревнуйтесь кто больше сэкономит этот месяц!
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {['👤', '👤', '👤'].map((emoji, i) => (
                      <div
                        key={i}
                        className="w-10 h-10 rounded-full bg-bg-tertiary border-2 border-bg-secondary flex items-center justify-center text-lg"
                      >
                        {emoji}
                      </div>
                    ))}
                  </div>
                  <span className="text-text-secondary text-sm">
                    +1,234 уже в игре
                  </span>
                </div>
              </div>
            </FadeInView>
          </div>
        </div>
      </div>
    </section>
  );
}
