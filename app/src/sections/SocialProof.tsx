import { motion } from 'framer-motion';
import { Star, Users, Quote } from 'lucide-react';
import { FadeInView } from '@/components/FadeInView';
import { AnimatedCounter } from '@/components/AnimatedCounter';

const stats = [
  { value: 50000, label: 'Пользователей', suffix: '+' },
  { value: 2, label: 'Миллиона', suffix: 'M+', prefix: '₽', formatter: () => '2' },
  { value: 98, label: 'Довольных', suffix: '%' },
];

const reviews = [
  {
    name: 'Артём',
    age: 19,
    avatar: '👨',
    text: 'Наконец-то понял куда уходят деньги! За 3 месяца накопил на новые наушники 🎧',
    rating: 5,
  },
  {
    name: 'Катя',
    age: 22,
    avatar: '👩',
    text: 'Streaks реально мотивируют. 60 дней подряд проверяю бюджет! 🔥',
    rating: 5,
  },
  {
    name: 'Макс',
    age: 17,
    avatar: '👦',
    text: 'Копилки — это genius. Визуально вижу как приближаюсь к цели 💰',
    rating: 5,
  },
  {
    name: 'Аня',
    age: 20,
    avatar: '👱‍♀️',
    text: 'Раньше боялась смотреть на баланс, теперь это моя ежедневная радость!',
    rating: 5,
  },
  {
    name: 'Дима',
    age: 24,
    avatar: '👨‍💼',
    text: 'Автоматический учёт экономит кучу времени. Все траты сами добавляются.',
    rating: 5,
  },
];

export function SocialProof() {
  return (
    <section className="relative py-24 lg:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <FadeInView>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
              <Users size={16} className="text-primary-light" />
              <span className="text-sm text-primary-light">Сообщество</span>
            </div>
          </FadeInView>

          <FadeInView delay={0.1}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display mb-4">
              Уже <span className="gradient-text">50 000+</span> пользователей
            </h2>
          </FadeInView>

          <FadeInView delay={0.2}>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Присоединяйся к сообществу финансово грамотной молодёжи
            </p>
          </FadeInView>
        </div>

        {/* Stats */}
        <FadeInView delay={0.2}>
          <div className="grid grid-cols-3 gap-4 lg:gap-8 mb-16">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                className="text-center p-4 lg:p-6 rounded-2xl bg-bg-secondary/50 border border-white/5"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-2xl lg:text-4xl font-bold font-mono text-text-primary mb-1">
                  {stat.prefix && <span>{stat.prefix}</span>}
                  <AnimatedCounter
                    value={stat.value}
                    duration={2000}
                    formatter={stat.formatter}
                  />
                  {stat.suffix && <span>{stat.suffix}</span>}
                </div>
                <div className="text-text-secondary text-xs lg:text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </FadeInView>

        {/* Reviews carousel */}
        <FadeInView delay={0.3}>
          <div className="relative">
            {/* Gradient overlays */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-bg-primary to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-bg-primary to-transparent z-10 pointer-events-none" />

            {/* Scrolling reviews */}
            <div className="overflow-hidden">
              <motion.div
                className="flex gap-6"
                animate={{ x: ['0%', '-50%'] }}
                transition={{
                  duration: 30,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              >
                {[...reviews, ...reviews].map((review, i) => (
                  <ReviewCard key={i} review={review} />
                ))}
              </motion.div>
            </div>
          </div>
        </FadeInView>
      </div>
    </section>
  );
}

function ReviewCard({ review }: { review: (typeof reviews)[0] }) {
  return (
    <motion.div
      className="flex-shrink-0 w-80 bg-bg-secondary rounded-2xl border border-white/5 p-6"
      whileHover={{ y: -4, borderColor: 'rgba(99, 102, 241, 0.3)' }}
      transition={{ duration: 0.2 }}
    >
      {/* Quote icon */}
      <Quote size={24} className="text-primary/30 mb-4" />

      {/* Review text */}
      <p className="text-text-primary mb-4 leading-relaxed">{review.text}</p>

      {/* Rating */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: review.rating }).map((_, i) => (
          <Star
            key={i}
            size={14}
            className="text-warning fill-warning"
          />
        ))}
      </div>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center text-xl">
          {review.avatar}
        </div>
        <div>
          <div className="font-semibold text-text-primary">{review.name}</div>
          <div className="text-text-tertiary text-sm">{review.age} лет</div>
        </div>
      </div>
    </motion.div>
  );
}
