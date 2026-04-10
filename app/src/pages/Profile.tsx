import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Check, X } from 'lucide-react';
import { api, type ApiGamification, type ApiAchievement } from '@/lib/api';
import { toast } from 'sonner';
import { useTransactions } from '@/context/TransactionsContext';

const AVATARS = ['😎', '🤑', '🦊', '🐺', '🦁', '🐻', '🐼', '🦄'];

const XP_PER_LEVEL = 1000;
const LEVEL_NAMES: Record<number, string> = {
  1: 'Новичок', 2: 'Новичок', 3: 'Практик', 4: 'Практик',
  5: 'Практик', 6: 'Эксперт', 7: 'Эксперт', 8: 'Эксперт',
};

// ─── Achievement card ──────────────────────────────────────────────────────────
function AchievementCard({ ach }: { ach: ApiAchievement }) {
  return (
    <div className={`relative flex-shrink-0 w-[80px] h-[96px] flex flex-col items-center justify-center gap-1.5 rounded-[20px] bg-bg-secondary transition-opacity ${!ach.unlocked ? 'opacity-40' : ''}`}>
      {!ach.unlocked && (
        <div className="absolute top-2 right-2 text-[10px] leading-none">🔒</div>
      )}
      <span className="text-[24px] leading-none">{ach.icon}</span>
      <p className="text-[11px] font-medium text-center leading-tight text-text-primary px-2 line-clamp-2">
        {ach.title}
      </p>
    </div>
  );
}

