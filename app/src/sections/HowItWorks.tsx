import { motion } from 'framer-motion';
import { Download, Link2, Target, ArrowRight, Check } from 'lucide-react';
import { FadeInView } from '@/components/FadeInView';

const steps = [
  {
    number: '01',
    icon: Download,
    title: 'Скачай и зарегистрируйся',
    description:
      'Быстрый вход через Telegram или Google. Никаких длинных форм — начни за 30 секунд.',
    color: 'from-primary to-primary-light',
  },
  {
    number: '02',
    icon: Link2,
    title: 'Подключи банк',
    description:
      'Автоматическая синхронизация за 10 секунд. Поддерживаем все major банки России.',
    color: 'from-secondary to-secondary-light',
  },
  {
    number: '03',
    icon: Target,
    title: 'Поставь цель',
    description:
      'Создай первую копилку и начни копить. Мы поможем достичь цели быстрее!',
    color: 'from-accent to-accent-light',
  },
];

export function HowItWorks() {
  return (
    <section className="relative py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <FadeInView>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/30 mb-6">
              <Check size={16} className="text-success" />
              <span className="text-sm text-success">Быстрый старт</span>
            </div>
          </FadeInView>

          <FadeInView delay={0.1}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display mb-4">
              Начни за <span className="gradient-text">3 минуты</span>
            </h2>
          </FadeInView>

          <FadeInView delay={0.2}>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Три простых шага к финансовой свободе
            </p>
          </FadeInView>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection line - desktop only */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5">
            <div className="max-w-4xl mx-auto relative">
              <div className="absolute inset-0 bg-bg-tertiary" />
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, delay: 0.5 }}
                style={{ transformOrigin: 'left' }}
              />
            </div>
          </div>

          {/* Steps grid */}
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <StepCard key={step.number} step={step} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StepCard({
  step,
  index,
}: {
  step: (typeof steps)[0];
  index: number;
}) {
  const { icon: Icon, number, title, description, color } = step;

  return (
    <FadeInView delay={0.1 + index * 0.2}>
      <div className="relative text-center">
        {/* Step number circle */}
        <motion.div
          className="relative z-10 mx-auto mb-6"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
            delay: 0.2 + index * 0.2,
          }}
        >
          <div
            className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${color} p-0.5`}
          >
            <div className="w-full h-full rounded-2xl bg-bg-secondary flex items-center justify-center">
              <Icon size={28} className="text-white" />
            </div>
          </div>
          {/* Number badge */}
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-bg-tertiary border border-white/10 flex items-center justify-center">
            <span className="text-xs font-bold text-text-secondary">{number}</span>
          </div>
        </motion.div>

        {/* Content */}
        <h3 className="text-xl font-bold text-text-primary mb-3">{title}</h3>
        <p className="text-text-secondary leading-relaxed max-w-sm mx-auto">
          {description}
        </p>

        {/* Arrow - not on last item */}
        {index < steps.length - 1 && (
          <div className="hidden md:block absolute top-8 left-full -translate-x-1/2 z-20">
            <motion.div
              animate={{ x: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight size={24} className="text-text-muted" />
            </motion.div>
          </div>
        )}
      </div>
    </FadeInView>
  );
}
