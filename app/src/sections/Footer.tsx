import { motion } from 'framer-motion';
import { ArrowRight, Send, Youtube } from 'lucide-react';
import { FadeInView } from '@/components/FadeInView';

const footerLinks = {
  product: [
    { label: 'Функции', href: '#features' },
    { label: 'Цены', href: '#' },
    { label: 'Безопасность', href: '#' },
    { label: 'Roadmap', href: '#' },
  ],
  company: [
    { label: 'О нас', href: '#' },
    { label: 'Блог', href: '#' },
    { label: 'Карьера', href: '#' },
    { label: 'Контакты', href: '#' },
  ],
  support: [
    { label: 'Помощь', href: '#' },
    { label: 'API', href: '#' },
    { label: 'Статус', href: '#' },
  ],
  legal: [
    { label: 'Политика', href: '#' },
    { label: 'Условия', href: '#' },
    { label: 'Cookies', href: '#' },
  ],
};

const socialLinks = [
  { icon: Send, label: 'Telegram', href: '#' },
  { icon: Youtube, label: 'YouTube', href: '#' },
];

export function Footer() {
  return (
    <footer className="relative">
      {/* CTA Section */}
      <section className="relative py-24 lg:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-secondary" />
        
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <FadeInView>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display text-white mb-6">
              Готов к финансовой свободе?
            </h2>
          </FadeInView>

          <FadeInView delay={0.1}>
            <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto">
              Присоединяйся к 50 000+ пользователей уже сегодня. 
              Начни свой путь к финансовой грамотности.
            </p>
          </FadeInView>

          <FadeInView delay={0.2}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary font-bold rounded-2xl shadow-lg"
                whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}
                whileTap={{ scale: 0.98 }}
              >
                Скачать бесплатно
                <ArrowRight size={20} />
              </motion.button>
            </div>
          </FadeInView>

          <FadeInView delay={0.3}>
            <div className="flex items-center justify-center gap-4 mt-8">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl">
                <span className="text-2xl">🍎</span>
                <div className="text-left">
                  <div className="text-xs text-white/60">Download on the</div>
                  <div className="text-sm font-semibold text-white">App Store</div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl">
                <span className="text-2xl">🤖</span>
                <div className="text-left">
                  <div className="text-xs text-white/60">Get it on</div>
                  <div className="text-sm font-semibold text-white">Google Play</div>
                </div>
              </div>
            </div>
          </FadeInView>
        </div>
      </section>

      {/* Footer links */}
      <div className="bg-bg-secondary border-t border-white/5 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <span className="text-white font-bold text-lg">F</span>
                </div>
                <span className="text-xl font-bold text-text-primary">FinFlow</span>
              </div>
              <p className="text-text-secondary text-sm mb-4">
                Умное управление личными финансами для молодого поколения.
              </p>
              {/* Social links */}
              <div className="flex gap-3">
                {socialLinks.map((social) => (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center text-text-secondary hover:text-primary-light hover:bg-primary/10 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={social.label}
                  >
                    <social.icon size={18} />
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-text-primary mb-4">Продукт</h4>
              <ul className="space-y-3">
                {footerLinks.product.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-text-secondary hover:text-text-primary transition-colors text-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-text-primary mb-4">Компания</h4>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-text-secondary hover:text-text-primary transition-colors text-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-text-primary mb-4">Поддержка</h4>
              <ul className="space-y-3">
                {footerLinks.support.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-text-secondary hover:text-text-primary transition-colors text-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-text-primary mb-4">Правовое</h4>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-text-secondary hover:text-text-primary transition-colors text-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-text-tertiary text-sm">
              © 2025 FinFlow. Все права защищены.
            </p>
            <p className="text-text-tertiary text-sm">
              Сделано с 💜 в России
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
