import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Check, X } from 'lucide-react';
import { api, type ApiGamification, type ApiAchievement } from '@/lib/api';
import { toast } from 'sonner';
import { useTransactions } from '@/context/TransactionsContext';

const AVATARS = ['😎', '🤑', '🦊', '🐺', '🦁', '🐻', '🐼', '🦄'];

const LEVEL_THRESHOLDS = [0, 500, 1500, 3000, 5000, 8000, 12000, 17000, 24000, 34000];
const LEVEL_NAMES: Record<number, string> = {
  1: 'Новичок', 2: 'Ученик', 3: 'Следопыт', 4: 'Практик', 5: 'Знаток',
  6: 'Эксперт', 7: 'Профи',  8: 'Наставник', 9: 'Мудрец', 10: 'Легенда',
};

function calcLevel(xp: number): { level: number; xpInLevel: number; xpForNext: number; pct: number } {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  level = Math.min(level, 10);
  const xpStart   = LEVEL_THRESHOLDS[level - 1];
  const xpEnd     = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[9];
  const xpInLevel = xp - xpStart;
  const xpForNext = xpEnd - xpStart;
  const pct = level === 10 ? 100 : Math.min((xpInLevel / xpForNext) * 100, 100);
  return { level, xpInLevel, xpForNext, pct };
}

const WEEK_DAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const RING_R = 37;
const RING_CIRC = 2 * Math.PI * RING_R;

function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '18px 0 10px' }}>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)' }}>
        {title}
      </span>
      {right && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{right}</span>}
    </div>
  );
}

function AchievementTile({ ach, delay }: { ach: ApiAchievement; delay: number }) {
  return (
    <div className="fade-up" style={{
      padding: 10, borderRadius: 16, textAlign: 'center', position: 'relative',
      background: ach.unlocked ? 'var(--nav-surface)' : 'var(--surface-2)',
      border: ach.unlocked ? '1px solid var(--border-accent)' : '1px dashed var(--nav-border)',
      opacity: ach.unlocked ? 1 : 0.55,
      animationDelay: `${delay}ms`,
    }}>
      <div style={{ fontSize: 28, filter: ach.unlocked ? 'none' : 'grayscale(0.7)' }}>{ach.icon}</div>
      <div style={{ fontSize: 10, fontWeight: 600, marginTop: 4, lineHeight: 1.2 }}>{ach.title}</div>
      {ach.unlocked && (
        <div style={{
          position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: '50%',
          background: '#4ADE80', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 700,
        }}>✓</div>
      )}
    </div>
  );
}

