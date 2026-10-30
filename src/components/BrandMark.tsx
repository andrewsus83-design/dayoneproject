import Image from 'next/image';

/**
 * The copper "dp" mark of the Day One Project logo (public/brand/dayone-mark.png), used wherever the app shows its
 * brand. next/image serves a small copy sized for the spot. `size` is the height in px.
 */
export function BrandMark({ size = 32, priority = false, className = '' }: { size?: number; priority?: boolean; className?: string }) {
  return (
    <Image
      src="/brand/dayone-mark.png"
      alt="Day One Project"
      width={Math.round(size * (520 / 476))}
      height={size}
      priority={priority}
      className={`shrink-0 ${className}`.trim()}
    />
  );
}
