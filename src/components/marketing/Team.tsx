import { MonitorPlay, ScanLine, ShieldCheck } from 'lucide-react';
import { CONTAINER, Eyebrow, SectionTitle } from './parts';

const ROLES = [
  {
    icon: ShieldCheck,
    title: 'Admin organizer',
    text: 'Everything: events, pages, guests, broadcasts, screens and draws. Adds the rest of the crew from the event’s Setting menu.',
  },
  {
    icon: MonitorPlay,
    title: 'Screen manager',
    text: 'Only the Live Screens switcher — for the show-caller or the AV vendor running the LED.',
  },
  {
    icon: ScanLine,
    title: 'Register desk',
    text: 'Only check-in: scan passes, find guests by name, add walk-ins. Signs in with an access code you give them.',
  },
];

export function Team() {
  return (
    <section id="team" className="scroll-mt-20 py-16 sm:py-24 border-t border-white/[0.05]">
      <div className={CONTAINER}>
        <div className="max-w-2xl">
          <Eyebrow>Your crew</Eyebrow>
          <SectionTitle className="mt-4">Everyone gets just the access they need.</SectionTitle>
        </div>
        <div className="mt-10 grid sm:grid-cols-3 gap-4 sm:gap-5">
          {ROLES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark">
              <div className="w-11 h-11 rounded-2xl bg-premium-gold/10 border border-premium-gold/25 text-premium-gold flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="mt-5 font-display font-semibold text-white text-lg">{title}</h3>
              <p className="mt-2 text-[14px] text-zinc-400 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
