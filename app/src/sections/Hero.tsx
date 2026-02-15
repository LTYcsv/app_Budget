import { motion } from 'framer-motion';
import { ArrowRight, Play, TrendingUp, Wallet, CreditCard } from 'lucide-react';
import { Button } from '@/components/Button';
import { FadeInView } from '@/components/FadeInView';
import { Blob } from '@/components/Blob';
import { AnimatedCounter } from '@/components/AnimatedCounter';

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8">
      {/* Background blobs */}
      <Blob color="primary" size="xl" className="top-20 -left-32" delay={0} />
      <Blob color="secondary" size="lg" className="top-40 right-0" delay={5} />
      <Blob color="accent" size="md" className="bottom-20 left-1/4" delay={10} />

      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column - Content */}
          <div className="text-center lg:text-left">
            <FadeInView delay={0}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm text-primary-light">
                  Уже 50 000+ пользователей
                </span>
              </div>
            </FadeInView>

            <FadeInView delay={0.1}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display leading-tight mb-6">
                Финансы — это{' '}
                <span className="gradient-text">просто</span>
              </h1>
            </FadeInView>

            <FadeInView delay={0.2}>
              <p className="text-lg sm:text-xl text-text-secondary mb-8 max-w-xl mx-auto lg:mx-0">
                Управляй деньгами как про. Отслеживай траты, копи на мечты, 
                развивай финансовые привычки с удовольствием.
              </p>
            </FadeInView>

            <FadeInView delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" icon={<ArrowRight size={20} />}>
                  Начать бесплатно
                </Button>
                <Button variant="secondary" size="lg" icon={<Play size={20} />}>
                  Смотреть демо
                </Button>
              </div>
            </FadeInView>

            <FadeInView delay={0.4}>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 mt-10">
                <div className="flex items-center gap-2 text-text-secondary">
                  <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                    <TrendingUp size={16} className="text-success" />
                  </div>
                  <span className="text-sm">Автоматический учёт</span>
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Wallet size={16} className="text-primary-light" />
                  </div>
                  <span className="text-sm">Умные копилки</span>
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                    <CreditCard size={16} className="text-accent" />
                  </div>
                  <span className="text-sm">Все банки в одном месте</span>
                </div>
              </div>
            </FadeInView>
          </div>

          {/* Right column - Demo Widget */}
          <FadeInView delay={0.4} direction="left">
            <DemoWidget />
          </FadeInView>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-text-muted flex justify-center pt-2">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-text-muted"
            animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
}

function DemoWidget() {
  const transactions = [
    { name: 'Супермаркет', amount: -1250, icon: '🛒' },
    { name: 'Кафе', amount: -450, icon: '☕' },
    { name: 'Зарплата', amount: 85000, icon: '💰' },
  ];

  return (
    <motion.div
      className="relative"
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative bg-bg-secondary/80 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-card overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

        {/* Header */}
        <div className="relative mb-6">
          <p className="text-text-secondary text-sm mb-1">Общий баланс</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold font-mono text-text-primary">
              <AnimatedCounter value={84750} prefix="₽" formatter={(v) => v.toLocaleString('ru-RU')} />
            </span>
            <span className="text-success text-sm font-medium flex items-center gap-1">
              <TrendingUp size={14} />
              +12.5%
            </span>
          </div>
        </div>

        {/* Mini chart */}
        <div className="relative h-24 mb-6">
          <svg className="w-full h-full" viewBox="0 0 300 80" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
              </linearGradient>
            </defs>
            <motion.path
              d="M0,60 Q30,55 60,45 T120,35 T180,40 T240,25 T300,20 L300,80 L0,80 Z"
              fill="url(#chartGradient)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
            />
            <motion.path
              d="M0,60 Q30,55 60,45 T120,35 T180,40 T240,25 T300,20"
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: 0.5 }}
            />
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Recent transactions */}
        <div className="relative space-y-3">
          <p className="text-text-tertiary text-xs uppercase tracking-wider font-semibold">
            Последние операции
          </p>
          {transactions.map((tx, i) => (
            <motion.div
              key={i}
              className="flex items-center justify-between p-3 rounded-xl bg-bg-tertiary/50 hover:bg-bg-tertiary transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{tx.icon}</span>
                <span className="text-text-primary text-sm">{tx.name}</span>
              </div>
              <span
                className={`font-mono font-semibold text-sm ${
                  tx.amount > 0 ? 'text-success' : 'text-text-primary'
                }`}
              >
                {tx.amount > 0 ? '+' : ''}
                {tx.amount.toLocaleString('ru-RU')} ₽
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Floating elements */}
      <motion.div
        className="absolute -top-4 -right-4 bg-success/20 backdrop-blur-sm rounded-xl px-3 py-2 border border-success/30"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <span className="text-success text-xs font-semibold">+₽2,500 сэкономлено</span>
      </motion.div>

      <motion.div
        className="absolute -bottom-3 -left-3 bg-accent/20 backdrop-blur-sm rounded-xl px-3 py-2 border border-accent/30"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
      >
        <span className="text-accent text-xs font-semibold">🔥 12 дней streak</span>
      </motion.div>
    </motion.div>
  );
}
