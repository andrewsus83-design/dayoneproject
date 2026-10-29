import { Suspense } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';

export const metadata = {
  title: 'Dashboard | all41',
  description: 'Manage events, attendees, photo walls, and raffle draws',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-premium-black text-zinc-100 font-sans">
      <Suspense fallback={<aside className="w-72 bg-premium-black border-r border-premium-borderDark hidden md:block" />}>
        <Sidebar />
      </Suspense>
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
