import Link from 'next/link';
import { ArrowRight, Building2, Heart, Mail, Smartphone } from 'lucide-react';
import { BrandMark, CONTACT_HREF, CONTAINER } from './parts';

const SAMPLES = [
  { icon: Building2, label: 'Corporate sample', href: '/events/nexus-innovation' },
  { icon: Heart, label: 'Wedding sample', href: '/events/sophia-marco' },
  { icon: Smartphone, label: 'Sample guest app', href: '/events/nexus-innovation/pass' },
];

export function ClosingCta() {
  return (
    <section className="py-16 sm:py-24 border-t border-white/[0.05]">
      <div className={CONTAINER}>
        <div className="relative overflow-hidden rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark px-6 py-12 sm:px-12 sm:py-16 text-center">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[320px] rounded-full bg-[#A97250]/[0.15] blur-[100px] pointer-events-none" aria-hidden />
          <div className="relative">
            <div className="flex justify-center">
              <BrandMark size={52} />
            </div>
            <h2 className="mt-6 font-display font-semibold text-white text-[30px] leading-[1.1] sm:text-5xl max-w-2xl mx-auto text-balance">
              Make your next event a Day One event.
            </h2>
            <p className="mt-5 text-zinc-400 leading-relaxed max-w-xl mx-auto">
              Already an organizer? Sign in with the code we email you. New to Day One Project? Tell us about your
              events and we’ll set up your account.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold shadow-gold scale-on-click"
              >
                Sign in as organizer
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={CONTACT_HREF}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark hover:border-white/20 text-white font-display font-semibold scale-on-click"
              >
                <Mail className="w-4 h-4" />
                Talk to us
              </a>
            </div>

            <div className="mt-10 pt-8 border-t border-white/[0.06]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Look around first</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SAMPLES.map(({ icon: Icon, label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark hover:border-premium-gold/50 text-[13px] font-semibold text-zinc-300 hover:text-white scale-on-click"
                  >
                    <Icon className="w-4 h-4 text-premium-gold" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
