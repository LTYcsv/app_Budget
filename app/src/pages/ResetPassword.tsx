import { useState, useSyncExternalStore } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

function subscribe(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}
function useIsLight() {
  return useSyncExternalStore(subscribe, () => document.documentElement.classList.contains('light'), () => false);
}

export function ResetPassword() {
  const isLight = useIsLight();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<'password' | 'confirm' | null>(null);

  const accent = isLight ? '#E07840' : '#5B9EF0';

  async function handleSubmit() {
    if (!password) { setError('Введи новый пароль'); return; }
    if (password.length < 8) { setError('Пароль должен быть не менее 8 символов'); return; }
    if (password !== confirm) { setError('Пароли не совпадают'); return; }
    if (!token) { setError('Ссылка недействительна. Запроси сброс пароля заново.'); return; }

    setLoading(true); setError(null);
    try {
      await api.resetPassword(token, password);
      toast.success('Пароль изменён. Войди с новым паролем.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  const inputBase = (field: 'password' | 'confirm') => ({
    background: isLight ? '#FFFFFF' : '#0E1220',
    border: `1px solid ${focused === field ? `${accent}80` : (isLight ? 'rgba(224,120,64,0.2)' : 'rgba(91,158,240,0.15)')}`,
    borderRadius: '16px',
    boxShadow: focused === field ? `0 0 0 3px ${accent}1A` : 'none',
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-6 text-center gap-4">
        <p className="text-text-primary font-semibold text-lg">Ссылка недействительна</p>
        <p className="text-text-secondary text-sm">Токен отсутствует или уже использован.</p>
        <Link to="/forgot-password" className="font-semibold text-sm" style={{ color: accent }}>
          Запросить новую ссылку
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col overflow-hidden relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-60 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }} />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
            style={{
              background: isLight ? '#E07840' : '#0E1220',
              boxShadow: isLight ? '0 0 20px rgba(224,120,64,0.35)' : '0 8px 32px rgba(91,158,240,0.20)',
              border: `1px solid ${isLight ? 'rgba(224,120,64,0.25)' : 'rgba(91,158,240,0.15)'}`,
            }}>
            <span className="text-3xl font-black" style={{ fontFamily: 'Unbounded, sans-serif', color: isLight ? '#fff' : accent }}>Ч</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary" style={{ fontFamily: 'Unbounded, sans-serif', letterSpacing: '-0.02em' }}>
            Новый пароль
          </h1>
          <p className="text-text-secondary text-sm mt-1">Придумай надёжный пароль</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-sm space-y-3">

          {/* Password */}
          <div className="rounded-2xl overflow-hidden transition-all duration-300" style={inputBase('password')}>
            <div className="px-4 pt-3 pb-0.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: isLight ? 'rgba(8,9,15,0.35)' : 'rgba(242,237,228,0.35)' }}>
                Новый пароль
              </label>
            </div>
            <div className="flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                placeholder="Минимум 8 символов"
                autoFocus
                className="flex-1 bg-transparent px-4 pb-3.5 pt-1 text-base text-text-primary placeholder:text-text-muted outline-none"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              <button type="button" onMouseDown={e => e.preventDefault()}
                onClick={() => setShowPassword(v => !v)}
                className="pr-4 pb-2 text-text-muted hover:text-text-secondary transition-colors">
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Confirm */}
          <div className="rounded-2xl overflow-hidden transition-all duration-300" style={inputBase('confirm')}>
            <div className="px-4 pt-3 pb-0.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: isLight ? 'rgba(8,9,15,0.35)' : 'rgba(242,237,228,0.35)' }}>
                Повтори пароль
              </label>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onFocus={() => setFocused('confirm')}
              onBlur={() => setFocused(null)}
              placeholder="••••••••"
              className="w-full bg-transparent px-4 pb-3.5 pt-1 text-base text-text-primary placeholder:text-text-muted outline-none"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <motion.button
            onClick={handleSubmit}
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center justify-center gap-2 text-white font-bold text-base py-4 mt-1 disabled:opacity-50 transition-opacity"
            style={{ background: accent, borderRadius: '20px', boxShadow: `0 8px 28px ${accent}59` }}>
            <span>{loading ? 'Сохраняем...' : 'Сохранить пароль'}</span>
            {!loading && <ArrowRight size={18} />}
          </motion.button>

          <p className="text-center text-text-secondary text-sm mt-2">
            <Link to="/forgot-password" className="font-semibold transition-colors" style={{ color: accent }}>
              Запросить новую ссылку
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
