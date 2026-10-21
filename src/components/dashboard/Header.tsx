'use client';

import Link from 'next/link';
import { Bell, Search, Plus, ExternalLink } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actionText?: string;
  actionHref?: string;
}

export function Header({
  title = 'Dashboard Overview',
  subtitle = 'Manage your events, guest lists, and realtime interactive experiences',
  actionText,
  actionHref,
}: HeaderProps) {
  return (
    <header className="h-16 border-b border-[#1e263d] bg-[#0b0e18]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      <div>
        <h1 className="text-base font-bold text-white tracking-tight">{title}</h1>
        <p className="text-xs text-gray-400 hidden sm:block">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Search */}
        <div className="relative hidden md:block">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search guests, events..."
            className="w-56 pl-9 pr-3 py-1.5 rounded-lg bg-[#141928] border border-[#232c44] text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#00f0ff]"
          />
        </div>

        {/* Notifications Icon */}
        <button
          type="button"
          className="p-2 rounded-lg bg-[#141928] border border-[#232c44] text-gray-300 hover:text-white transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-[#ff007f] absolute top-1 right-1" />
        </button>

        {/* Primary Action Button */}
        {actionText && actionHref && (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0b0d13] px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#00f0ff] to-[#dfb76c] hover:brightness-110 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{actionText}</span>
          </Link>
        )}
      </div>
    </header>
  );
}
