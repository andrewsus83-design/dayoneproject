import Link from 'next/link';
import { ArrowUpRight, Building2, Check, Heart } from 'lucide-react';
import { CONTAINER, Eyebrow, SectionTitle } from './parts';

const AUDIENCES = [
  {
    icon: Building2,
    tone: 'text-premium-neon bg-premium-neon/10 border-premium-neon/25',
    who: 'EO · Event organizers',
    title: 'Summits, conferences, launches and gala dinners.',
    points: [
      'Corporate themes for the event page and invitation',
      'Register desk at the door that keeps working offline',
      'Live trivia and door prizes to keep the hall engaged',
      'Rundown, sponsors and your slides on every screen',
    ],
    sample: ['See the corporate sample', '/events/nexus-innovation'],
  },
  {
    icon: Heart,
    tone: 'text-premium-danger bg-premium-danger/10 border-premium-danger/25',
    who: 'WO · Wedding organizers',
    title: 'Luxury weddings, and every one of the couple’s guests.',
    points: [
      'Wedding themes for the couple’s page and RSVP form',
      'A QR pass for each guest, checked in at the reception',
      'Photo wall and Shot camera for the guests’ photos and videos',
      'Door prize draws, and a thank-you email after the night',
    ],
    sample: ['See the wedding sample', '/events/sophia-marco'],
  },
];

export function Audiences() {
  return (
    <section id="organizers" className="scroll-mt-20 py-16 sm:py-24 border-t border-white/[0.05]">
      <div className={CONTAINER}>
        <div className="max-w-2xl">
          <Eyebrow>Built for EOs and WOs</Eyebrow>
          <SectionTitle className="mt-4">Corporate or wedding, one place to run it.</SectionTitle>
          <p className="mt-5 text-zinc-400 leading-relaxed">
            Pick the event type and the themes, pages and modules follow. Your team learns one tool and uses it for
            every client — a product launch on Thursday, a ballroom wedding on Saturday.
          </p>
        </div>

        <div className="mt-10 grid md:grid-cols-2 gap-4 sm:gap-6">
          {AUDIENCES.map(({ icon: Icon, tone, who, title, points, sample }) => (
            <div key={who} className="p-6 sm:p-8 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark flex flex-col">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">{who}</span>
              </div>
              <h3 className="mt-5 font-display font-semibold text-white text-xl sm:text-2xl leading-snug">{title}</h3>
              <ul className="mt-5 space-y-3 flex-1">
                {points.map((p) => (
                  <li key={p} className="flex gap-3 text-[14px] text-zinc-300 leading-snug">
                    <Check className="w-4 h-4 mt-0.5 text-premium-gold shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
              <Link
                href={sample[1]}
                className="mt-7 inline-flex items-center gap-1.5 self-start text-[13px] font-bold text-premium-gold hover:text-premium-goldHover scale-on-click"
              >
                {sample[0]}
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
