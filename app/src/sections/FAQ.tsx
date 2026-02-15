import { FadeInView } from '@/components/FadeInView';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';

const faqs = [
  {
    question: 'Бесплатно ли приложение?',
    answer:
      'Да! Базовый функционал абсолютно бесплатный. Ты можешь отслеживать траты, создавать копилки и видеть аналитику без каких-либо ограничений. Премиум подписка даёт расширенную аналитику, безлимитные копилки и приоритетную поддержку за 199 ₽/месяц.',
  },
  {
    question: 'Безопасно ли подключать банк?',
    answer:
      'Мы используем банковский уровень шифрования TLS 1.3. Данные хранятся на защищённых серверах в России, доступ только у тебя. Мы не храним пароли от банков — используем только read-only доступ через официальные API.',
  },
  {
    question: 'Работает ли без подключения банка?',
    answer:
      'Конечно! Можно добавлять траты вручную за пару секунд. Автоматизация — это удобство, но не обязательность. Многие пользователи предпочитают ручной ввод для большей осознанности.',
  },
  {
    question: 'Можно ли использовать с друзьями?',
    answer:
      'Да! Создавай совместные копилки для общих целей (например, поездка), соревнуйтесь в челленджах кто больше сэкономит, и мотивируйте друг друга. Есть приватный режим, если не хочешь делиться финансами.',
  },
  {
    question: 'Какие банки поддерживаются?',
    answer:
      'Мы поддерживаем все major банки России: Т-Банк (Тинькофф), Сбербанк, Альфа-Банк, ВТБ, Райффайзен и многие другие. Добавляем новые банки по запросу пользователей.',
  },
  {
    question: 'Что если я удалю приложение?',
    answer:
      'Твои данные хранятся в облаке. Если установишь приложение снова и войдёшь в тот же аккаунт — все данные восстановятся. Можно также экспортировать данные в CSV или Excel в любой момент.',
  },
];

export function FAQ() {
  return (
    <section className="relative py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <FadeInView>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 border border-warning/30 mb-6">
              <HelpCircle size={16} className="text-warning" />
              <span className="text-sm text-warning">FAQ</span>
            </div>
          </FadeInView>

          <FadeInView delay={0.1}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display mb-4">
              Вопросы и <span className="gradient-text">ответы</span>
            </h2>
          </FadeInView>

          <FadeInView delay={0.2}>
            <p className="text-lg text-text-secondary">
              Всё, что нужно знать перед началом
            </p>
          </FadeInView>
        </div>

        {/* Accordion */}
        <FadeInView delay={0.3}>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-bg-secondary rounded-2xl border border-white/5 px-6 data-[state=open]:border-primary/30 transition-colors"
              >
                <AccordionTrigger className="text-left text-text-primary font-semibold py-5 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-text-secondary pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeInView>

        {/* Contact CTA */}
        <FadeInView delay={0.4}>
          <div className="mt-10 text-center">
            <p className="text-text-secondary mb-4">
              Остались вопросы? Мы на связи!
            </p>
            <a
              href="#"
              className="inline-flex items-center gap-2 text-primary-light hover:text-primary transition-colors"
            >
              <span>Написать в поддержку</span>
              <span>→</span>
            </a>
          </div>
        </FadeInView>
      </div>
    </section>
  );
}
