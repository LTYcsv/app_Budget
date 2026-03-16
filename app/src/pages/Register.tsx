import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1';

export function Register() {
  const { login } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password || !password2) {
      toast.error(t(lang, 'fill_all'));
      return;
    }
    if (password !== password2) {
      toast.error(t(lang, 'passwords_mismatch'));
      return;
    }
    if (password.length < 6) {
      toast.error(t(lang, 'password_min6'));
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
      if (!res.ok) throw new Error(data.detail || t(lang, 'register_error'));
      login(data.access_token);
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t(lang, 'register_error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">{t(lang, "register_title")}</h1>
          <p className="text-text-secondary">{t(lang, "register_subtitle")}</p>
        </div>

        <div className="bg-bg-secondary rounded-3xl p-6 border border-white/5 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-text-secondary">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-bg-tertiary rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-text-secondary">{t(lang, "register_password")}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t(lang, "register_min")}
              className="w-full bg-bg-tertiary rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-text-secondary">{t(lang, "register_password2")}</label>
            <input
              type="password"
              value={password2}
              onChange={e => setPassword2(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-bg-tertiary rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-2xl transition-colors"
          >
            {loading ? t(lang, "register_loading") : t(lang, "register_btn")}
          </button>
        </div>

        <p className="text-center text-text-secondary text-sm">
          {t(lang, "register_has_account")}{' '}
          <Link to="/login" className="text-primary-light hover:text-primary transition-colors">
            Войти
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
