import { Outlet, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, BarChart3, PiggyBank, PlusCircle, User, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';

const navItems = [
  { path: '/', icon: Home, label: '' },
  { path: '/analytics', icon: BarChart3, label: '' },
  { path: '/add', icon: PlusCircle, label: '', isCenter: true },
  { path: '/goals', icon: PiggyBank, label: '' },
  { path: '/profile', icon: User, label: '' },
];

export function MainLayout() {
  const location = useLocation();
  const { lang } = useLang();
  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      <header className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          {/* Логотип Чек */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-sm" style={{ fontFamily: "'Unbounded', 'Nunito', sans-serif" }}>Ч</span>
            </div>
            <span
              className="font-black text-xl tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent"
              style={{ fontFamily: "'Unbounded', 'Nunito', sans-serif", letterSpacing: '-0.03em' }}
            >
              Чек
            </span>
          </div>

          {/* Только кубок достижений */}
          <div className="flex items-center gap-2">
            <Link
              to="/achievements"
              className="w-10 h-10 rounded-xl bg-bg-secondary flex items-center justify-center hover:bg-bg-tertiary transition-colors"
            >
              <Trophy size={18} className="text-warning" />
            </Link>
          </div>
        </div>
      </header>

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

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-secondary/90 backdrop-blur-xl border-t border-white/5 safe-area-pb">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;

            if (item.isCenter) {
              return (
                <Link key={item.path} to={item.path} className="relative -mt-6">
                  <motion.div
                    className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center shadow-glow"
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
                  'flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors',
                  isActive ? 'text-primary-light' : 'text-text-tertiary hover:text-text-secondary'
                )}
              >
                <Icon size={22} />
                <span className="text-[10px] font-medium">{item.path === '/' ? t(lang,'nav_home') : item.path === '/analytics' ? t(lang,'nav_analytics') : item.path === '/goals' ? t(lang,'nav_goals') : item.path === '/profile' ? t(lang,'nav_profile') : ''}</span>
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
