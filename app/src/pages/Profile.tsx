import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Shield, HelpCircle, LogOut,
  ChevronRight, Globe, Share2, Sun, Moon,
  X, Eye, EyeOff,
} from 'lucide-react';
import { StreakIndicator } from '@/components/StreakIndicator';
import { api, type ApiGamification, type ApiAchievement, type AchievementRarity } from '@/lib/api';
import { toast } from 'sonner';
import { useTransactions } from '@/context/TransactionsContext';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { t, type Lang } from '@/lib/i18n';
import { useLang } from '@/context/LangContext';

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

// ─── Rarity colors ─────────────────────────────────────────────────────────────
const rarityColors: Record<AchievementRarity, { bg: string; border: string; shadow: string }> = {
  common:    { bg: 'bg-bg-tertiary',  border: 'border-white/10', shadow: '' },
  rare:      { bg: 'bg-primary/10',   border: 'border-primary/40', shadow: 'shadow-[0_0_12px_rgba(99,102,241,0.15)]' },
  epic:      { bg: 'bg-secondary/10', border: 'border-secondary/40', shadow: 'shadow-[0_0_12px_rgba(236,72,153,0.15)]' },
  legendary: { bg: 'bg-warning/10',   border: 'border-warning/40', shadow: 'shadow-[0_0_12px_rgba(245,158,11,0.2)]' },
};

