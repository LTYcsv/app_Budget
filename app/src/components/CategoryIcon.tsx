import { cn } from '@/lib/utils';

function isAssetIcon(icon: string) {
  const value = icon.toLowerCase();
  return (
    value.startsWith('data:image/') ||
    value.startsWith('/') ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.endsWith('.svg') ||
    value.endsWith('.png') ||
    value.endsWith('.jpg') ||
    value.endsWith('.jpeg') ||
    value.endsWith('.webp')
  );
}

type CategoryIconProps = {
  icon: string;
  alt?: string;
  emojiClassName?: string;
  imageClassName?: string;
};

export function CategoryIcon({
  icon,
  alt = 'Category icon',
  emojiClassName,
  imageClassName,
}: CategoryIconProps) {
  if (isAssetIcon(icon)) {
    return (
      <img
        src={icon}
        alt={alt}
        className={cn('w-6 h-6 object-contain', imageClassName)}
      />
    );
  }

  return <span className={cn('text-xl', emojiClassName)}>{icon || '📦'}</span>;
}
