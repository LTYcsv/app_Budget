import { cn } from '@/lib/utils';

interface BlobProps {
  color?: 'primary' | 'secondary' | 'accent';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  delay?: number;
}

export function Blob({
  color = 'primary',
  size = 'lg',
  className = '',
  delay = 0,
}: BlobProps) {
  const colors = {
    primary: 'from-primary/30 to-primary/5',
    secondary: 'from-secondary/30 to-secondary/5',
    accent: 'from-accent/30 to-accent/5',
  };

  const sizes = {
    sm: 'w-32 h-32',
    md: 'w-48 h-48',
    lg: 'w-72 h-72',
    xl: 'w-96 h-96',
  };

  return (
    <div
      className={cn(
        'absolute rounded-full bg-gradient-to-br blur-3xl pointer-events-none',
        colors[color],
        sizes[size],
        'animate-blob-float',
        className
      )}
      style={{
        animationDelay: `${delay}s`,
      }}
    />
  );
}
