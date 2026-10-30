'use client';

import Link from 'next/link';

const LINKS = {
  'Event Modules': [
    ['Landing Page Builder', '#features'],
    ['Digital RSVP & Passports', '#features'],
    ['QR Gate Attendance', '#features'],
    ['Live Photo Wall', '#features'],
    ['Door Prize Raffle', '#features'],
    ['Interactive Trivia', '#features'],
    ['Ballroom Stage LED', '#features'],
  ],
  'Platform': [
    ['Create an Event', '/dashboard/events/new'],
    ['Event Types', '#features'],
    ['Custom Domain (BYOD)', '#features'],
    ['Multi-Tenant Dashboard', '/dashboard'],
  ],
  'Legal': [
    ['Terms of Service', '/terms'],
    ['Privacy Policy', '/privacy'],
    ['WhatsApp Disclosure', '/terms'],
    ['UU PDP Compliance', '/privacy'],
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-premium-black pt-20 pb-12 font-sans">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16">

        {/* Top: brand + links */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-12 md:gap-16 pb-16 border-b border-white/[0.05]">

          {/* Brand column */}
          <div className="space-y-5">
            <Link href="/" className="inline-flex items-center gap-3.5 group">
              <div className="w-10 h-10 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-xl shadow-gold transition-transform group-hover:scale-105">
                D1
              </div>
              <div>
                <div className="text-xl font-display font-bold text-white tracking-tight">
                  dayoneproject<span className="text-premium-gold">.xyz</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono tracking-[0.18em] uppercase mt-0.5">
                  Event Experience Platform
                </div>
              </div>
            </Link>

            <p className="text-[13px] text-zinc-500 leading-relaxed font-light max-w-xs">
              Southeast Asia&apos;s premier all-in-one event platform for corporate
              summits, galas, and luxury weddings.
            </p>

            <div className="text-[12px] text-zinc-600 font-mono">
              <a href="mailto:info@dayoneproject.xyz" className="hover:text-premium-gold transition-colors">
                info@dayoneproject.xyz
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([heading, items]) => (
            <div key={heading} className="space-y-4">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                {heading}
              </h4>
              <ul className="space-y-3">
                {items.map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-[13px] text-zinc-500 hover:text-zinc-200 transition-colors font-light"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-[12px] text-zinc-600 font-light">
            © 2026 dayoneproject.xyz — All rights reserved. Built for Southeast Asia.
          </p>
          <p className="text-[12px] text-zinc-600 font-mono">
            Next.js · Supabase · Cloudflare R2 · Vercel
          </p>
        </div>

      </div>
    </footer>
  );
}
