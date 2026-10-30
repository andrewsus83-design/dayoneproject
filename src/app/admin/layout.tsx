import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isPlatformAdmin } from '@/lib/auth';

export const metadata = {
  title: 'Admin | dayoneproject.xyz',
  description: 'Manage users, events and API keys for dayoneproject.xyz',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Second lock behind the proxy: only platform admins (signed in with the authenticator) render anything here.
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin');
  const { data: me } = await supabase.rpc('a41_whoami');
  if (!me?.isAdmin) redirect(isPlatformAdmin(user) ? '/login?as=owner&error=authenticator&next=/admin' : '/dashboard');

  return (
    <div className="flex min-h-screen bg-premium-black text-zinc-100 font-sans">
      <Suspense fallback={<aside className="w-64 bg-premium-black border-r border-premium-borderDark hidden md:block" />}>
        <AdminSidebar />
      </Suspense>
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">{children}</div>
    </div>
  );
}
