'use client';

import Link from 'next/link';
import { ArrowRight, Layers, Monitor, Smartphone, Shield } from 'lucide-react';

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
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-gray-300">
          <a href="#features" className="hover:text-[#00f0ff] transition-colors">
            Modules
          </a>
          <a href="#pricing" className="hover:text-[#dfb76c] transition-colors">
            Pricing & Calculator
          </a>
          <a href="#partners" className="hover:text-[#ff007f] transition-colors flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ff007f] animate-pulse" />
            18% Cashback
          </a>
          <span className="text-gray-700">|</span>
          <Link
            href="/events/techunite/stage"
            target="_blank"
            className="hover:text-[#dfb76c] transition-colors flex items-center gap-1 text-[#dfb76c]"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Big Screen LED</span>
          </Link>
          <Link
            href="/dashboard/events/evt-techunite-2026/operator"
            className="hover:text-[#00f0ff] transition-colors flex items-center gap-1 text-[#00f0ff]"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Operator Desk</span>
          </Link>
          <Link
            href="/events/techunite/pass"
            target="_blank"
            className="hover:text-[#00ff88] transition-colors flex items-center gap-1 text-[#00ff88]"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Pass</span>
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-purple-300 hover:text-white px-3 py-2 rounded-lg hover:bg-[#1f1533] transition-colors border border-purple-500/20"
          >
            <Shield className="w-3.5 h-3.5 text-[#dfb76c]" />
            <span>Admin</span>
          </Link>
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex items-center justify-center text-xs font-semibold text-gray-200 hover:text-white px-3.5 py-2 rounded-lg hover:bg-[#181e2e] transition-colors border border-transparent hover:border-[#28324a]"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/events/new"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0b0d13] px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#00f0ff] via-[#dfb76c] to-[#ff007f] hover:opacity-95 transition-all shadow-[0_0_20px_rgba(223,183,108,0.25)] hover:shadow-[0_0_25px_rgba(0,240,255,0.4)] active:scale-95"
          >
            <span>Create Event</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
