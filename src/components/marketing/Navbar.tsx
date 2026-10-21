'useclient';

import Link from 'next/link';
import { Sparkles, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#0b0d13]/80 border-b border-[#1e2638]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f0ff] via-[#dfb76c] to-[#ff007f] p-[2px] transition-transform group-hover:scale-105 duration-300">
            <div className="w-full h-full bg-[#0b0d13] rounded-[10px] flex items-center justify-center font-black text-lg tracking-wider text-white">
              <span className="text-[#00f0ff]">4</span>
              <span className="text-[#dfb76c]">1</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1">
              all<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] via-[#dfb76c] to-[#ff007f]">41</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-[#1e2638] text-[#dfb76c] border border-[#dfb76c]/30 font-medium ml-1">APP</span>
            </span>
            <span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">Event Experience Platform</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
          <a href="#features" className="hover:text-[#00f0ff] transition-colors">
            Modules
          </a>
          <a href="#pricing" className="hover:text-[#dfb76c] transition-colors">
            Pricing & Calculator
          </a>
          <a href="#partners" className="hover:text-[#ff007f] transition-colors flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ff007f] animate-pulse" />
            EO / WO Cashback
          </a>
          <Link href="/events/techunite" className="text-gray-400 hover:text-white transition-colors">
            Live Preview
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex items-center justify-center text-sm font-semibold text-gray-200 hover:text-white px-4 py-2 rounded-lg hover:bg-[#181e2e] transition-colors border border-transparent hover:border-[#28324a]"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard/events/new"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#0b0d13] px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#00f0ff] via-[#dfb76c] to-[#ff007f] hover:opacity-95 transition-all shadow-[0_0_20px_rgba(223,183,108,0.25)] hover:shadow-[0_0_25px_rgba(0,240,255,0.4)] active:scale-95"
          >
            <span>Create Event</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
