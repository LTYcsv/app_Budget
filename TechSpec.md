# Техническая спецификация: FinFlow

## 1. Архитектура проекта

```
app/
├── src/
│   ├── sections/           # Секции страницы
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── Gamification.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── SocialProof.tsx
│   │   ├── FAQ.tsx
│   │   └── Footer.tsx
│   ├── components/         # Переиспользуемые компоненты
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── StreakIndicator.tsx
│   │   ├── AchievementBadge.tsx
│   │   ├── AnimatedCounter.tsx
│   │   ├── FadeInView.tsx
│   │   └── Blob.tsx
│   ├── hooks/              # Custom hooks
│   │   ├── useInView.ts
│   │   └── useCountUp.ts
│   ├── lib/                # Утилиты
│   │   └── utils.ts
│   ├── App.tsx
│   ├── App.css
│   └── main.tsx
├── public/                 # Статические файлы
├── index.html
├── tailwind.config.js
└── package.json
```

## 2. Компоненты и зависимости

### shadcn/ui компоненты (уже установлены)
- Button
- Card
- Accordion (для FAQ)
- Badge
- Avatar

### Дополнительные библиотеки
```bash
# Анимации
npm install framer-motion

# Иконки
npm install lucide-react

# Утилиты
npm install clsx tailwind-merge
```

## 3. Кастомные компоненты

### Button (расширенный)
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'icon';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}
```
- Primary: градиентный фон, glow shadow
- Secondary: border, transparent bg
- Ghost: только текст
- Icon: квадратная кнопка с иконкой

### Card
```typescript
interface CardProps {
  variant: 'feature' | 'stat' | 'achievement';
  children: React.ReactNode;
  className?: string;
}
```
- Feature: стандартная карточка с hover lift
- Stat: с боковым border-акцентом
- Achievement: с glow эффектом

### ProgressBar
```typescript
interface ProgressBarProps {
  value: number; // 0-100
  variant: 'linear' | 'circular';
  color?: string;
  animated?: boolean;
}
```

### StreakIndicator
```typescript
interface StreakIndicatorProps {
  days: number;
  animated?: boolean;
}
```
- Иконка огня с пульсирующей анимацией
- Счётчик дней

### AchievementBadge
```typescript
interface AchievementBadgeProps {
  icon: LucideIcon;
  title: string;
  unlocked: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}
```
- Разные цвета glow в зависимости от редкости
- Анимация разблокировки

### AnimatedCounter
```typescript
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}
```
- Анимация счёта от 0 до значения
- Использует requestAnimationFrame

### FadeInView
```typescript
interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}
```
- Обёртка для scroll-triggered анимаций
- Использует Intersection Observer

### Blob
- Декоративный размытый круг
- CSS animation для плавного движения
- Градиентная заливка

## 4. Анимации

### Framer Motion конфигурация

```typescript
// Стандартные варианты
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.15
    }
  }
};
```

### CSS анимации

```css
/* Streak fire pulse */
@keyframes firePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* Blob movement */
@keyframes blobFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
}

/* Glow pulse */
@keyframes glowPulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* Progress fill */
@keyframes progressFill {
  from { stroke-dashoffset: 283; }
  to { stroke-dashoffset: 0; }
}
```

## 5. Секции — детальная реализация

### Hero
**Компоненты:**
- Заголовок (H1) с fade in up
- Подзаголовок с fade in up (delay 100ms)
- ButtonGroup с fade in up (delay 200ms)
- DemoWidget (интерактивная карточка) с scale in (delay 300ms)
- 3 Blob компонента с blobFloat анимацией

**Демо-виджет:**
- Карточка с балансом
- Мини-график (SVG sparkline)
- Последние транзакции (3 шт)
- Hover: поднятие + усиление glow

### Features
**Компоненты:**
- SectionHeader с fade in up
- Grid из 3 FeatureCard
- Каждая карточка:
  - Иконка (48px) с float анимацией
  - Заголовок (H3)
  - Описание
  - Hover: translateY(-4px) + shadow

**Анимация:**
- Stagger: 150ms между карточками
- Trigger: 20% видимости секции

### Gamification
**Компоненты:**
- SectionHeader
- StreakIndicator с firePulse
- Grid AchievementBadge (6 шт)
- Linear ProgressBar для уровня
- ChallengeCard с чеклистом

**Анимации:**
- Streak: непрерывная пульсация
- Достижения: hover scale + glow
- Прогресс: анимация при скролле

### HowItWorks
**Компоненты:**
- SectionHeader
- 3 Step компонента в row
- Каждый шаг:
  - Номер (круг с числом)
  - Заголовок
  - Описание
- Стрелки между шагами (SVG)

**Анимации:**
- Номера: scale in with bounce
- Стрелки: draw SVG animation

### SocialProof
**Компоненты:**
- SectionHeader
- Carousel с ReviewCard
- Каждый отзыв:
  - Avatar
  - Текст отзыва
  - Имя и возраст
  - Рейтинг (звёзды)

**Анимации:**
- Карточки: fade in
- Автопрокрутка: 5s interval

### FAQ
**Компоненты:**
- SectionHeader
- Accordion из shadcn/ui
- 4 вопроса

**Анимации:**
- Accordion: height animation 300ms
- Иконка: rotate 180deg

### Footer
**Компоненты:**
- CTA Section с gradient bg
- Footer links
- Social icons

**Анимации:**
- CTA button: subtle pulse
- Social icons: hover scale

## 6. Хуки

### useInView
```typescript
function useInView(threshold = 0.2): [RefObject, boolean]
```
- Использует Intersection Observer
- Возвращает ref и boolean состояние

### useCountUp
```typescript
function useCountUp(end: number, duration?: number): number
```
- Анимированный счётчик
- Использует requestAnimationFrame
- Возвращает текущее значение

## 7. Tailwind конфигурация

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366F1',
          light: '#818CF8',
          dark: '#4F46E5',
        },
        secondary: {
          DEFAULT: '#EC4899',
          light: '#F472B6',
          dark: '#DB2777',
        },
        accent: {
          DEFAULT: '#22D3EE',
          light: '#67E8F9',
          dark: '#06B6D4',
        },
        background: {
          primary: '#0F0F1A',
          secondary: '#1A1A2E',
          tertiary: '#252542',
          elevated: '#32325A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fire-pulse': 'firePulse 1s ease-in-out infinite',
        'blob-float': 'blobFloat 20s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        firePulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
        blobFloat: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
        },
      },
    },
  },
};
```

## 8. CSS Variables

```css
:root {
  /* Primary */
  --primary: #6366F1;
  --primary-light: #818CF8;
  --primary-dark: #4F46E5;
  
  /* Secondary */
  --secondary: #EC4899;
  --secondary-light: #F472B6;
  --secondary-dark: #DB2777;
  
  /* Accent */
  --accent: #22D3EE;
  --accent-light: #67E8F9;
  --accent-dark: #06B6D4;
  
  /* Status */
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;
  
  /* Background */
  --bg-primary: #0F0F1A;
  --bg-secondary: #1A1A2E;
  --bg-tertiary: #252542;
  --bg-elevated: #32325A;
  
  /* Text */
  --text-primary: #FFFFFF;
  --text-secondary: #A1A1AA;
  --text-tertiary: #71717A;
  --text-muted: #52525B;
}
```

## 9. Производительность

### Оптимизации
- Использовать `will-change` для анимированных элементов
- Lazy load для изображений
- Оптимизировать анимации (только transform/opacity)
- Debounce для scroll событий
- `prefers-reduced-motion` support

### Метрики
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Cumulative Layout Shift: < 0.1
