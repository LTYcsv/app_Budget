import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { StreakIndicator } from '@/components/StreakIndicator';
import { api, type ApiGamification, type ApiAchievement, type AchievementRarity } from '@/lib/api';
import { toast } from 'sonner';

const rarityBorder: Record<AchievementRarity, string> = {
  common:    'var(--nav-border)',
  rare:      'rgba(91,158,240,0.45)',
  epic:      'rgba(224,120,64,0.45)',
  legendary: 'rgba(245,158,11,0.55)',
};
const rarityGlow: Record<AchievementRarity, string> = {
  common:    'none',
  rare:      '0 0 16px rgba(91,158,240,0.2)',
  epic:      '0 0 16px rgba(224,120,64,0.2)',
  legendary: '0 0 20px rgba(245,158,11,0.3)',
};

function AchievementCard({ ach, index }: { ach: ApiAchievement; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index }}
      style={{
        position: 'relative', padding: 16, borderRadius: 20,
        background: 'var(--nav-surface)',
        border: `1px solid ${ach.unlocked ? rarityBorder[ach.rarity] : 'var(--nav-border)'}`,
        boxShadow: ach.unlocked ? rarityGlow[ach.rarity] : 'none',
        opacity: ach.unlocked ? 1 : 0.55,
      }}
    >
      {!ach.unlocked && (
        <div style={{ position: 'absolute', top: 14, right: 14 }}>
          <Lock size={14} style={{ color: 'var(--text-dim)' }} />
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, background: 'var(--surface-2)', flexShrink: 0,
        }}>
          {ach.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="display" style={{ fontSize: 15 }}>{ach.title}</span>
            {ach.unlocked && <Check size={13} style={{ color: '#4ADE80', flexShrink: 0 }} />}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.4 }}>{ach.description}</p>
          {ach.unlocked && ach.unlocked_at && (
            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
              {new Date(ach.unlocked_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function Achievements() {
  const [data, setData] = useState<ApiGamification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getGamification().then(setData).catch((err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Не удалось загрузить достижения');
    }).finally(() => setLoading(false));
  }, []);

  const streakCurrent = data?.streak_current ?? 0;
  const streakBest    = data?.streak_best ?? 0;
  const achievements  = data?.achievements ?? [];
  const unlockedCount = data?.achievements_unlocked ?? 0;
  const totalCount    = data?.achievements_total ?? 0;

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-10" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="chek-card" style={{ padding: '22px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
        <h1 className="display" style={{ fontSize: 22, marginBottom: 4 }}>Твои награды</h1>
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>{unlockedCount} из {totalCount} разблокировано</p>
        <div className="glow-line" />
      </motion.div>

      {/* ── Stats ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="chek-flat" style={{ padding: 16, textAlign: 'center' }}>
          <p className="num" style={{ fontSize: 28, color: '#F59E0B' }}>{unlockedCount}</p>
          <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Получено</p>
        </div>
        <div className="chek-flat" style={{ padding: 16, textAlign: 'center' }}>
          <p className="num" style={{ fontSize: 28, color: 'var(--nav-accent, #5B9EF0)' }}>{totalCount - unlockedCount}</p>
          <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Осталось</p>
        </div>
      </motion.div>

      {/* ── Streak card ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
        className="chek-flat" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--streak)', marginBottom: 8 }}>
              Текущий стрик
            </p>
            <StreakIndicator days={streakCurrent} size="lg" />
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Рекорд</p>
            <p className="num" style={{ fontSize: 28, color: '#F59E0B' }}>{streakBest} 🔥</p>
          </div>
        </div>
      </motion.div>

      {/* ── Achievements list ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', marginBottom: 10 }}>
          Все достижения
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="chek-flat animate-pulse" style={{ height: 80 }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {achievements.map((ach, i) => <AchievementCard key={ach.id} ach={ach} index={i} />)}
          </div>
        )}
      </motion.div>
    </div>
  );
}