export function Profile() {
  const [gamification, setGamification] = useState<ApiGamification | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [avatar, setAvatar] = useState(() => localStorage.getItem('chek_avatar') || '😎');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [displayName, setDisplayName] = useState<string>(() => localStorage.getItem('chek_username') || '');
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'me' | 'friends'>('me');

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

  const xpTotal = gamification?.xp_total ?? 0;
  const { level, xpInLevel, xpForNext, pct: xpPct } = calcLevel(xpTotal);
  const levelName = LEVEL_NAMES[level] ?? 'Легенда';
  const username  = displayName || (userEmail ? userEmail.split('@')[0] : '...');

  const archetype = useMemo(() => {
    if (txCount < 20) return { icon: '🌱', label: 'Новичок' };
    const dates = transactions.map(tx => tx.date).sort();
    const firstDate = new Date(dates[0]);
    const lastDate  = new Date();
    const totalDays = Math.max(1, Math.round((lastDate.getTime() - firstDate.getTime()) / 86_400_000));
    const activeDays = new Set(dates).size;
    const regularity = activeDays / totalDays;
    if (regularity < 0.2) return { icon: '👻', label: 'Призрак' };
    if (txCount < 50) {
      if (streak < 7)  return { icon: '🎲', label: 'Авантюрист' };
      if (streak < 21) return { icon: '🧭', label: 'Исследователь' };
      if (streak < 60) return { icon: '♟️', label: 'Тактик' };
      return                  { icon: '🧱', label: 'Строитель' };
    }
    if (txCount < 150) {
      if (streak < 7)  return { icon: '🏹', label: 'Охотник' };
      if (streak < 21) return { icon: '🌀', label: 'Философ' };
      if (streak < 60) return { icon: '🏛️', label: 'Архитектор' };
      return                  { icon: '🎖️', label: 'Ветеран' };
    }
    if (streak < 7)  return { icon: '🏹', label: 'Охотник' };
    if (streak < 21) return { icon: '🌀', label: 'Философ' };
    if (streak < 60) return { icon: '🏛️', label: 'Архитектор' };
    return                  { icon: '👑', label: 'Легенда' };
  }, [transactions, txCount, streak]);

  const weeklyActivity = useMemo(() => {
    const today = new Date();
    const dayOfWeek = (today.getDay() + 6) % 7; // 0=Mon … 6=Sun
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    return WEEK_DAYS.map((day, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const done = date <= today && transactions.some(tx => tx.date.startsWith(dateStr));
      const isToday = i === dayOfWeek;
      return { day, done, isToday };
    });
  }, [transactions]);

  const sortedAchievements = useMemo(
    () => [...achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked)).slice(0, 8),
    [achievements],
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-32">

      {/* ── Tab switcher ── */}
      <div style={{
        display: 'flex', background: 'var(--nav-surface)',
        border: '1px solid var(--nav-border)', borderRadius: 14, padding: 4,
      }}>
        {(['me', 'friends'] as const).map((k) => {
          const label = k === 'me' ? 'Я' : 'Друзья';
          const active = tab === k;
          return (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, fontWeight: 600, fontSize: 14,
              background: active ? 'var(--surface-2)' : 'transparent',
              color: active ? 'inherit' : 'var(--text-dim)',
              border: active ? '1px solid var(--nav-border)' : '1px solid transparent',
              transition: 'background 0.15s, color 0.15s', cursor: 'pointer',
            }}>{label}</button>
          );
        })}
      </div>

      {/* ══════════════════ ME TAB ══════════════════ */}
      {tab === 'me' && (
        <>
          {/* ── Hero card ── */}
          <div className="chek-card fade-up" style={{ padding: 22, marginTop: 14 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>

              {/* Ring + avatar */}
              <div style={{ position: 'relative', flexShrink: 0, width: 88, height: 88 }}>
                <svg width={88} height={88}
                  style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                  <circle cx={44} cy={44} r={RING_R} fill="none"
                    stroke="var(--ring-track)" strokeWidth={7} />
                  <circle cx={44} cy={44} r={RING_R} fill="none"
                    stroke="var(--ring-xp)" strokeWidth={7} strokeLinecap="round"
                    strokeDasharray={`${RING_CIRC * xpPct / 100} ${RING_CIRC}`} />
                </svg>
                <button onClick={() => setShowAvatarPicker(true)} style={{
                  position: 'absolute', inset: 10, borderRadius: '50%',
                  background: 'var(--avatar-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, border: 'none', cursor: 'pointer',
                }}>{avatar}</button>
                <div style={{
                  position: 'absolute', bottom: -4, right: -4,
                  background: 'var(--level-badge-bg)', color: 'var(--level-badge-text)',
                  fontSize: 11, fontWeight: 800,
                  padding: '3px 8px', borderRadius: 100, border: '2px solid var(--nav-surface)',
                }}>{level}</div>
              </div>

              {/* Name + XP */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingUsername ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                      style={{
                        flex: 1, minWidth: 0, background: 'var(--surface-2)',
                        border: '1px solid var(--border-accent)', borderRadius: 10,
                        padding: '6px 10px', fontSize: 16, fontWeight: 700, color: 'inherit',
                        outline: 'none', fontFamily: 'var(--font-display)',
                      }}
                    />
                    <button onMouseDown={e => { e.preventDefault(); saveUsername(); }} style={{
                      width: 28, height: 28, borderRadius: 8, background: 'rgba(167,139,250,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: 'none', cursor: 'pointer',
                    }}>
                      <Check size={13} style={{ color: 'var(--xp)' }} />
                    </button>
                  </div>
                ) : (
                  <div className="display" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 20 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {username}
                    </span>
                    <button onClick={startEditUsername} style={{
                      flexShrink: 0, opacity: 0.4, background: 'none',
                      border: 'none', cursor: 'pointer', color: 'inherit', padding: 0,
                    }}>
                      <Pencil size={12} />
                    </button>
                  </div>
                )}

                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                  {archetype.icon} {archetype.label} · Ур. {level} {levelName}
                </div>

                <div style={{ marginTop: 10, height: 6, borderRadius: 100, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpPct}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 }}
                    style={{
                      height: '100%', borderRadius: 100,
                      background: 'linear-gradient(90deg, var(--xp), var(--nav-accent, #5B9EF0))',
                      boxShadow: '0 0 10px var(--accent-glow)',
                    }}
                  />
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                  {xpInLevel} / {xpForNext} XP
                  {level < 10 && ` · до ур. ${level + 1}: ${xpForNext - xpInLevel} XP`}
                </div>
              </div>
            </div>
            <div className="glow-line" />
          </div>

          {/* ── Stats row ── */}
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <div className="chek-flat" style={{ flex: 1, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>🔥</div>
              <div className="num" style={{ fontSize: 22, color: 'var(--streak)' }}>{streak}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Стрик</div>
            </div>
            <div className="chek-flat" style={{ flex: 1, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>⚡</div>
              <div className="num" style={{ fontSize: 22, color: 'var(--xp)' }}>{xpInLevel}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>XP</div>
            </div>
            <div className="chek-flat" style={{ flex: 1, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 2 }}>🏆</div>
              <div className="num" style={{ fontSize: 22 }}>{unlockedCount}/{totalCount}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Достижения</div>
            </div>
          </div>

          {/* ── Weekly activity ── */}
          <SectionHeader title="Твоя неделя" />
          <div className="chek-flat" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
              {weeklyActivity.map(({ day, done, isToday }, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 8 }}>{day}</div>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', margin: '0 auto',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? 'var(--streak)' : 'var(--surface-2)',
                    border: isToday ? '2px solid rgba(255,255,255,0.55)' : '1px solid var(--nav-border)',
                    fontSize: 14,
                    boxShadow: done ? '0 0 12px rgba(255,120,60,0.45)' : 'none',
                  }}>{done ? '🔥' : ''}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Achievements grid ── */}
          <SectionHeader title="Достижения" right={`${unlockedCount}/${totalCount}`} />
          {achievements.length === 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse"
                  style={{ height: 96, borderRadius: 16, background: 'var(--surface-2)' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {sortedAchievements.map((ach, i) => (
                <AchievementTile key={ach.id} ach={ach} delay={i * 40} />
              ))}
            </div>
          )}

          {/* ── Streak best ── */}
          {streakBest > 0 && (
            <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: 'var(--text-dim)' }}>
              Рекорд стрика: {streakBest} дн · Операций: {txCount}
            </div>
          )}
        </>
      )}

      {/* ══════════════════ FRIENDS TAB ══════════════════ */}
      {tab === 'friends' && (
        <div className="chek-card" style={{ padding: 32, textAlign: 'center', marginTop: 14 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🚀</div>
          <div className="display" style={{ fontSize: 20, marginBottom: 6 }}>Скоро</div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>Функция в разработке</div>
          <div className="glow-line" />
        </div>
      )}

      {/* ── Avatar picker modal ── */}
      <AnimatePresence>
        {showAvatarPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowAvatarPicker(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
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
