'use client';

import Link from 'next/link';
import { Bell, Search, Plus } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actionText?: string;
  actionHref?: string;
}

export function Header({
  title = 'Dashboard',
  subtitle,
  actionText,
  actionHref,
}: HeaderProps) {
  return (
    <header className="h-20 border-b border-premium-borderDark bg-premium-black/90 backdrop-blur-xl px-8 md:px-10 flex items-center justify-between sticky top-0 z-40 flex-shrink-0">
      <div>
        <h1 className="text-[22px] font-display font-medium text-white tracking-tight leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] text-zinc-500 mt-1 hidden sm:block font-light">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search guests, events..."
            className="w-56 pl-9 pr-4 py-2 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-[13px] text-white placeholder-zinc-600 focus:outline-none focus:border-premium-gold/50 transition-colors"
          />
        </div>

        {/* Notifications */}
        <button
          type="button"
          className="w-9 h-9 rounded-xl bg-premium-charcoal border border-premium-borderDark text-zinc-400 hover:text-white flex items-center justify-center transition-colors relative scale-on-click"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="w-1.5 h-1.5 rounded-full bg-premium-danger absolute top-2 right-2" />
        </button>

        {/* Primary CTA */}
        {actionText && actionHref && (
          <Link
            href={actionHref}
            className="bg-premium-gold hover:bg-premium-goldHover text-black px-5 py-2.5 rounded-2xl font-bold transition-all shadow-gold scale-on-click text-[13px] flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{actionText}</span>
          </Link>
        )}
      </div>
    </header>
  );
}
