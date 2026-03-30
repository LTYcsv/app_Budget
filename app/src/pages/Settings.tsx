import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Shield, HelpCircle, LogOut, Sun, Moon, X, Eye, EyeOff, ArrowLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1';

// ─── Theme hook ────────────────────────────────────────────────────────────────
function useTheme() {
  const [isLight, setIsLight] = useState<boolean>(() => localStorage.getItem('theme') === 'light');
  useEffect(() => {
    if (isLight) { document.documentElement.classList.add('light'); localStorage.setItem('theme', 'light'); }
    else { document.documentElement.classList.remove('light'); localStorage.setItem('theme', 'dark'); }
  }, [isLight]);
  useEffect(() => { if (localStorage.getItem('theme') === 'light') document.documentElement.classList.add('light'); }, []);
  return { isLight, toggle: () => setIsLight(v => !v) };
}

// ─── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="relative flex-shrink-0">
      <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${on ? 'bg-[#5B9EF0]' : 'bg-white/[0.12]'}`}>
        <motion.div className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
          animate={{ x: on ? 25 : 4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }} />
      </div>
    </button>
  );
}

// ─── Security Modal ────────────────────────────────────────────────────────────
function SecurityModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'email' | 'password'>('email');
  const [newEmail, setNewEmail] = useState('');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  async function handleEmailSave() {
    if (!newEmail.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_email: newEmail.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Ошибка'); }
      toast.success('Email обновлён');
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка'); }
    finally { setLoading(false); }
  }

  async function handlePasswordSave() {
    if (newPwd !== confirmPwd) { toast.error('Пароли не совпадают'); return; }
    if (newPwd.length < 8) { toast.error('Пароль минимум 8 символов'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Ошибка'); }
      toast.success('Пароль обновлён');
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка'); }
    finally { setLoading(false); }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-bg-secondary rounded-3xl border border-white/10 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-text-primary">Безопасность</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center">
            <X size={15} className="text-text-secondary" />
          </button>
        </div>
        <div className="flex gap-2 p-1 bg-bg-primary rounded-xl">
          {(['email', 'password'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t ? 'bg-[#5B9EF0] text-[#08090F]' : 'text-text-primary/50 hover:text-text-primary'}`}>
              {t === 'email' ? 'Email' : 'Пароль'}
            </button>
          ))}
        </div>
        {tab === 'email' ? (
          <div className="space-y-3">
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
              placeholder="Новый email" type="email"
              className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-[#5B9EF0] focus:outline-none text-sm text-text-primary" />
            <button onClick={handleEmailSave} disabled={loading || !newEmail.trim()}
              className="w-full py-3 rounded-xl bg-[#5B9EF0] text-[#08090F] font-semibold text-sm disabled:opacity-50">
              {loading ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
              placeholder="Текущий пароль" type="password"
              className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-[#5B9EF0] focus:outline-none text-sm text-text-primary" />
            <div className="relative">
              <input value={newPwd} onChange={e => setNewPwd(e.target.value)}
                placeholder="Новый пароль" type={showPwd ? 'text' : 'password'}
                className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-[#5B9EF0] focus:outline-none text-sm text-text-primary" />
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-primary/40">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <input value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
              placeholder="Подтвердить пароль" type="password"
              className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-[#5B9EF0] focus:outline-none text-sm text-text-primary" />
            <button onClick={handlePasswordSave} disabled={loading || !currentPwd || !newPwd || !confirmPwd}
              className="w-full py-3 rounded-xl bg-[#5B9EF0] text-[#08090F] font-semibold text-sm disabled:opacity-50">
              {loading ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Help Modal ────────────────────────────────────────────────────────────────
function HelpModal({ onClose }: { onClose: () => void }) {
  const steps = [
    { title: '💳 Счета', body: 'Создай счёт в разделе «Счета» — это твой кошелёк, карта или вклад. Укажи начальный баланс.' },
    { title: '➕ Операции', body: 'Нажми кнопку + внизу экрана. Выбери тип (расход/доход), сумму, категорию и счёт.' },
    { title: '📊 Аналитика', body: 'В разделе «Аналитика» смотри сводку доходов и расходов по периодам и категориям.' },
    { title: '🐷 Копилки', body: 'Создай цель накопления с дедлайном. Приложение покажет сколько нужно откладывать в месяц.' },
    { title: '🔥 Streak', body: 'Добавляй операции каждый день — следи за своим streak и получай достижения.' },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-bg-secondary rounded-3xl border border-white/10 p-5 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-text-primary">Как пользоваться Чек</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center">
            <X size={15} className="text-text-secondary" />
          </button>
        </div>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="p-4 bg-bg-primary rounded-2xl border border-white/5">
              <p className="font-semibold text-sm text-text-primary mb-1">{step.title}</p>
              <p className="text-xs text-text-primary/50 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="w-full py-3 rounded-xl bg-[#5B9EF0] text-[#08090F] font-semibold text-sm">
          Понятно
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Coming Soon Modal ─────────────────────────────────────────────────────────
function ComingSoonModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xs bg-bg-secondary rounded-3xl border border-white/10 p-6 text-center space-y-3">
        <p className="text-3xl">🚧</p>
        <p className="font-bold text-text-primary">Скоро</p>
        <p className="text-sm text-text-primary/50">Эта функция в разработке</p>
        <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-bg-tertiary text-text-primary/60 text-sm font-semibold">
          OK
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export function Settings() {
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [modal, setModal] = useState<'security' | 'help' | 'soon' | null>(null);

  const { logout } = useAuth();
  const navigate = useNavigate();
  const { isLight, toggle: toggleTheme } = useTheme();

  function handleLogout() { logout(); navigate('/login', { replace: true }); }

  function handleNotifToggle() {
    if (!notifEnabled) { setModal('soon'); }
    else setNotifEnabled(false);
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-bg-primary flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center px-4 h-14 flex-shrink-0 relative">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-bg-secondary flex items-center justify-center text-text-primary hover:bg-bg-tertiary transition-colors">
            <ArrowLeft size={18} />
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-[18px] font-bold text-text-primary"
            style={{ fontFamily: "'Inter Tight', sans-serif" }}>
            Настройки
          </h1>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-4 pt-2 pb-10 space-y-3">

          {/* Settings card */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-bg-secondary rounded-[24px] overflow-hidden">

            {/* Notifications */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.05]">
              <div className="w-8 h-8 rounded-[10px] bg-[#5B9EF0]/10 flex items-center justify-center flex-shrink-0">
                <Bell size={15} className="text-[#5B9EF0]" />
              </div>
              <span className="flex-1 text-sm font-semibold text-text-primary">Уведомления</span>
              <Toggle on={notifEnabled} onToggle={handleNotifToggle} />
            </div>

            {/* Theme */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.05]">
              <div className="w-8 h-8 rounded-[10px] bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                {isLight ? <Moon size={15} className="text-text-primary/60" /> : <Sun size={15} className="text-text-primary/60" />}
              </div>
              <span className="flex-1 text-sm font-semibold text-text-primary">Светлая тема</span>
              <Toggle on={isLight} onToggle={toggleTheme} />
            </div>

            {/* Security */}
            <button onClick={() => setModal('security')}
              className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors">
              <div className="w-8 h-8 rounded-[10px] bg-success/10 flex items-center justify-center flex-shrink-0">
                <Shield size={15} className="text-success" />
              </div>
              <span className="flex-1 text-left text-sm font-semibold text-text-primary">Безопасность</span>
              <ChevronRight size={16} className="text-text-primary/20" />
            </button>

            {/* Help */}
            <button onClick={() => setModal('help')}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors">
              <div className="w-8 h-8 rounded-[10px] bg-[#E07840]/10 flex items-center justify-center flex-shrink-0">
                <HelpCircle size={15} className="text-[#E07840]" />
              </div>
              <span className="flex-1 text-left text-sm font-semibold text-text-primary">Помощь</span>
              <ChevronRight size={16} className="text-text-primary/20" />
            </button>
          </motion.div>

          {/* Logout card */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 bg-bg-secondary rounded-[24px] hover:bg-error/[0.04] transition-colors"
              style={{ border: '1px solid rgba(248,113,113,0.15)' }}>
              <div className="w-8 h-8 rounded-[10px] bg-error/10 flex items-center justify-center flex-shrink-0">
                <LogOut size={15} className="text-error" />
              </div>
              <span className="flex-1 text-left text-sm font-semibold text-[#F87171]">Выйти из аккаунта</span>
            </button>
          </motion.div>

          {/* Footer */}
          <p className="text-center text-[12px] text-text-primary/25 pt-2">Чек v1.0.0</p>
        </div>
      </div>

      <AnimatePresence>
        {modal === 'security' && <SecurityModal onClose={() => setModal(null)} />}
        {modal === 'help'     && <HelpModal     onClose={() => setModal(null)} />}
        {modal === 'soon'     && <ComingSoonModal onClose={() => setModal(null)} />}
      </AnimatePresence>
    </>
  );
}
