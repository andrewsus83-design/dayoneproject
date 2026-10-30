import { Film, Gift, Images, Presentation, Trophy, UtensilsCrossed, Handshake, ListOrdered, Sparkles, Camera, HelpCircle } from 'lucide-react';
import { CONTAINER, Eyebrow, SectionTitle, WALL_TILES } from './parts';

const STAGE_SOURCES = [
  { icon: Sparkles, label: 'Welcome' },
  { icon: Camera, label: 'Photo wall', onAir: true },
  { icon: HelpCircle, label: 'Trivia' },
  { icon: Gift, label: 'Door prize', preview: true },
  { icon: ListOrdered, label: 'Rundown' },
  { icon: UtensilsCrossed, label: 'Menu' },
  { icon: Handshake, label: 'Sponsors' },
];
const CUSTOM_SOURCES = [
  { icon: Presentation, label: 'Slides' },
  { icon: Images, label: 'Images' },
  { icon: Film, label: 'Video' },
];

const MODULES = [
  {
    icon: Trophy,
    tone: 'text-premium-neon bg-premium-neon/10 border-premium-neon/25',
    title: 'Live trivia',
    text: 'The question goes up on the big screen; guests join with a code and answer on their phones. Lobby, 3-2-1 countdown and leaderboard included.',
    detail: 'Join code · Lobby · Leaderboard',
  },
  {
    icon: Gift,
    tone: 'text-premium-gold bg-premium-gold/10 border-premium-gold/25',
    title: 'Door prize draws',
    text: 'Draw winners on a slot machine, spin wheel, name picker or 3D claw machine. Draws run on the server, and only guests who checked in can win.',
    detail: 'Slot · Wheel · Picker · 3D claw',
  },
  {
    icon: Images,
    tone: 'text-premium-danger bg-premium-danger/10 border-premium-danger/25',
    title: 'Photo wall',
    text: 'Guests’ photos and videos fill a Pinterest-style wall, on their phones and on the big screen. Turn moderation on to approve each post first.',
    detail: 'Masonry · Moderation · Captions',
  },
];

export function DayOf() {
  return (
    <section id="day-of" className="scroll-mt-20 py-16 sm:py-24 border-t border-white/[0.05]">
      <div className={CONTAINER}>
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-14 items-center">
          <div>
            <Eyebrow tone="text-premium-neon">Day-of</Eyebrow>
            <SectionTitle className="mt-4">Run every screen in the room.</SectionTitle>
            <p className="mt-5 text-zinc-400 leading-relaxed">
              Name each screen — main LED, side screens, foyer TVs — and open its own link full screen on the computer
              that drives it. Pick a source, check it in Preview at that screen’s shape, then Take it live with a
              smooth crossfade.
            </p>
            <ul className="mt-6 space-y-3 text-[14px] text-zinc-300">
              <li className="flex gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-premium-neon shrink-0" />
                Seven stage modules: welcome, photo wall, trivia, door prize, rundown, menu and sponsors.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-premium-neon shrink-0" />
                Custom screens: a PDF deck as slides, an image slideshow or a video, each with its own frame and footer.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-premium-neon shrink-0" />
                Hand the switcher to your show-caller or AV vendor with a screen-manager sign-in.
              </li>
            </ul>
          </div>

          <Switcher />
        </div>

        <div className="mt-12 sm:mt-16 grid sm:grid-cols-3 gap-4 sm:gap-5">
          {MODULES.map(({ icon: Icon, tone, title, text, detail }) => (
            <div key={title} className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark flex flex-col">
              <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${tone}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="mt-5 font-display font-semibold text-white text-lg">{title}</h3>
              <p className="mt-2 text-[14px] text-zinc-400 leading-relaxed flex-1">{text}</p>
              <p className="mt-4 text-[11px] font-mono uppercase tracking-wider text-zinc-500">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** A still of the Live Screens switcher: Preview, On air, Take and the sources. */
function Switcher() {
  return (
    <div className="rounded-[2rem] bg-premium-charcoal border border-premium-borderDark p-3 sm:p-4 shadow-2xl" aria-hidden>
      <div className="flex items-center justify-between gap-3 px-1">
        <span className="font-display font-semibold text-white text-[15px]">Live Screens</span>
        <div className="flex gap-1.5 overflow-hidden">
          {['Main LED', 'Side screen', 'Foyer TV'].map((s, i) => (
            <span
              key={s}
              className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                i === 0 ? 'bg-premium-gold/15 border-premium-gold/40 text-premium-gold' : 'border-premium-borderDark text-zinc-500'
              } ${i === 2 ? 'hidden sm:inline' : ''}`}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div>
          <div className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-premium-neon">Preview</div>
          <div className="aspect-video rounded-xl bg-premium-black border-2 border-premium-neon/50 flex flex-col items-center justify-center gap-1.5">
            <div className="flex gap-1">
              {['?', '?', '?'].map((q, i) => (
                <span
                  key={i}
                  className="w-5 h-7 sm:w-7 sm:h-9 rounded-md bg-premium-gold/15 border border-premium-gold/40 text-premium-gold font-display font-bold text-[11px] sm:text-sm flex items-center justify-center"
                >
                  {q}
                </span>
              ))}
            </div>
            <span className="text-[8px] font-mono uppercase tracking-wider text-zinc-500">Door prize</span>
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-premium-danger">
            <span className="w-1.5 h-1.5 rounded-full bg-premium-danger animate-pulse" /> On air
          </div>
          <div className="aspect-video rounded-xl bg-premium-black border-2 border-premium-danger/60 p-1.5 overflow-hidden">
            <div className="columns-4 gap-1 [&>div]:mb-1">
              {['h-6', 'h-4', 'h-5', 'h-4', 'h-6', 'h-4', 'h-5', 'h-3'].map((h, i) => (
                <div key={i} className={`rounded-[3px] break-inside-avoid ${h} ${WALL_TILES[i]}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 py-2.5 rounded-xl bg-premium-gold text-black text-center font-display font-bold text-sm shadow-gold">
        Take
      </div>

      <div className="mt-4 px-1 text-[9px] font-bold uppercase tracking-widest text-zinc-500">Stage modules</div>
      <div className="mt-2 grid grid-cols-4 sm:grid-cols-7 gap-1.5">
        {STAGE_SOURCES.map(({ icon: Icon, label, onAir, preview }) => (
          <div
            key={label}
            className={`rounded-xl border px-1 py-2 flex flex-col items-center gap-1 ${
              onAir
                ? 'border-premium-danger/50 bg-premium-danger/10 text-premium-danger'
                : preview
                  ? 'border-premium-neon/50 bg-premium-neon/10 text-premium-neon'
                  : 'border-premium-borderDark bg-premium-surfaceDark text-zinc-400'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="text-[8px] font-bold leading-none text-center">{label}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 px-1 text-[9px] font-bold uppercase tracking-widest text-zinc-500">Custom screens</div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {CUSTOM_SOURCES.map(({ icon: Icon, label }) => (
          <div key={label} className="rounded-xl border border-premium-borderDark bg-premium-surfaceDark text-zinc-400 py-2 flex items-center justify-center gap-1.5">
            <Icon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
