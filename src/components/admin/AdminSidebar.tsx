'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, BarChart3, Calendar, KeyRound, Layers, MessageSquare, Shield, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserMenu } from '@/components/auth/UserMenu';
import { BrandMark } from '@/components/BrandMark';

const ADMIN_NAV = [
  { label: 'Overview', href: '/admin', icon: BarChart3, exact: true },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Events', href: '/admin/events', icon: Calendar },
  { label: 'API Keys', href: '/admin/keys', icon: KeyRound },
  { label: 'WhatsApp & Email', href: '/admin/whatsapp', icon: MessageSquare },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 bg-premium-black border-r border-premium-borderDark flex-col justify-between hidden md:flex min-h-screen">
      <div>
        <div className="h-16 flex items-center gap-3 px-5 border-b border-premium-borderDark">
          <BrandMark size={32} />
          <div className="leading-none">
            <div className="font-display font-bold text-[15px] text-white tracking-tight">dayoneproject<span className="text-premium-gold">.xyz</span></div>
            <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mt-1 flex items-center gap-1"><Shield className="w-2.5 h-2.5" /> Admin</div>
          </div>
        </div>

        <nav className="p-3 space-y-0.5">
          {ADMIN_NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all scale-on-click',
                  active ? 'bg-white/[0.06] text-white' : 'text-zinc-500 hover:text-white hover:bg-white/[0.03]',
                )}
              >
                <item.icon className={cn('w-4 h-4', active ? 'text-premium-gold' : 'text-zinc-600')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pt-3 mt-2 border-t border-premium-borderDark/60 space-y-0.5">
          <Link href="/dashboard" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-white hover:bg-white/[0.03] scale-on-click">
            <ArrowLeft className="w-4 h-4" /> Organizer dashboard
          </Link>
          <Link href="/" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-white hover:bg-white/[0.03] scale-on-click">
            <Layers className="w-4 h-4" /> Marketing website
          </Link>
        </div>
      </div>

      <UserMenu showAdminLink={false} />
    </aside>
  );
}
