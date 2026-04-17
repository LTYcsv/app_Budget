import { useState, useSyncExternalStore } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';

function subscribe(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}
function getIsLight() { return document.documentElement.classList.contains('light'); }
function useIsLight() { return useSyncExternalStore(subscribe, getIsLight, () => false); }

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1';

export function Register() {
  const isLight = useIsLight();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | 'password2' | null>(null);

  async function handleSubmit() {
    if (!email || !password || !password2) {
      toast.error('Заполни все поля');
      return;
    }
    if (password !== password2) {
      toast.error('Пароли не совпадают');
      return;
    }
    if (password.length < 8) {
      toast.error('Пароль минимум 8 символов');
      return;
    }
    if (password.length > 128) {
      toast.error('Пароль не должен превышать 128 символов');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка регистрации');
      login(data.access_token);
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col overflow-hidden relative">

      {/* ── Subtle glow ───────────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-60 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${isLight ? '#E07840' : '#5B9EF0'} 0%, transparent 70%)` }}
        />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Логотип */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 flex flex-col items-center"
        >
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
            style={{
              background: isLight ? '#E07840' : '#0E1220',
              boxShadow: isLight
                ? '0 0 20px rgba(224,120,64,0.35)'
                : '0 8px 32px rgba(91,158,240,0.20), 0 4px 16px rgba(0,0,0,0.3)',
              border: `1px solid ${isLight ? 'rgba(224,120,64,0.25)' : 'rgba(91,158,240,0.15)'}`,
            }}
          >
            <span
              className="text-4xl font-black leading-none"
              style={{ fontFamily: 'Unbounded, sans-serif', letterSpacing: '-0.02em', color: isLight ? '#ffffff' : '#5B9EF0' }}
            >
              Ч
            </span>
          </div>

          <h1
            className="text-5xl font-black leading-none mb-2 text-text-primary"
            style={{ fontFamily: 'Unbounded, sans-serif', letterSpacing: '-0.03em' }}
          >
            Чек<span style={{ color: isLight ? '#E07840' : '#5B9EF0' }}>.</span>
          </h1>
          <p className="text-text-secondary text-sm tracking-wide">умный учёт финансов</p>
        </motion.div>

        {/* Форма */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm space-y-3"
        >
          {/* Email */}
          <div
            className="overflow-hidden transition-all duration-300"
            style={{
              background: isLight ? '#FFFFFF' : '#0E1220',
              border: `1px solid ${focused === 'email'
                ? (isLight ? 'rgba(224,120,64,0.5)' : 'rgba(91,158,240,0.5)')
                : (isLight ? 'rgba(224,120,64,0.2)' : 'rgba(91,158,240,0.15)')}`,
              borderRadius: '16px',
              boxShadow: focused === 'email'
                ? `0 0 0 3px ${isLight ? 'rgba(224,120,64,0.10)' : 'rgba(91,158,240,0.10)'}`
                : 'none',
            }}
          >
            <div className="px-4 pt-3 pb-0.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: isLight ? 'rgba(8,9,15,0.35)' : 'rgba(242,237,228,0.35)' }}>
                Email
              </label>
            </div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              placeholder="you@example.com"
              className="w-full bg-transparent px-4 pb-3.5 pt-1 text-base text-text-primary placeholder:text-text-muted outline-none"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {/* Пароль */}
          <div
            className="overflow-hidden transition-all duration-300"
            style={{
              background: isLight ? '#FFFFFF' : '#0E1220',
              border: `1px solid ${focused === 'password'
                ? (isLight ? 'rgba(224,120,64,0.5)' : 'rgba(91,158,240,0.5)')
                : (isLight ? 'rgba(224,120,64,0.2)' : 'rgba(91,158,240,0.15)')}`,
              borderRadius: '16px',
              boxShadow: focused === 'password'
                ? `0 0 0 3px ${isLight ? 'rgba(224,120,64,0.10)' : 'rgba(91,158,240,0.10)'}`
                : 'none',
            }}
          >
            <div className="px-4 pt-3 pb-0.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: isLight ? 'rgba(8,9,15,0.35)' : 'rgba(242,237,228,0.35)' }}>
                Пароль
              </label>
            </div>
            <div className="flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                placeholder="Минимум 6 символов"
                className="flex-1 bg-transparent px-4 pb-3.5 pt-1 text-base text-text-primary placeholder:text-text-muted outline-none"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => setShowPassword(v => !v)}
                className="pr-4 pb-2 text-text-muted hover:text-text-secondary transition-colors"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Повтори пароль */}
          <div
            className="overflow-hidden transition-all duration-300"
            style={{
              background: isLight ? '#FFFFFF' : '#0E1220',
              border: `1px solid ${focused === 'password2'
                ? (isLight ? 'rgba(224,120,64,0.5)' : 'rgba(91,158,240,0.5)')
                : (isLight ? 'rgba(224,120,64,0.2)' : 'rgba(91,158,240,0.15)')}`,
              borderRadius: '16px',
              boxShadow: focused === 'password2'
                ? `0 0 0 3px ${isLight ? 'rgba(224,120,64,0.10)' : 'rgba(91,158,240,0.10)'}`
                : 'none',
            }}
          >
            <div className="px-4 pt-3 pb-0.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: isLight ? 'rgba(8,9,15,0.35)' : 'rgba(242,237,228,0.35)' }}>
                Повтори пароль
              </label>
            </div>
            <div className="flex items-center">
              <input
                type={showPassword2 ? 'text' : 'password'}
                value={password2}
                onChange={e => setPassword2(e.target.value)}
                onFocus={() => setFocused('password2')}
                onBlur={() => setFocused(null)}
                placeholder="••••••••"
                className="flex-1 bg-transparent px-4 pb-3.5 pt-1 text-base text-text-primary placeholder:text-text-muted outline-none"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => setShowPassword2(v => !v)}
                className="pr-4 pb-2 text-text-muted hover:text-text-secondary transition-colors"
              >
                {showPassword2 ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Кнопка */}
          <motion.button
            onClick={handleSubmit}
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center justify-center gap-2 text-white font-bold text-base py-4 mt-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{
              background: isLight ? '#E07840' : '#5B9EF0',
              borderRadius: '20px',
              boxShadow: loading ? 'none' : `0 8px 28px ${isLight ? 'rgba(224,120,64,0.35)' : 'rgba(91,158,240,0.35)'}`,
            }}
          >
            <span>{loading ? 'Создаём...' : 'Зарегистрироваться'}</span>
            {!loading && <ArrowRight size={18} />}
          </motion.button>
        </motion.div>

        {/* Ссылка */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-text-secondary text-sm"
        >
          Уже есть аккаунт?{' '}
          <Link
            to="/login"
            className="font-semibold transition-colors"
            style={{ color: isLight ? '#E07840' : '#5B9EF0' }}
          >
            Войти
          </Link>
        </motion.p>
      </div>
    </div>
  );
}
