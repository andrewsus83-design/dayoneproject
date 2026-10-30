import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BrandMark } from './parts';

const LINKS = [
  ['For organizers', '#organizers'],
  ['How it works', '#how-it-works'],
  ['Day-of', '#day-of'],
  ['Guest app', '#guest-app'],
  ['Team', '#team'],
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-premium-black/80 border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 scale-on-click" aria-label="Day One Project home">
          <BrandMark size={30} priority />
          <span className="font-display font-semibold text-white text-[17px] tracking-tight leading-none">
            Day One <span className="text-premium-gold">Project</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-7 text-[13px] font-medium text-zinc-400">
          {LINKS.map(([label, href]) => (
            <a key={href} href={href} className="hover:text-white transition-colors">
              {label}
            </a>
          ))}
        </nav>

        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[13px] font-display font-bold text-black px-4 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover shadow-gold scale-on-click"
        >
          Sign in
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </header>
  );
}