function MiniAchievementBadge({ ach }: { ach: ApiAchievement }) {
  const c = rarityColors[ach.rarity];
  return (
    <div className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${ach.unlocked ? `${c.bg} ${c.border} ${c.shadow}` : 'bg-bg-tertiary border-white/5 opacity-50'}`}>
      <span className="text-2xl mb-1">{ach.icon}</span>
      <p className="text-[10px] font-semibold text-center leading-tight w-full truncate text-text-primary">{ach.title}</p>
    </div>
  );
}

// ─── Security Modal ────────────────────────────────────────────────────────────
function SecurityModal({ onClose, lang }: { onClose: () => void; lang: Lang }) {
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
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Error'); }
      toast.success(t(lang, 'email_updated'));
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setLoading(false); }
  }

  async function handlePasswordSave() {
    if (newPwd !== confirmPwd) { toast.error(t(lang, 'passwords_mismatch')); return; }
    if (newPwd.length < 8) { toast.error(t(lang, 'password_too_short')); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Error'); }
      toast.success(t(lang, 'password_updated'));
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setLoading(false); }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-bg-secondary rounded-3xl border border-white/10 p-5 space-y-4">

        <div className="flex items-center justify-between">
          <h2 className="font-bold text-text-primary">{t(lang, 'security_title')}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center">
            <X size={15} className="text-text-secondary" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-bg-primary rounded-xl">
          {(['email', 'password'] as const).map(tab_ => (
            <button key={tab_} onClick={() => setTab(tab_)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === tab_ ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'}`}>
              {tab_ === 'email' ? t(lang, 'change_email') : t(lang, 'change_password')}
            </button>
          ))}
        </div>

        {tab === 'email' ? (
          <div className="space-y-3">
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
              placeholder={t(lang, 'new_email')} type="email"
              className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none text-sm text-text-primary" />
            <button onClick={handleEmailSave} disabled={loading || !newEmail.trim()}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-50">
              {loading ? t(lang, 'saving') : t(lang, 'save')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
              placeholder={t(lang, 'current_password')} type="password"
              className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none text-sm text-text-primary" />
            <div className="relative">
              <input value={newPwd} onChange={e => setNewPwd(e.target.value)}
                placeholder={t(lang, 'new_password')} type={showPwd ? 'text' : 'password'}
                className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none text-sm text-text-primary" />
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <input value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
              placeholder={t(lang, 'confirm_password')} type="password"
              className="w-full px-4 py-3 bg-bg-primary rounded-xl border border-white/5 focus:border-primary focus:outline-none text-sm text-text-primary" />
            <button onClick={handlePasswordSave} disabled={loading || !currentPwd || !newPwd || !confirmPwd}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-50">
              {loading ? t(lang, 'saving') : t(lang, 'save')}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Help Modal ────────────────────────────────────────────────────────────────
function HelpModal({ onClose, lang }: { onClose: () => void; lang: Lang }) {
  const steps = [
    { title: t(lang, 'help_1_title'), body: t(lang, 'help_1') },
    { title: t(lang, 'help_2_title'), body: t(lang, 'help_2') },
    { title: t(lang, 'help_3_title'), body: t(lang, 'help_3') },
    { title: t(lang, 'help_4_title'), body: t(lang, 'help_4') },
    { title: t(lang, 'help_5_title'), body: t(lang, 'help_5') },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-bg-secondary rounded-3xl border border-white/10 p-5 space-y-4 max-h-[80vh] overflow-y-auto">

        <div className="flex items-center justify-between">
          <h2 className="font-bold text-text-primary">{t(lang, 'help_title')}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center">
            <X size={15} className="text-text-secondary" />
          </button>
        </div>

        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="p-4 bg-bg-primary rounded-2xl border border-white/5">
              <p className="font-semibold text-sm text-text-primary mb-1">{step.title}</p>
              <p className="text-xs text-text-secondary leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>

        <button onClick={onClose}
          className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm">
          {t(lang, 'help_close')}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Coming Soon Modal ─────────────────────────────────────────────────────────
function ComingSoonModal({ onClose, lang }: { onClose: () => void; lang: Lang }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xs bg-bg-secondary rounded-3xl border border-white/10 p-6 text-center space-y-3">
        <p className="text-3xl">🚧</p>
        <p className="font-bold text-text-primary">{t(lang, 'coming_soon')}</p>
        <p className="text-sm text-text-secondary">{t(lang, 'coming_soon_desc')}</p>
        <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-bg-tertiary text-text-secondary text-sm font-medium">
          OK
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Profile ───────────────────────────────────────────────────────────────────
function formatDate(iso: string, lang: Lang): string {
  const normalized = iso.endsWith('Z') ? iso : iso + 'Z';
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getInitials(email: string | null): string {
  if (!email) return '?';
  return email[0].toUpperCase();
}

export function Profile() {
  const [gamification, setGamification] = useState<ApiGamification | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const { transactions } = useTransactions();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { isLight, toggle: toggleTheme } = useTheme();
  const { lang, toggleLang } = useLang();

  const [modal, setModal] = useState<'security' | 'help' | 'soon' | null>(null);

  useEffect(() => {
    api.getGamification().then(setGamification).catch((err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error');
    });
    api.getMe().then((user) => {
      setUserEmail(user.email);
      setMemberSince(formatDate(user.created_at, lang));
    }).catch(() => {});
  }, [lang]);

  function handleLogout() { logout(); navigate('/login', { replace: true }); }

  const streakCurrent = gamification?.streak_current ?? 0;
  const streakBest    = gamification?.streak_best ?? 0;
  const achievements  = gamification?.achievements ?? [];
  const unlockedCount = gamification?.achievements_unlocked ?? 0;
  const totalCount    = gamification?.achievements_total ?? 0;
  const txCount       = transactions.length;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6"
        style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)', boxShadow: '0 16px 48px rgba(99,102,241,0.35)' }}>
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-20 bg-white" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10 bg-white" />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.3)' }}>
            <span className="text-white font-black text-2xl">{getInitials(userEmail)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-lg truncate">{userEmail ?? '...'}</h1>
            <p className="text-white/60 text-sm mt-0.5">{memberSince ? `${t(lang, 'profile_since')} ${memberSince}` : '—'}</p>
          </div>
        </div>
        <div className="relative flex gap-3 mt-5">
          {[
            { value: txCount,       label: t(lang, 'ops_count') },
            { value: unlockedCount, label: t(lang, 'achievements_count') },
            { value: streakCurrent, label: t(lang, 'streak_days') },
          ].map(stat => (
            <div key={stat.label} className="flex-1 rounded-2xl px-4 py-3 text-center"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
              <p className="text-white font-bold text-xl">{stat.value}</p>
              <p className="text-white/60 text-xs">{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Streak */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex items-center justify-between bg-bg-secondary rounded-2xl p-4 border border-white/5">
        <div>
          <p className="text-text-muted text-xs font-medium mb-1">{t(lang, 'current_streak')}</p>
          <StreakIndicator days={streakCurrent} size="lg" />
        </div>
        <div className="text-right">
          <p className="text-text-muted text-xs">{t(lang, 'best_result')}</p>
          <p className="font-bold tabular-nums mt-0.5 text-warning">{streakBest} {t(lang, 'days')} 🔥</p>
        </div>
      </motion.div>

      {/* Achievements */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-bg-secondary rounded-2xl p-4 border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm text-text-primary">{t(lang, 'achievements')}</h3>
          <Link to="/achievements" className="text-xs font-semibold text-primary-light">{t(lang, 'all')}</Link>
        </div>
        {achievements.filter(a => a.unlocked).length === 0 ? (
          <p className="text-center text-sm py-4 text-text-muted">{t(lang, 'unlocked')} 0 {t(lang, 'of')} {totalCount}</p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2">
              {achievements.filter(a => a.unlocked).slice(0, 4).map(ach => (
                <MiniAchievementBadge key={ach.id} ach={ach} />
              ))}
            </div>
            <p className="text-text-muted text-xs text-center mt-3">{t(lang, 'unlocked')} {unlockedCount} {t(lang, 'of')} {totalCount}</p>
          </>
        )}
      </motion.div>

      {/* Menu */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-bg-secondary rounded-2xl overflow-hidden border border-white/5">

        {/* Уведомления */}
        <button onClick={() => setModal('soon')}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors border-b border-white/5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-warning/10">
            <Bell size={17} className="text-warning" />
          </div>
          <span className="flex-1 text-left text-sm font-semibold text-text-primary">{t(lang, 'notifications')}</span>
          <ChevronRight size={16} className="text-text-muted" />
        </button>

        {/* Безопасность */}
        <button onClick={() => setModal('security')}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors border-b border-white/5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-success/10">
            <Shield size={17} className="text-success" />
          </div>
          <span className="flex-1 text-left text-sm font-semibold text-text-primary">{t(lang, 'security')}</span>
          <ChevronRight size={16} className="text-text-muted" />
        </button>

        {/* Язык */}
        <button onClick={toggleLang}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors border-b border-white/5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-accent/10">
            <Globe size={17} className="text-accent" />
          </div>
          <span className="flex-1 text-left text-sm font-semibold text-text-primary">{t(lang, 'language')}</span>
          <div className="relative w-12 h-6 rounded-full transition-colors duration-300 mr-1"
            style={{ background: lang === 'en' ? '#6366F1' : 'rgba(255,255,255,0.1)' }}>
            <motion.div className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
              animate={{ x: lang === 'en' ? 26 : 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
          </div>
          <span className="text-xs text-text-muted w-14 text-left">{lang === 'ru' ? t(lang, 'lang_ru') : t(lang, 'lang_en')}</span>
        </button>

        {/* Помощь */}
        <button onClick={() => setModal('help')}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors border-b border-white/5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/10">
            <HelpCircle size={17} className="text-primary-light" />
          </div>
          <span className="flex-1 text-left text-sm font-semibold text-text-primary">{t(lang, 'help')}</span>
          <ChevronRight size={16} className="text-text-muted" />
        </button>

        {/* Пригласить друзей */}
        <button onClick={() => setModal('soon')}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors border-b border-white/5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-secondary/10">
            <Share2 size={17} className="text-secondary" />
          </div>
          <span className="flex-1 text-left text-sm font-semibold text-text-primary">{t(lang, 'invite')}</span>
          <ChevronRight size={16} className="text-text-muted" />
        </button>

        {/* Тема */}
        <button onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/10">
            {isLight ? <Moon size={17} className="text-primary" /> : <Sun size={17} className="text-primary" />}
          </div>
          <span className="flex-1 text-left text-sm font-semibold text-text-primary">{t(lang, 'theme')}</span>
          <div className="relative w-12 h-6 rounded-full transition-colors duration-300 mr-1"
            style={{ background: isLight ? '#6366F1' : 'rgba(255,255,255,0.1)' }}>
            <motion.div className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
              animate={{ x: isLight ? 26 : 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
          </div>
          <span className="text-xs text-text-muted w-14 text-left">{isLight ? t(lang, 'theme_light') : t(lang, 'theme_dark')}</span>
        </button>
      </motion.div>

      {/* Logout */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-bg-secondary rounded-2xl overflow-hidden border border-white/5">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-error/5 transition-colors">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-error/10">
            <LogOut size={17} className="text-error" />
          </div>
          <span className="flex-1 text-left text-sm font-semibold text-error">{t(lang, 'logout')}</span>
          <ChevronRight size={16} className="text-error opacity-50" />
        </button>
      </motion.div>

      <p className="text-center text-xs pb-2 text-text-muted">{t(lang, 'version')}</p>

      {/* Modals */}
      <AnimatePresence>
        {modal === 'security' && <SecurityModal onClose={() => setModal(null)} lang={lang} />}
        {modal === 'help'     && <HelpModal     onClose={() => setModal(null)} lang={lang} />}
        {modal === 'soon'     && <ComingSoonModal onClose={() => setModal(null)} lang={lang} />}
      </AnimatePresence>
    </div>
  );
}
