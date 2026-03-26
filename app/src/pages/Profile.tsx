import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Shield, HelpCircle, LogOut, Sun, Moon, X, Eye, EyeOff, Pencil, Check } from 'lucide-react';
import { api, type ApiGamification, type ApiAchievement, type AchievementRarity } from '@/lib/api';
import { toast } from 'sonner';
import { useTransactions } from '@/context/TransactionsContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1';

const AVATARS = ['😎', '🤑', '🦊', '🐺', '🦁', '🐻', '🐼', '🦄'];

const XP_PER_LEVEL = 1000;
const LEVEL_NAMES: Record<number, string> = {
  1: 'Новичок', 2: 'Новичок', 3: 'Практик', 4: 'Практик',
  5: 'Практик', 6: 'Эксперт', 7: 'Эксперт', 8: 'Эксперт',
};

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

// ─── Rarity config ─────────────────────────────────────────────────────────────
const rarityConfig: Record<AchievementRarity, { border: string; glow: string; label: string }> = {
  common:    { border: 'border-white/[0.08]',       glow: '',                                          label: '' },
  rare:      { border: 'border-[#5B9EF0]/40',       glow: 'shadow-[0_0_14px_rgba(91,158,240,0.2)]',   label: 'rare' },
  epic:      { border: 'border-purple-400/40',       glow: 'shadow-[0_0_14px_rgba(168,85,247,0.2)]',   label: 'epic' },
  legendary: { border: 'border-[#FBBF24]/40',        glow: 'shadow-[0_0_16px_rgba(251,191,36,0.25)]',  label: '★' },
};

