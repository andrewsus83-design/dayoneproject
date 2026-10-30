import Link from 'next/link';
import { ArrowUpRight, Calendar, Camera, Gamepad2, Gift, Images, QrCode, Settings, Sparkles, SwatchBook } from 'lucide-react';
import { CONTAINER, Eyebrow, GuestNav, PhoneFrame, QrGlyph, SectionTitle } from './parts';

const TABS = [
  { icon: Calendar, label: 'Event', text: 'Details, venue and everything on the event page.' },
  { icon: Gamepad2, label: 'Activity', text: 'Trivia and the photo wall, open after check-in.' },
  { icon: QrCode, label: 'QR', text: 'Their pass for the register desk.' },
  { icon: Gift, label: 'Prize', text: 'Door prize draws, open after check-in.' },
  { icon: Settings, label: 'Setting', text: 'Their details, and their pass once checked in.' },
];

const LOOKS = [
  { icon: SwatchBook, label: 'Filters', items: 'Vivid · Warm · Cool · Mono · Vintage · Drama' },
  { icon: Images, label: 'Frames', items: 'Event · Polaroid · Neon · Prism · your own' },
  { icon: Sparkles, label: 'Effects', items: 'Sparkle · Light leak · Film grain · Vignette · Prism glow' },
];

export function GuestApp() {
  return (
    <section id="guest-app" className="scroll-mt-20 py-16 sm:py-24 border-t border-white/[0.05]">
      <div className={`${CONTAINER} grid lg:grid-cols-2 gap-12 lg:gap-16 items-start`}>
        <div>
          <Eyebrow>For guests</Eyebrow>
          <SectionTitle className="mt-4">The event, in every guest’s pocket.</SectionTitle>
          <p className="mt-5 text-zinc-400 leading-relaxed">
            After they register, guests add the event to their home screen and it opens like an app — no app store,
            one app per event.
          </p>

          <ul className="mt-7 grid gap-2">
            {TABS.map(({ icon: Icon, label, text }) => (
              <li key={label} className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark">
                <Icon className="w-4 h-4 text-premium-gold shrink-0" />
                <span className="font-display font-semibold text-white text-[15px] w-16 shrink-0">{label}</span>
                <span className="text-[13px] text-zinc-400 leading-snug">{text}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/events/nexus-innovation/pass"
            className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-bold text-premium-gold hover:text-premium-goldHover scale-on-click"
          >
            Open the sample guest app
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="lg:pt-4">
          <div className="flex justify-center gap-4 sm:gap-8">
            <figure className="w-[44%] max-w-[210px]">
              <PassPhone />
              <figcaption className="mt-3 text-center text-[11px] font-mono uppercase tracking-wider text-zinc-500">Before check-in</figcaption>
            </figure>
            <figure className="w-[44%] max-w-[210px]">
              <ShotPhone />
              <figcaption className="mt-3 text-center text-[11px] font-mono uppercase tracking-wider text-premium-gold">After check-in</figcaption>
            </figure>
          </div>

          <div className="mt-8 p-6 rounded-[2rem] bg-premium-charcoal border border-premium-gold/40 shadow-gold">
            <div className="flex items-center gap-2.5">
              <Camera className="w-5 h-5 text-premium-gold" />
              <h3 className="font-display font-semibold text-white text-lg">QR turns into Shot</h3>
            </div>
            <p className="mt-3 text-[14px] text-zinc-400 leading-relaxed">
              Once a guest is checked in, the centre button becomes a TikTok / Instagram Stories–style camera. Tap for a
              photo, hold for a video up to 60&nbsp;seconds, with the filters, frames and effects you pick for the event —
              including frames you upload. Photos (up to 2&nbsp;MB) and videos (up to 20&nbsp;MB) post to the photo wall
              and share to social media.
            </p>
            <div className="mt-5 space-y-2.5">
              {LOOKS.map(({ icon: Icon, label, items }) => (
                <div key={label} className="flex gap-3 text-[12px]">
                  <span className="flex items-center gap-1.5 w-[68px] shrink-0 font-bold text-zinc-300">
                    <Icon className="w-3.5 h-3.5 text-premium-gold" /> {label}
                  </span>
                  <span className="text-zinc-500 leading-snug">{items}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PassPhone() {
  return (
    <PhoneFrame>
      <div className="absolute inset-0 bg-premium-black px-3 pt-7">
        <div className="text-[7px] font-mono uppercase tracking-widest text-zinc-500">Guest pass</div>
        <div className="font-display font-semibold text-white text-[12px] leading-tight mt-0.5">Nexus Innovation Forum</div>
        <div className="mt-3 rounded-xl bg-premium-charcoal border border-premium-borderDark p-2.5">
          <div className="rounded-lg bg-white p-1.5">
            <QrGlyph className="w-full h-auto" />
          </div>
          <div className="mt-2 text-center text-[7px] text-zinc-400">Show this at the register desk</div>
        </div>
      </div>
      <GuestNav active="center" checkedIn={false} />
    </PhoneFrame>
  );
}

function ShotPhone() {
  return (
    <PhoneFrame>
      <div className="absolute inset-0 bg-gradient-to-b from-[#3a2a20] via-[#6b4a35] to-[#1c1410]">
        <div className="absolute top-6 inset-x-0 flex justify-center gap-1">
          <span className="px-2 py-0.5 rounded-full bg-white text-black text-[7px] font-bold">Photo</span>
          <span className="px-2 py-0.5 rounded-full bg-black/40 text-white/80 text-[7px] font-bold">Video</span>
        </div>
        {/* Event frame */}
        <div className="absolute inset-x-3 top-12 bottom-[41%] rounded-xl border-2 border-premium-gold/80 flex items-end justify-center pb-1.5">
          <span className="text-[6px] font-mono uppercase tracking-widest text-premium-gold bg-black/50 px-1.5 py-0.5 rounded">
            Nexus Innovation Forum
          </span>
        </div>
        <div className="absolute right-1.5 top-16 flex flex-col gap-1.5">
          {[Images, Sparkles, SwatchBook].map((Icon, i) => (
            <span key={i} className="w-5 h-5 rounded-full bg-black/40 flex items-center justify-center">
              <Icon className="w-2.5 h-2.5 text-white" />
            </span>
          ))}
        </div>
        <div className="absolute bottom-[29%] inset-x-0 flex justify-center gap-1">
          {['Vivid', 'Warm', 'Mono'].map((f) => (
            <span key={f} className={`px-1.5 py-0.5 rounded-full text-[6px] font-bold ${f === 'Warm' ? 'bg-premium-gold text-black' : 'bg-black/40 text-white/80'}`}>
              {f}
            </span>
          ))}
        </div>
        <div className="absolute bottom-[17.5%] left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-[3px] border-white flex items-center justify-center">
          <span className="w-5 h-5 rounded-full bg-white" />
        </div>
      </div>
      <GuestNav active="center" checkedIn />
    </PhoneFrame>
  );
}
