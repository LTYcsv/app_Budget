import { Outlet, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, BarChart3, PiggyBank, PlusCircle, User, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Главная' },
  { path: '/analytics', icon: BarChart3, label: 'Аналитика' },
  { path: '/add', icon: PlusCircle, label: 'Добавить', isCenter: true },
  { path: '/goals', icon: PiggyBank, label: 'Копилки' },
  { path: '/profile', icon: User, label: 'Профиль' },
];


export function MainLayout() {
  const location = useLocation();
  const currentPath = location.pathname;
  const currentMonth = new Date().toLocaleDateString('ru-RU', { month: 'long' });

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">

      {/* ─── Header ────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">

          {/* Логотип + месяц */}
          <div className="flex items-center gap-2.5">
            <span
              className="font-black text-xl tracking-tight text-text-primary"
              style={{ fontFamily: "'Unbounded', sans-serif", letterSpacing: '-0.03em' }}
            >
              Чек<span className="text-[#5B9EF0]">.</span>
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-secondary border border-white/[0.07] text-xs font-semibold text-text-primary/50">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5B9EF0] flex-shrink-0" />
              {currentMonth}
            </div>
          </div>

          {/* Кубок */}
          <Link
            to="/achievements"
            className="w-10 h-10 rounded-xl bg-bg-secondary flex items-center justify-center hover:bg-bg-tertiary transition-colors"
          >
            <Trophy size={18} className="text-warning" />
          </Link>
        </div>
      </header>

      {/* ─── Main ──────────────────────────────────────────────────────────────── */}
      <main className="flex-1 pb-24">
        <motion.div
          key={currentPath}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* ─── Nav ───────────────────────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-secondary/90 backdrop-blur-xl border-t border-white/5 safe-area-pb">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;

            if (item.isCenter) {
              return (
                <Link key={item.path} to={item.path} className="relative -mt-6">
                  <motion.div
                    className="w-14 h-14 rounded-full flex items-center justify-center shadow-glow"
                    style={{ background: '#5B9EF0' }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon size={24} className="text-white" />
                  </motion.div>
                </Link>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors relative',
                  isActive ? 'text-primary-light' : 'text-text-tertiary hover:text-text-secondary'
                )}
              >
                <Icon size={22} />
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && (
                  <motion.div layoutId="activeTab" className="absolute bottom-1 w-1 h-1 rounded-full bg-primary-light" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