// ─── Achievement badge ─────────────────────────────────────────────────────────
function AchievementCard({ ach }: { ach: ApiAchievement }) {
  const c = rarityConfig[ach.rarity];
  return (
    <div className={`relative flex-shrink-0 w-[88px] flex flex-col items-center gap-1.5 p-3 rounded-[18px] border transition-all ${
      ach.unlocked
        ? `bg-bg-secondary ${c.border} ${c.glow}`
        : 'bg-bg-secondary/60 border-white/[0.05]'
    }`}>
      <span className={`text-[28px] leading-none ${ach.unlocked ? '' : 'grayscale opacity-30'}`}>{ach.icon}</span>
      <p className="text-[10px] font-semibold text-center leading-tight text-text-primary/70 w-full line-clamp-2">
        {ach.unlocked ? ach.title : '???'}
      </p>
      {!ach.unlocked && (
        <div className="absolute top-2 right-2 text-[10px] leading-none opacity-40">🔒</div>
      )}
      {c.label && ach.unlocked && (
        <span className="text-[8px] font-bold uppercase tracking-wider text-[#FBBF24] opacity-70">{c.label}</span>
      )}
    </div>
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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
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

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Profile ───────────────────────────────────────────────────────────────────
export function Profile() {
  const [gamification, setGamification] = useState<ApiGamification | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [avatar, setAvatar] = useState(() => localStorage.getItem('chek_avatar') || '😎');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [displayName, setDisplayName] = useState<string>(() => localStorage.getItem('chek_username') || '');
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [modal, setModal] = useState<'security' | 'help' | 'soon' | null>(null);

  const { transactions } = useTransactions();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { isLight, toggle: toggleTheme } = useTheme();

  const accentColor = isLight ? '#E07840' : '#5B9EF0';

  useEffect(() => {
    api.getGamification().then(setGamification).catch((err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Ошибка загрузки');
    });
    api.getMe().then(user => {
      setUserEmail(user.email);
      setMemberSince(formatDate(user.created_at));
    }).catch(() => {});
  }, []);

  function handleLogout() { logout(); navigate('/login', { replace: true }); }

  function pickAvatar(emoji: string) {
    setAvatar(emoji);
    localStorage.setItem('chek_avatar', emoji);
    setShowAvatarPicker(false);
  }

  function startEditUsername() {
    const emailUsername = userEmail ? userEmail.split('@')[0] : '';
    setUsernameInput(displayName || emailUsername);
    setEditingUsername(true);
    setTimeout(() => usernameInputRef.current?.focus(), 50);
  }

  function saveUsername() {
    const name = usernameInput.trim();
    if (name) {
      setDisplayName(name);
      localStorage.setItem('chek_username', name);
    }
    setEditingUsername(false);
  }

  function handleNotifToggle() {
    if (!notifEnabled) { setModal('soon'); }
    else setNotifEnabled(false);
  }

  const txCount       = transactions.length;
  const streak        = gamification?.streak_current ?? 0;
  const streakBest    = gamification?.streak_best ?? 0;
  const achievements  = gamification?.achievements ?? [];
  const unlockedCount = gamification?.achievements_unlocked ?? 0;
  const totalCount    = gamification?.achievements_total ?? 0;

  const xpTotal    = unlockedCount * 200 + txCount * 5 + streak * 10;
  const level      = Math.floor(xpTotal / XP_PER_LEVEL) + 1;
  const xpInLevel  = xpTotal % XP_PER_LEVEL;
  const xpPct      = Math.min((xpInLevel / XP_PER_LEVEL) * 100, 100);
  const levelName  = LEVEL_NAMES[level] ?? 'Мастер';
  const emailUsername = userEmail ? userEmail.split('@')[0] : '...';
  const username   = displayName || emailUsername;

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-10 space-y-3">

      {/* ── User card ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="relative bg-bg-secondary rounded-[26px] border border-white/[0.06] p-5 overflow-hidden">

        {/* Subtle glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)` }} />

        {/* Level badge — top right */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5B9EF0]/10 border border-[#5B9EF0]/20">
          <span className="text-[10px] font-black text-[#5B9EF0] tracking-wider">Ур. {level}</span>
          <span className="text-[10px] text-[#5B9EF0]/60 font-semibold">{levelName}</span>
        </div>

        {/* Avatar + info */}
        <div className="flex items-center gap-4 mb-5">
          <button onClick={() => setShowAvatarPicker(true)}
            className="relative w-16 h-16 rounded-[20px] bg-bg-elevated border border-white/[0.08] flex items-center justify-center text-[32px] hover:border-[#5B9EF0]/30 transition-colors active:scale-95 flex-shrink-0">
            {avatar}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-bg-elevated border border-white/10 flex items-center justify-center">
              <Pencil size={9} className="text-text-primary/50" />
            </div>
          </button>

          <div className="flex-1 min-w-0 pr-20">
            {editingUsername ? (
              <div className="flex items-center gap-2 mb-0.5">
                <input
                  ref={usernameInputRef}
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveUsername();
                    if (e.key === 'Escape') setEditingUsername(false);
                  }}
                  onBlur={saveUsername}
                  maxLength={24}
                  className="flex-1 min-w-0 bg-bg-elevated border border-[#5B9EF0]/40 rounded-xl px-3 py-1.5 text-[15px] font-extrabold tracking-tight text-text-primary focus:outline-none"
                />
                <button onMouseDown={e => { e.preventDefault(); saveUsername(); }}
                  className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#5B9EF0]/15 flex items-center justify-center">
                  <Check size={13} className="text-[#5B9EF0]" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-[17px] font-extrabold tracking-tight truncate text-text-primary">{username}</p>
                <button onClick={startEditUsername}
                  className="flex-shrink-0 text-text-primary/25 hover:text-text-primary/55 transition-colors">
                  <Pencil size={12} />
                </button>
              </div>
            )}
            <p className="text-xs text-text-primary/40 truncate">{userEmail ?? '—'}</p>
            {memberSince && (
              <p className="text-[10px] text-text-primary/25 mt-1">С нами с {memberSince}</p>
            )}
          </div>
        </div>

        {/* XP bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-primary/35">Опыт</span>
            <span className="text-[10px] font-semibold text-text-primary/35 tabular-nums">
              {xpInLevel} / {XP_PER_LEVEL} XP
            </span>
          </div>
          <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpPct}%` }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 }}
              className="h-full rounded-full"
              style={{ background: isLight ? 'linear-gradient(90deg, #E07840 0%, #C4612A 100%)' : 'linear-gradient(90deg, #5B9EF0 0%, #E07840 100%)' }}
            />
          </div>
          <p className="text-[10px] text-text-primary/25 mt-1.5">
            До ур. {level + 1} ещё {XP_PER_LEVEL - xpInLevel} XP
          </p>
        </div>
      </motion.div>

      {/* ── Stats row ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="grid grid-cols-3 gap-2.5">

        {/* Transactions */}
        <div className="bg-bg-secondary rounded-[20px] border border-white/[0.06] p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-primary/35">Операций</span>
          <span className="text-2xl font-extrabold tracking-tight text-text-primary tabular-nums">{txCount}</span>
          <span className="text-[10px] text-text-primary/30">всего</span>
        </div>

        {/* Streak — orange accent */}
        <div className="rounded-[20px] border border-[#E07840]/25 p-4 flex flex-col gap-1"
          style={{ background: 'linear-gradient(135deg, rgba(224,120,64,0.12) 0%, rgba(224,120,64,0.06) 100%)' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#E07840]/70">Streak</span>
          <span className="text-2xl font-extrabold tracking-tight text-[#E07840] tabular-nums">
            {streak} <span className="text-lg">🔥</span>
          </span>
          <span className="text-[10px] text-[#E07840]/50">рекорд {streakBest}д</span>
        </div>

        {/* Achievements */}
        <div className="bg-bg-secondary rounded-[20px] border border-white/[0.06] p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-primary/35">Наград</span>
          <span className="text-2xl font-extrabold tracking-tight text-text-primary tabular-nums">{unlockedCount}</span>
          <span className="text-[10px] text-text-primary/30">из {totalCount}</span>
        </div>
      </motion.div>

      {/* ── Achievements horizontal scroll ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
        <div className="flex items-center justify-between mb-3 px-0.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-primary/40">Достижения</span>
          <span className="text-[10px] font-semibold text-text-primary/30">{unlockedCount} / {totalCount}</span>
        </div>

        {achievements.length === 0 ? (
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[88px] h-[100px] bg-bg-secondary rounded-[18px] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
            {/* Unlocked first, then locked */}
            {[...achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked)).map((ach, i) => (
              <motion.div key={ach.id}
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.03 }}>
                <AchievementCard ach={ach} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Settings card ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
        className="bg-bg-secondary rounded-[20px] border border-white/[0.06] overflow-hidden">

        {/* Notifications */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.05]">
          <div className="w-8 h-8 rounded-[10px] bg-[#5B9EF0]/10 flex items-center justify-center flex-shrink-0">
            <Bell size={15} className="text-[#5B9EF0]" />
          </div>
          <span className="flex-1 text-sm font-semibold text-text-primary">Уведомления</span>
          <Toggle on={notifEnabled} onToggle={handleNotifToggle} />
        </div>

        {/* Dark / Light theme */}
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
          <span className="text-text-primary/20 text-sm">›</span>
        </button>

        {/* Help */}
        <button onClick={() => setModal('help')}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors">
          <div className="w-8 h-8 rounded-[10px] bg-[#E07840]/10 flex items-center justify-center flex-shrink-0">
            <HelpCircle size={15} className="text-[#E07840]" />
          </div>
          <span className="flex-1 text-left text-sm font-semibold text-text-primary">Помощь</span>
          <span className="text-text-primary/20 text-sm">›</span>
        </button>
      </motion.div>

      {/* ── Logout ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-bg-secondary rounded-[20px] border border-white/[0.06] hover:border-error/20 hover:bg-error/[0.04] transition-colors">
          <div className="w-8 h-8 rounded-[10px] bg-error/10 flex items-center justify-center flex-shrink-0">
            <LogOut size={15} className="text-error" />
          </div>
          <span className="flex-1 text-left text-sm font-semibold text-error">Выйти из аккаунта</span>
        </button>
      </motion.div>

      <p className="text-center text-[10px] text-text-primary/20 pb-2">чек v1.0.0</p>

      {/* ── Avatar picker modal ── */}
      <AnimatePresence>
        {showAvatarPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowAvatarPicker(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[300px] bg-bg-secondary rounded-[24px] border border-white/[0.08] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-text-primary">Выбери аватар</p>
                <button onClick={() => setShowAvatarPicker(false)}
                  className="w-7 h-7 rounded-lg bg-bg-elevated flex items-center justify-center">
                  <X size={13} className="text-text-primary/50" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {AVATARS.map(emoji => (
                  <button key={emoji} onClick={() => pickAvatar(emoji)}
                    className={`h-14 rounded-xl flex items-center justify-center text-3xl transition-all active:scale-90 ${
                      avatar === emoji
                        ? 'bg-[#5B9EF0]/15 ring-1 ring-[#5B9EF0]/40'
                        : 'bg-bg-elevated hover:bg-white/[0.06]'
                    }`}>
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modal === 'security' && <SecurityModal onClose={() => setModal(null)} />}
        {modal === 'help'     && <HelpModal     onClose={() => setModal(null)} />}
        {modal === 'soon'     && <ComingSoonModal onClose={() => setModal(null)} />}
      </AnimatePresence>
    </div>
  );
}
