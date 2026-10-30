import { BarChart3, MonitorPlay, Palette, ScanLine, Send, Wand2 } from 'lucide-react';
import { CONTAINER, Eyebrow, SectionTitle } from './parts';

const STEPS = [
  {
    icon: Wand2,
    title: 'Create in a few questions',
    text: 'Typeform-style setup: choose Corporate or Wedding, name the event, pick a theme. It gets its own page link.',
    tags: ['Corporate or wedding', 'Themes', 'Own event link'],
  },
  {
    icon: Palette,
    title: 'Make the page yours',
    text: 'Arrange sections in the Landing Page Builder, then set colors, fonts, spacing, logo and page width in Design Studio. Embed the page or the RSVP form on your own website.',
    tags: ['Landing Page Builder', 'Design Studio', 'Embed code'],
  },
  {
    icon: Send,
    title: 'Invite and collect RSVPs',
    text: 'Build the invitation form, import the guest list from a spreadsheet, and send email broadcasts: Invitation, RSVP Pass, Reminder, Thank You and Winner. WhatsApp sending comes later.',
    tags: ['RSVP form builder', 'CSV import & export', 'Email broadcasts', 'WhatsApp · soon'],
  },
  {
    icon: ScanLine,
    title: 'Check guests in',
    text: 'Every guest gets a pass with an unguessable QR code. The register desk scans it with any phone or tablet camera, finds guests by name and adds walk-ins. If the venue’s internet drops, the desk keeps checking guests in and syncs when it’s back.',
    tags: ['Secure QR passes', 'Camera scanner', 'Walk-ins', 'Works offline'],
  },
  {
    icon: MonitorPlay,
    title: 'Run the show',
    text: 'Switch what’s on every screen, start trivia and door prize draws, and fill the photo wall. Games, prizes and the wall open only to guests who checked in.',
    tags: ['Live Screens', 'Trivia', 'Door prizes', 'Photo wall'],
    link: ['See the day-of tools', '#day-of'],
  },
  {
    icon: BarChart3,
    title: 'Wrap up',
    text: 'See who registered and who came in Insights, send a Thank You with a short feedback form, and let guests save their photos — the wall keeps them for 30 days after the event.',
    tags: ['Insights', 'Feedback form', 'Photo downloads'],
  },
];

export function Journey() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-16 sm:py-24 border-t border-white/[0.05]">
      <div className={`${CONTAINER} grid lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-16`}>
        <div className="lg:sticky lg:top-28 self-start">
          <Eyebrow>How it works</Eyebrow>
          <SectionTitle className="mt-4">From the first invite to the last photo.</SectionTitle>
          <p className="mt-5 text-zinc-400 leading-relaxed max-w-md">
            One event, one link, one guest list. Everything you set up before the day is what the register desk, the
            screens and the guests’ phones use on the day.
          </p>
        </div>

        <ol className="relative">
          {STEPS.map(({ icon: Icon, title, text, tags, link }, i) => (
            <li key={title} className="relative pl-14 pb-10 last:pb-0">
              {i < STEPS.length - 1 && <span className="absolute left-[19px] top-11 bottom-1 w-px bg-premium-borderDark" aria-hidden />}
              <div className="absolute left-0 top-0 w-10 h-10 rounded-2xl bg-premium-charcoal border border-premium-borderDark flex items-center justify-center text-premium-gold">
                <Icon className="w-[18px] h-[18px]" />
              </div>
              <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest pt-0.5">Step {i + 1}</div>
              <h3 className="mt-1 font-display font-semibold text-white text-xl">{title}</h3>
              <p className="mt-2 text-[14px] sm:text-[15px] text-zinc-400 leading-relaxed">{text}</p>
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span key={t} className="text-[11px] px-2.5 py-1 rounded-full bg-premium-surfaceDark border border-premium-borderDark text-zinc-400">
                    {t}
                  </span>
                ))}
              </div>
              {link && (
                <a href={link[1]} className="mt-4 inline-block text-[13px] font-bold text-premium-gold hover:text-premium-goldHover scale-on-click">
                  {link[0]} ↓
                </a>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
