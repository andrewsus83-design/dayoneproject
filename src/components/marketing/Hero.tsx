import Link from 'next/link';
import { ArrowRight, CheckCircle2, MapPin } from 'lucide-react';
import { CONTACT_HREF, CONTAINER, GuestNav, PhoneFrame, WALL_TILES } from './parts';

const TILE_HEIGHTS = ['h-12', 'h-8', 'h-10', 'h-9', 'h-12', 'h-8', 'h-10', 'h-7', 'h-11', 'h-9', 'h-7', 'h-10', 'h-8', 'h-12'];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[520px] rounded-full bg-[#A97250]/[0.12] blur-[120px]" />
      </div>

      <div className={`${CONTAINER} relative pt-10 pb-16 sm:pt-16 sm:pb-24 lg:pt-20 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-10 items-center`}>
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-premium-gold/25 bg-premium-gold/10 text-premium-gold text-[11px] font-bold uppercase tracking-[0.16em]">
            For event &amp; wedding organizers
          </span>

          <h1 className="mt-6 font-display font-semibold text-white text-[42px] leading-[1.02] sm:text-6xl lg:text-[68px]">
            Run the whole event from <span className="text-premium-gold whitespace-nowrap">one app.</span>
          </h1>

          <p className="mt-5 text-[16px] sm:text-lg text-zinc-400 leading-relaxed max-w-xl">
            Day One Project is the all-in-one platform for EOs and WOs. Build the event page, invite and check in
            guests, run every screen in the room, and give each guest their own event app on their phone — no app
            store needed.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold shadow-gold scale-on-click"
            >
              Sign in as organizer
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/events/nexus-innovation"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark hover:border-white/20 text-white font-display font-semibold scale-on-click"
            >
              See a sample event
            </Link>
          </div>

          <p className="mt-4 text-[13px] text-zinc-500">
            New to Day One?{' '}
            <a href={CONTACT_HREF} className="text-premium-gold hover:text-premium-goldHover font-semibold">
              Talk to us
            </a>{' '}
            and we&apos;ll set up your organizer account.
          </p>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

/** The big screen behind, a guest's phone in front: the organizer's room and the guest's pocket. */
function HeroVisual() {
  return (
    <div className="relative pb-24 sm:pb-28 lg:pb-16 lg:pl-6" aria-hidden>
      <div className="rounded-[1.75rem] bg-premium-charcoal border border-premium-borderDark p-2.5 shadow-2xl">
        <div className="relative aspect-[16/10] rounded-[1.25rem] bg-premium-black overflow-hidden p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-premium-danger/15 text-premium-danger text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-premium-danger animate-pulse" />
              On air · Main LED
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Photo wall</span>
          </div>
          <div className="columns-4 sm:columns-5 gap-1.5 [&>div]:mb-1.5">
            {TILE_HEIGHTS.map((h, i) => (
              <div key={i} className={`rounded-lg break-inside-avoid ${h} ${WALL_TILES[i % WALL_TILES.length]}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Guest phone */}
      <div className="absolute right-2 sm:right-6 lg:-right-4 -bottom-2 lg:-bottom-4 w-[132px] sm:w-[160px] lg:w-[176px]">
        <PhoneFrame>
          <div className="absolute inset-0 bg-premium-black">
            <div className="h-[38%] bg-gradient-to-br from-premium-danger/35 via-[#A97250]/40 to-premium-black flex items-end p-2.5">
              <div>
                <div className="text-[7px] font-mono uppercase tracking-widest text-white/70">The wedding of</div>
                <div className="font-display font-semibold text-white text-[13px] leading-tight">Sophia &amp; Marco</div>
              </div>
            </div>
            <div className="p-2.5 space-y-1.5">
              <div className="flex items-center gap-1 text-[7px] text-zinc-400">
                <MapPin className="w-2.5 h-2.5 text-premium-gold" /> Venue, map &amp; rundown
              </div>
              <div className="rounded-lg bg-premium-success/10 border border-premium-success/30 px-2 py-1.5 text-[7px] font-bold text-premium-success">
                You&apos;re checked in
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 w-4/5" />
              <div className="h-1.5 rounded-full bg-zinc-800 w-3/5" />
            </div>
            <GuestNav active="event" checkedIn />
          </div>
        </PhoneFrame>
      </div>

      {/* Register desk chip */}
      <div className="absolute left-0 sm:left-2 bottom-6 sm:bottom-10 flex items-center gap-2.5 pl-2.5 pr-3.5 py-2.5 rounded-2xl bg-premium-charcoal border border-premium-borderDark shadow-2xl">
        <CheckCircle2 className="w-5 h-5 text-premium-success shrink-0" />
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Register desk</div>
          <div className="text-[12px] font-bold text-white">Guest checked in</div>
        </div>
      </div>
    </div>
  );
}
