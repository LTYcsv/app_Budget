import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, BarChart3, PiggyBank, Plus, User, Trophy, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Главная' },
  { path: '/analytics', icon: BarChart3, label: 'Аналитика' },
  { path: '/add', icon: Plus, label: 'Добавить', isCenter: true },
  { path: '/goals', icon: PiggyBank, label: 'Копилки' },
  { path: '/profile', icon: User, label: 'Профиль' },
];


export function MainLayout() {
  const location = useLocation();
  const currentPath = location.pathname;
  const navigate = useNavigate();
  const currentMonth = new Date().toLocaleDateString('ru-RU', { month: 'long' });

  return (
    <div className="relative min-h-screen bg-bg-primary text-text-primary flex flex-col">

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

          {/* Кубок + Настройки */}
          <div className="flex items-center gap-2">
            <Link
              to="/achievements"
              className="w-10 h-10 rounded-xl bg-bg-secondary flex items-center justify-center hover:bg-bg-tertiary transition-colors"
            >
              <Trophy size={18} className="text-warning" />
            </Link>
            <button
              onClick={() => navigate('/settings')}
              className="w-10 h-10 rounded-xl bg-bg-secondary flex items-center justify-center hover:bg-bg-tertiary transition-colors"
            >
              <SettingsIcon size={18} className="text-text-secondary" />
            </button>
          </div>
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
      <nav className="bottom-nav">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <Link key={item.path} to={item.path} className="nav-fab">
                <Icon size={24} />
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn('nav-item', isActive && 'nav-item--active')}
            >
              <Icon size={22} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
