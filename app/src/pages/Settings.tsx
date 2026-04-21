import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Shield, HelpCircle, LogOut, Sun, Moon, X, Eye, EyeOff, ArrowLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1';

function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved !== null) return saved === 'dark';
    return true;
  });
  const isLight = !isDark;
  const toggle = () => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      if (next) document.documentElement.classList.remove('light');
      else document.documentElement.classList.add('light');
      return next;
    });
  };
  return { isLight, toggle };
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: 44, height: 24, borderRadius: 100, transition: 'background 0.2s',
        background: on ? 'var(--nav-accent, #5B9EF0)' : 'rgba(255,255,255,0.12)',
        position: 'relative',
      }}>
        <motion.div style={{
          position: 'absolute', top: 4, width: 16, height: 16,
          borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
          animate={{ x: on ? 24 : 4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }} />
      </div>
    </button>
  );
}

const inputStyle = {
  width: '100%', padding: '12px 16px', borderRadius: 12,
  background: 'var(--surface-2)', border: '1px solid var(--nav-border)',
  outline: 'none', color: 'inherit', fontSize: 14,
};

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
        className="chek-card w-full max-w-sm" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="display" style={{ fontSize: 17 }}>Безопасность</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center">
            <X size={15} className="text-text-secondary" />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--surface-2)', borderRadius: 12, marginBottom: 16 }}>
          {(['email', 'password'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: tab === t ? 'var(--nav-accent, #5B9EF0)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--text-dim)',
              border: 'none', transition: 'background 0.15s, color 0.15s',
            }}>
              {t === 'email' ? 'Email' : 'Пароль'}
            </button>
          ))}
        </div>
        {tab === 'email' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
              placeholder="Новый email" type="email" style={inputStyle} />
            <button onClick={handleEmailSave} disabled={loading || !newEmail.trim()}
              className="tx-submit-btn tx-submit-btn--income" style={{ opacity: loading || !newEmail.trim() ? 0.5 : 1 }}>
              {loading ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
              placeholder="Текущий пароль" type="password" style={inputStyle} />
            <div style={{ position: 'relative' }}>
              <input value={newPwd} onChange={e => setNewPwd(e.target.value)}
                placeholder="Новый пароль" type={showPwd ? 'text' : 'password'} style={inputStyle} />
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setShowPwd(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <input value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
              placeholder="Подтвердить пароль" type="password" style={inputStyle} />
            <button onClick={handlePasswordSave} disabled={loading || !currentPwd || !newPwd || !confirmPwd}
              className="tx-submit-btn tx-submit-btn--income" style={{ opacity: loading || !currentPwd || !newPwd || !confirmPwd ? 0.5 : 1 }}>
              {loading ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>
        )}
        <div className="glow-line" />
      </motion.div>
    </motion.div>
  );
}

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
        className="chek-card w-full max-w-sm" style={{ padding: 20, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="display" style={{ fontSize: 17 }}>Как пользоваться Чек</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center">
            <X size={15} className="text-text-secondary" />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {steps.map((step, i) => (
            <div key={i} className="chek-flat" style={{ padding: 14 }}>
              <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{step.title}</p>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>{step.body}</p>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="tx-submit-btn tx-submit-btn--income" style={{ marginTop: 16 }}>Понятно</button>
        <div className="glow-line" />
      </motion.div>
    </motion.div>
  );
}

function ComingSoonModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={e => e.stopPropagation()}
        className="chek-card w-full max-w-xs" style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 32, marginBottom: 10 }}>🚧</p>
        <p className="display" style={{ fontSize: 18, marginBottom: 6 }}>Скоро</p>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>Эта функция в разработке</p>
        <button onClick={onClose} className="chek-flat" style={{ width: '100%', padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', borderRadius: 14 }}>
          OK
        </button>
        <div className="glow-line" />
      </motion.div>
    </motion.div>
  );
}

const rowStyle = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
  borderBottom: '1px solid var(--nav-border)',
};
const iconWrap = (color: string) => ({
  width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: color, flexShrink: 0,
});

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
        <div className="w-full max-w-lg mx-auto flex items-center px-4 h-14 flex-shrink-0 relative">
          <button onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-bg-secondary flex items-center justify-center hover:bg-bg-tertiary transition-colors">
            <ArrowLeft size={18} />
          </button>
          <h1 className="display absolute left-1/2 -translate-x-1/2" style={{ fontSize: 18 }}>Настройки</h1>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto pt-2 pb-10">
          <div className="max-w-lg mx-auto px-4" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Main card */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="chek-flat" style={{ overflow: 'hidden', padding: 0 }}>

              {/* Notifications */}
              <div style={rowStyle}>
                <div style={iconWrap('rgba(91,158,240,0.12)')}>
                  <Bell size={15} style={{ color: 'var(--nav-accent, #5B9EF0)' }} />
                </div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Уведомления</span>
                <Toggle on={notifEnabled} onToggle={handleNotifToggle} />
              </div>

              {/* Theme */}
              <div style={rowStyle}>
                <div style={iconWrap('rgba(255,255,255,0.06)')}>
                  {isLight
                    ? <Moon size={15} style={{ color: 'var(--text-dim)' }} />
                    : <Sun size={15} style={{ color: 'var(--text-dim)' }} />}
                </div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Светлая тема</span>
                <Toggle on={isLight} onToggle={toggleTheme} />
              </div>

              {/* Security */}
              <button onClick={() => setModal('security')} style={{ ...rowStyle, width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--nav-border)', cursor: 'pointer' }}>
                <div style={iconWrap('rgba(74,222,128,0.12)')}>
                  <Shield size={15} style={{ color: '#4ADE80' }} />
                </div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, textAlign: 'left' }}>Безопасность</span>
                <ChevronRight size={16} style={{ color: 'var(--text-dim)' }} />
              </button>

              {/* Help */}
              <button onClick={() => setModal('help')} style={{ ...rowStyle, width: '100%', background: 'none', border: 'none', borderBottom: 'none', cursor: 'pointer' }}>
                <div style={iconWrap('rgba(224,120,64,0.12)')}>
                  <HelpCircle size={15} style={{ color: 'var(--streak)' }} />
                </div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, textAlign: 'left' }}>Помощь</span>
                <ChevronRight size={16} style={{ color: 'var(--text-dim)' }} />
              </button>
            </motion.div>

            {/* Logout */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
              <button onClick={handleLogout}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                  background: 'var(--nav-surface)', border: '1px solid rgba(248,113,113,0.18)',
                  borderRadius: 20, cursor: 'pointer' }}>
                <div style={iconWrap('rgba(255,68,68,0.12)')}>
                  <LogOut size={15} style={{ color: '#F87171' }} />
                </div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, textAlign: 'left', color: '#F87171' }}>
                  Выйти из аккаунта
                </span>
              </button>
            </motion.div>

            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-dim)', paddingTop: 4 }}>Чек v1.0.0</p>
          </div>
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
