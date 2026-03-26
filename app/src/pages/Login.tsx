import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  async function handleSubmit() {
    if (!email || !password) {
      toast.error('Заполни все поля');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка входа');
      login(data.access_token);
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка входа');
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
          style={{ background: 'radial-gradient(circle, #5B9EF0 0%, transparent 70%)' }}
        />
      </div>

      {/* ── Контент ───────────────────────────────────────────────────────────── */}
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
              background: '#0E1220',
              boxShadow: '0 8px 32px rgba(91,158,240,0.20), 0 4px 16px rgba(0,0,0,0.3)',
              border: '1px solid rgba(91,158,240,0.15)',
            }}
          >
            <span
              className="text-4xl font-black leading-none"
              style={{ fontFamily: 'Unbounded, sans-serif', letterSpacing: '-0.02em', color: '#5B9EF0' }}
            >
              Ч
            </span>
          </div>

          <h1
            className="text-5xl font-black leading-none mb-2 text-text-primary"
            style={{ fontFamily: 'Unbounded, sans-serif', letterSpacing: '-0.03em' }}
          >
            Чек<span style={{ color: '#5B9EF0' }}>.</span>
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
            className="rounded-2xl overflow-hidden transition-all duration-300"
            style={{
              background: '#0E1220',
              border: `1px solid ${focused === 'email' ? 'rgba(91,158,240,0.5)' : 'rgba(91,158,240,0.15)'}`,
              borderRadius: '16px',
              boxShadow: focused === 'email' ? '0 0 0 3px rgba(91,158,240,0.10)' : 'none',
            }}
          >
            <div className="px-4 pt-3 pb-0.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(242,237,228,0.35)' }}>
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
            className="rounded-2xl overflow-hidden transition-all duration-300"
            style={{
              background: '#0E1220',
              border: `1px solid ${focused === 'password' ? 'rgba(91,158,240,0.5)' : 'rgba(91,158,240,0.15)'}`,
              borderRadius: '16px',
              boxShadow: focused === 'password' ? '0 0 0 3px rgba(91,158,240,0.10)' : 'none',
            }}
          >
            <div className="px-4 pt-3 pb-0.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(242,237,228,0.35)' }}>
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
                placeholder="••••••••"
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

          {/* Кнопка */}
          <motion.button
            onClick={handleSubmit}
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center justify-center gap-2 text-white font-bold text-base py-4 mt-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{
              background: '#5B9EF0',
              borderRadius: '20px',
              boxShadow: loading ? 'none' : '0 8px 28px rgba(91,158,240,0.35)',
            }}
          >
            <span>{loading ? 'Входим...' : 'Войти'}</span>
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
          Нет аккаунта?{' '}
          <Link
            to="/register"
            className="font-semibold transition-colors"
            style={{ color: '#5B9EF0' }}
          >
            Зарегистрироваться
          </Link>
        </motion.p>
      </div>
    </div>
  );
}
