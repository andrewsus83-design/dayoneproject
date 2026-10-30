import Image from 'next/image';
import Link from 'next/link';
import { CONTACT_EMAIL, CONTAINER } from './parts';

const LINKS = [
  ['Organizer sign in', '/login'],
  ['Sample event', '/events/nexus-innovation'],
  ['Terms', '/terms'],
  ['Privacy', '/privacy'],
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-12">
      <div className={`${CONTAINER} flex flex-col sm:flex-row sm:items-center justify-between gap-8`}>
        <div className="flex items-center gap-4">
          <Image src="/brand/dayone-logo.png" alt="Day One Project" width={64} height={64} />
          <div>
            <p className="text-[13px] text-zinc-400 max-w-[240px] leading-snug">
              The all-in-one event app for event and wedding organizers.
            </p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="mt-1.5 inline-block text-[12px] font-mono text-zinc-500 hover:text-premium-gold">
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-3 text-[13px] text-zinc-400">
          {LINKS.map(([label, href]) => (
            <Link key={href} href={href} className="hover:text-white transition-colors">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className={`${CONTAINER} mt-10 text-[12px] text-zinc-600`}>© 2026 Day One Project · dayoneproject.xyz</div>
    </footer>
  );
}
