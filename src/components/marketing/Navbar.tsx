'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-premium-black/80 border-b border-white/[0.06] font-sans">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16 h-20 flex items-center justify-between">

        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3.5 group flex-shrink-0">
          <div className="w-10 h-10 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-xl shadow-gold scale-on-click transition-transform group-hover:scale-105">
            41
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[22px] font-display font-bold tracking-tight text-white">
              all41
            </span>
            <span className="text-[10px] text-zinc-500 font-mono tracking-[0.18em] uppercase mt-0.5">
              Event Platform
            </span>
          </div>
        </Link>

        {/* Nav Links */}
        <nav className="hidden lg:flex items-center gap-8 text-[13px] font-medium text-zinc-400">
          <a href="#features" className="hover:text-white transition-colors">Modules</a>
          <a href="#features" className="hover:text-white transition-colors">Corporate</a>
          <a href="#features" className="hover:text-white transition-colors">Weddings</a>
          <a href="#features" className="hover:text-white transition-colors">How it works</a>
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex items-center text-[13px] font-medium text-zinc-400 hover:text-white px-4 py-2.5 rounded-xl transition-colors scale-on-click"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard/events/new"
            className="inline-flex items-center gap-2 text-[13px] font-bold text-black px-5 py-2.5 rounded-2xl bg-premium-gold hover:bg-premium-goldHover transition-all shadow-gold scale-on-click"
          >
            <span>Create Event</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
    </header>
  );
}
