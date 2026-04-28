import { useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail } from 'lucide-react';
import { api } from '@/lib/api';

function subscribe(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}
function useIsLight() {
  return useSyncExternalStore(subscribe, () => document.documentElement.classList.contains('light'), () => false);
}

export function ForgotPassword() {
  const isLight = useIsLight();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const accent = isLight ? '#E07840' : '#5B9EF0';

  async function handleSubmit() {
    if (!email.trim()) { setError('Введи email'); return; }
    setLoading(true); setError(null);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col overflow-hidden relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-60 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }} />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Back link */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          className="absolute top-6 left-6">
          <Link to="/login" className="flex items-center gap-1.5 text-sm"
            style={{ color: 'var(--text-secondary)' }}>
            <ArrowLeft size={15} /> Назад
          </Link>
        </motion.div>

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
            Сброс пароля
          </h1>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-sm">

          {sent ? (
            /* ── Success state ── */
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                style={{ background: `${accent}20`, border: `1px solid ${accent}40` }}>
                <Mail size={28} style={{ color: accent }} />
              </div>
              <div>
                <p className="text-text-primary font-semibold text-lg">Проверь почту</p>
                <p className="text-text-secondary text-sm mt-2 leading-relaxed">
                  Если аккаунт с адресом <strong className="text-text-primary">{email}</strong> существует,
                  мы отправили ссылку для сброса пароля. Ссылка действительна 1 час.
                </p>
              </div>
              <p className="text-text-secondary text-sm">
                Не пришло?{' '}
                <button onClick={() => setSent(false)}
                  className="font-semibold transition-colors" style={{ color: accent }}>
                  Отправить ещё раз
                </button>
              </p>
              <Link to="/login"
                className="block text-center text-sm font-medium mt-4"
                style={{ color: accent }}>
                Вернуться к входу
              </Link>
            </div>
          ) : (
            /* ── Form ── */
            <div className="space-y-3">
              <p className="text-text-secondary text-sm text-center mb-4">
                Введи email — мы пришлём ссылку для сброса пароля
              </p>

              <div className="rounded-2xl overflow-hidden transition-all duration-300"
                style={{
                  background: isLight ? '#FFFFFF' : '#0E1220',
                  border: `1px solid ${focused ? `${accent}80` : (isLight ? 'rgba(224,120,64,0.2)' : 'rgba(91,158,240,0.15)')}`,
                  borderRadius: '16px',
                  boxShadow: focused ? `0 0 0 3px ${accent}1A` : 'none',
                }}>
                <div className="px-4 pt-3 pb-0.5">
                  <label className="text-[11px] font-semibold uppercase tracking-widest"
                    style={{ color: isLight ? 'rgba(8,9,15,0.35)' : 'rgba(242,237,228,0.35)' }}>
                    Email
                  </label>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="you@example.com"
                  autoFocus
                  className="w-full bg-transparent px-4 pb-3.5 pt-1 text-base text-text-primary placeholder:text-text-muted outline-none"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              {error && <p className="text-sm text-red-400 text-center">{error}</p>}

              <motion.button
                onClick={handleSubmit}
                disabled={loading}
                whileTap={{ scale: 0.97 }}
                className="w-full text-white font-bold text-base py-4 mt-1 disabled:opacity-50 transition-opacity"
                style={{ background: accent, borderRadius: '20px', boxShadow: `0 8px 28px ${accent}59` }}>
                {loading ? 'Отправляем...' : 'Отправить ссылку'}
              </motion.button>

              <p className="text-center text-text-secondary text-sm mt-2">
                Вспомнил пароль?{' '}
                <Link to="/login" className="font-semibold transition-colors" style={{ color: accent }}>
                  Войти
                </Link>
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
