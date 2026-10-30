import Image from 'next/image';
import { Calendar, Camera, Gamepad2, Gift, Lock, QrCode, Settings } from 'lucide-react';

/** Page gutter and width shared by every section of the home page. */
export const CONTAINER = 'max-w-6xl mx-auto px-5 sm:px-8';

export { BrandMark } from '@/components/BrandMark';

export function Eyebrow({ children, tone = 'text-premium-gold' }: { children: React.ReactNode; tone?: string }) {
  return <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${tone}`}>{children}</p>;
}

export function SectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`font-display font-semibold text-white text-[32px] leading-[1.08] sm:text-5xl text-balance ${className}`}>
      {children}
    </h2>
  );
}

/** A phone outline for the guest-app mock-ups. Purely decorative. */
export function PhoneFrame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      aria-hidden
      className={`@container relative aspect-[9/19] rounded-[2rem] bg-premium-black border-[5px] border-zinc-800 shadow-2xl overflow-hidden ${className}`}
    >
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1/3 h-3 rounded-full bg-zinc-900 z-20" />
      {children}
    </div>
  );
}

/** The guest app's bottom bar: the centre tab is the QR pass until check-in, then Shot. */
export function GuestNav({ active, checkedIn }: { active: 'event' | 'center'; checkedIn: boolean }) {
  const Center = checkedIn ? Camera : QrCode;
  const side = (Icon: typeof Calendar, label: string, on = false, locked = false) => (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <span className="relative">
        <Icon className={`w-3.5 h-3.5 ${on ? 'text-white' : 'text-zinc-500'}`} />
        {locked && <Lock className="absolute -top-1 -right-1.5 w-2 h-2 text-zinc-500" />}
      </span>
      <span className={`hidden @[190px]:block text-[7px] font-bold ${on ? 'text-white' : 'text-zinc-500'}`}>{label}</span>
    </div>
  );
  return (
    <div className="absolute bottom-2 inset-x-2 glass-panel rounded-2xl border border-zinc-700/80 px-1.5 py-1.5 flex items-center justify-around z-10">
      {side(Calendar, 'Event', active === 'event')}
      {side(Gamepad2, 'Activity', false, !checkedIn)}
      <div className="flex flex-col items-center gap-0.5">
        <div
          className={`w-7 h-7 rounded-xl flex items-center justify-center ${
            active === 'center' ? 'bg-premium-gold text-black shadow-gold' : 'bg-premium-charcoal text-premium-gold border border-premium-gold/30'
          }`}
        >
          <Center className="w-3.5 h-3.5" />
        </div>
        <span className={`hidden @[190px]:block text-[7px] font-bold ${active === 'center' ? 'text-premium-gold' : 'text-zinc-500'}`}>
          {checkedIn ? 'Shot' : 'QR'}
        </span>
      </div>
      {side(Gift, 'Prize', false, !checkedIn)}
      {side(Settings, 'Setting')}
    </div>
  );
}

/** A QR-looking pattern (not a real code) drawn as one SVG path. */
export function QrGlyph({ className = '' }: { className?: string }) {
  const n = 21;
  const finder = (x: number, y: number) => {
    for (const [fx, fy] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
      const dx = x - fx;
      const dy = y - fy;
      if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) {
        const ring = Math.min(dx, dy, 6 - dx, 6 - dy);
        return ring === 0 || ring >= 2 ? 1 : 0;
      }
      if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) return 0;
    }
    return -1;
  };
  let seed = 7;
  let d = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      const f = finder(x, y);
      if (f === 1 || (f === -1 && seed % 100 < 48)) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return (
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} className={className} shapeRendering="crispEdges" aria-hidden>
      <rect x="-1" y="-1" width={n + 2} height={n + 2} fill="#fff" />
      <path d={d} fill="#09090B" />
    </svg>
  );
}

/** Tile colours for the photo-wall mock-ups, in brand tones; each mock-up sets its own tile heights. */
export const WALL_TILES = [
  'bg-gradient-to-br from-premium-gold/50 to-premium-charcoal',
  'bg-gradient-to-br from-[#A97250]/60 to-premium-black',
  'bg-gradient-to-br from-premium-danger/35 to-premium-charcoal',
  'bg-gradient-to-br from-zinc-500/40 to-premium-black',
  'bg-gradient-to-br from-premium-neon/25 to-premium-charcoal',
  'bg-gradient-to-br from-premium-gold/35 to-[#A97250]/20',
  'bg-gradient-to-br from-[#A97250]/45 to-premium-charcoal',
  'bg-gradient-to-br from-premium-danger/25 to-premium-black',
  'bg-gradient-to-br from-zinc-400/30 to-premium-charcoal',
];

export const CONTACT_EMAIL = 'info@dayoneproject.xyz';
export const CONTACT_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Day One Project for my event')}`;
