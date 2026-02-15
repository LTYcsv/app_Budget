import { motion } from 'framer-motion';
import { Zap, Target, BarChart3, Sparkles } from 'lucide-react';
import { FadeInView } from '@/components/FadeInView';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

const features: Feature[] = [
  {
    icon: Zap,
    title: 'Автоматический учёт',
    description:
      'Подключи банки и следи за тратами автоматически. SMS и уведомления сами превращаются в записи.',
    color: 'text-primary-light',
    bgColor: 'bg-primary/20',
  },
  {
    icon: Target,
    title: 'Копилки для целей',
    description:
      'Создавай копилки для мечт. Новый айфон, путешествие или авто — достигай целей шаг за шагом.',
    color: 'text-secondary',
    bgColor: 'bg-secondary/20',
  },
  {
    icon: BarChart3,
    title: 'Умная аналитика',
    description:
      'Понимай куда уходят деньги. Красивые графики и инсайты, которые помогают экономить.',
    color: 'text-accent',
    bgColor: 'bg-accent/20',
  },
];

export function Features() {
  return (
    <section className="relative py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <FadeInView>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30 mb-6">
              <Sparkles size={16} className="text-accent" />
              <span className="text-sm text-accent">Всё включено</span>
            </div>
          </FadeInView>

          <FadeInView delay={0.1}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display mb-4">
              Всё для <span className="gradient-text">твоих денег</span>
            </h2>
          </FadeInView>

          <FadeInView delay={0.2}>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Три суперсилы, которые сделают тебя финансовым гуру
            </p>
          </FadeInView>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const { icon: Icon, title, description, color, bgColor } = feature;

  return (
    <FadeInView delay={0.1 + index * 0.15}>
      <motion.div
        className="relative group h-full"
        whileHover={{ y: -8 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative h-full bg-bg-secondary rounded-3xl border border-white/5 p-6 lg:p-8 overflow-hidden transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-card">
          {/* Gradient background on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Content */}
          <div className="relative">
            {/* Icon */}
            <motion.div
              className={`w-14 h-14 rounded-2xl ${bgColor} flex items-center justify-center mb-6`}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: index * 0.5 }}
            >
              <Icon size={28} className={color} />
            </motion.div>

            {/* Title */}
            <h3 className="text-xl font-bold text-text-primary mb-3">{title}</h3>

            {/* Description */}
            <p className="text-text-secondary leading-relaxed">{description}</p>

            {/* Learn more link */}
            <div className="mt-6 flex items-center gap-2 text-primary-light opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="text-sm font-medium">Подробнее</span>
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.span>
            </div>
          </div>
        </div>
      </motion.div>
    </FadeInView>
  );
}