// ─── Profile ───────────────────────────────────────────────────────────────────
export function Profile() {
  const [gamification, setGamification] = useState<ApiGamification | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [avatar, setAvatar] = useState(() => localStorage.getItem('chek_avatar') || '😎');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [displayName, setDisplayName] = useState<string>(() => localStorage.getItem('chek_username') || '');
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const usernameInputRef = useRef<HTMLInputElement>(null);

  const { transactions } = useTransactions();

  useEffect(() => {
    api.getGamification().then(setGamification).catch((err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Ошибка загрузки');
    });
    api.getMe().then(user => {
      setUserEmail(user.email);
    }).catch(() => {});
  }, []);

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

  const txCount       = transactions.length;
  const streak        = gamification?.streak_current ?? 0;
  const streakBest    = gamification?.streak_best ?? 0;
  const achievements  = gamification?.achievements ?? [];
  const unlockedCount = gamification?.achievements_unlocked ?? 0;
  const totalCount    = gamification?.achievements_total ?? 0;

  const xpTotal   = unlockedCount * 200 + txCount * 5 + streak * 10;
  const level     = Math.floor(xpTotal / XP_PER_LEVEL) + 1;
  const xpInLevel = xpTotal % XP_PER_LEVEL;
  const xpPct     = Math.min((xpInLevel / XP_PER_LEVEL) * 100, 100);
  const levelName = LEVEL_NAMES[level] ?? 'Мастер';
  const username  = displayName || (userEmail ? userEmail.split('@')[0] : '...');

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-10 space-y-3">

      {/* ── User card ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="relative bg-bg-secondary rounded-[24px] p-5 overflow-hidden">

        {/* Level pill */}
        <div className="absolute top-4 right-4">
          <span className="text-[12px] font-bold text-white px-3 py-1 rounded-[20px]"
            style={{ background: '#5B9EF0' }}>
            Ур. {level} {levelName}
          </span>
        </div>

        {/* Row 1: Avatar + Name */}
        <div className="flex items-center gap-3 mb-2 pr-32">
          <button onClick={() => setShowAvatarPicker(true)}
            className="relative w-[52px] h-[52px] rounded-[14px] bg-bg-elevated flex items-center justify-center text-[26px] flex-shrink-0 active:scale-95 transition-transform">
            {avatar}
          </button>

          <div className="flex-1 min-w-0">
            {editingUsername ? (
              <div className="flex items-center gap-2">
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
                  className="flex-1 min-w-0 bg-bg-elevated border border-[#5B9EF0]/40 rounded-xl px-3 py-1.5 text-[15px] font-bold tracking-tight text-text-primary focus:outline-none"
                />
                <button onMouseDown={e => { e.preventDefault(); saveUsername(); }}
                  className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#5B9EF0]/15 flex items-center justify-center">
                  <Check size={13} className="text-[#5B9EF0]" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <p className="text-[17px] font-bold tracking-tight truncate text-text-primary">{username}</p>
                <button onClick={startEditUsername}
                  className="flex-shrink-0 text-text-primary/25 hover:text-text-primary/55 transition-colors">
                  <Pencil size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Email */}
        <p className="text-xs text-text-primary/40 truncate mb-2">{userEmail ?? '—'}</p>

        {/* Row 3: Archetype tag */}
        <div className="mb-4">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-[20px] text-[12px] font-medium text-[#5B9EF0]"
            style={{ background: 'rgba(91,158,240,0.12)' }}>
            ⚡ Импульсивный оптимист
          </span>
        </div>

        {/* XP section */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-primary/40">ОПЫТ</span>
            <span className="text-[10px] font-bold text-text-primary/40 tabular-nums">
              {xpInLevel} / {XP_PER_LEVEL} XP
            </span>
          </div>
          <div className="h-2 w-full rounded-[20px] overflow-hidden bg-white/[0.08]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpPct}%` }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 }}
              className="h-full rounded-[20px]"
              style={{ background: 'linear-gradient(90deg, #5B9EF0 0%, #E07840 100%)' }}
            />
          </div>
          <p className="text-[12px] text-text-primary/40 mt-1.5">
            До Ур. {level + 1} — ещё {XP_PER_LEVEL - xpInLevel} XP
          </p>
        </div>
      </motion.div>

      {/* ── Streak — full width ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
        className="rounded-[20px] px-5 py-4"
        style={{ background: 'rgba(224,120,64,0.08)', border: '1px solid rgba(224,120,64,0.20)' }}>
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#E07840]">STREAK</span>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-[36px] font-black text-text-primary tabular-nums leading-none">{streak}</span>
          <span className="text-2xl leading-none">🔥</span>
        </div>
        <p className="text-[12px] text-text-primary/40 mt-1">рекорд {streakBest}д</p>
      </motion.div>

      {/* ── Two-column stats ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}
        className="grid grid-cols-2 gap-3">
        <div className="bg-bg-secondary rounded-[20px] px-5 py-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-primary/40">ОПЕРАЦИЙ</span>
          <span className="text-[28px] font-black tracking-tight text-text-primary tabular-nums leading-tight">{txCount}</span>
          <span className="text-[12px] text-text-primary/40">всего</span>
        </div>
        <div className="bg-bg-secondary rounded-[20px] px-5 py-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-primary/40">НАГРАД</span>
          <span className="text-[28px] font-black tracking-tight text-text-primary tabular-nums leading-tight">{unlockedCount}</span>
          <span className="text-[12px] text-text-primary/40">из {totalCount}</span>
        </div>
      </motion.div>

      {/* ── Achievements ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <div className="flex items-center justify-between mb-3 px-0.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-primary/40">ДОСТИЖЕНИЯ</span>
          <span className="text-[12px] text-text-primary/40">{unlockedCount}/{totalCount}</span>
        </div>

        {achievements.length === 0 ? (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[80px] h-[96px] bg-bg-secondary rounded-[20px] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
            {[...achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked)).map((ach, i) => (
              <motion.div key={ach.id}
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.14 + i * 0.03 }}>
                <AchievementCard ach={ach} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Share button ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <button className="w-full py-4 rounded-[20px] bg-bg-secondary border border-white/[0.08] text-[#5B9EF0] text-[15px] font-medium">
          Поделиться профилем
        </button>
      </motion.div>

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
    </div>
  );
}